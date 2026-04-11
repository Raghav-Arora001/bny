// app/api/webhooks/clerk/route.ts
// Webhook handler to sync Clerk users to Supabase

import { Webhook } from "svix";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

if (!webhookSecret) {
  throw new Error("CLERK_WEBHOOK_SECRET environment variable is not set");
}

export async function POST(req: Request) {
  const headersList = await headers();
  const svix_id = headersList.get("svix-id");
  const svix_timestamp = headersList.get("svix-timestamp");
  const svix_signature = headersList.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.error("Missing svix headers");
    return new NextResponse("Error: Missing svix headers", { status: 400 });
  }

  const body = await req.text();

  const wh = new Webhook(webhookSecret);

  let evt: any;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as any;
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new NextResponse("Error: Invalid signature", { status: 400 });
  }

  const eventType = evt.type;
  const { id, email_addresses, first_name, last_name, image_url } = evt.data;

  const supabase = await createClient();

  try {
    if (eventType === "user.created") {
      console.log(`[Webhook] Creating profile for user ${id}`);

      const { error } = await supabase.from("profiles").insert({
        clerk_user_id: id,
        email: email_addresses?.[0]?.email_address || "",
        full_name: `${first_name || ""} ${last_name || ""}`.trim() || null,
        avatar_url: image_url || null,
        created_at: new Date().toISOString(),
      });

      if (error) {
        console.error("Failed to create profile:", error);
        return new NextResponse(
          `Error: Failed to create profile - ${error.message}`,
          { status: 400 },
        );
      }

      console.log(`[Webhook] Profile created for user ${id}`);
    }

    if (eventType === "user.updated") {
      console.log(`[Webhook] Updating profile for user ${id}`);

      const { error } = await supabase
        .from("profiles")
        .update({
          email: email_addresses?.[0]?.email_address || "",
          full_name: `${first_name || ""} ${last_name || ""}`.trim() || null,
          avatar_url: image_url || null,
          updated_at: new Date().toISOString(),
        })
        .eq("clerk_user_id", id);

      if (error) {
        console.error("Failed to update profile:", error);
        // Don't fail on update errors, profile might not exist yet
      }

      console.log(`[Webhook] Profile updated for user ${id}`);
    }

    if (eventType === "user.deleted") {
      console.log(`[Webhook] Deleting profile for user ${id}`);

      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("clerk_user_id", id);

      if (error) {
        console.error("Failed to delete profile:", error);
        // On delete, cascade should handle related records
        return new NextResponse(
          `Error: Failed to delete profile - ${error.message}`,
          { status: 400 },
        );
      }

      console.log(`[Webhook] Profile deleted for user ${id}`);
    }

    return new NextResponse("Webhook processed successfully", { status: 200 });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return new NextResponse(
      `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      { status: 500 },
    );
  }
}

/**
 * SETUP INSTRUCTIONS:
 *
 * 1. In Clerk Dashboard:
 *    - Go to Settings → Webhooks
 *    - Click "Create Endpoint"
 *    - URL: https://your-domain.com/api/webhooks/clerk
 *    - Subscribe to these events:
 *      ✓ user.created
 *      ✓ user.updated
 *      ✓ user.deleted
 *    - Click "Create"
 *
 * 2. Copy the Signing Secret
 *    - Add to your .env.local:
 *      CLERK_WEBHOOK_SECRET=whsec_...
 *
 * 3. In Supabase, run this SQL to create the profiles table:
 *
 *    CREATE TABLE profiles (
 *      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *      clerk_user_id TEXT NOT NULL UNIQUE,
 *      email TEXT NOT NULL,
 *      full_name TEXT,
 *      avatar_url TEXT,
 *      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 *      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 *    );
 *
 * 4. Test the webhook:
 *    - Go to Clerk Dashboard → Webhooks → Your endpoint
 *    - Click "Testing" tab
 *    - Send a test event
 *    - Check your app logs to verify it worked
 */
