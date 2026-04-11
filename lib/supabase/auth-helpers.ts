// lib/supabase/auth-helpers.ts
// Helper functions for Clerk + Supabase integration

import { auth } from "@clerk/nextjs/server";
import { createClient } from "./server";

/**
 * Get the authenticated Supabase client with Clerk user context
 * Use this in Server Components and Server Actions
 */
export async function getSupabaseUser() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("User not authenticated");
  }

  const supabase = await createClient();

  return {
    userId,
    supabase,
  };
}

/**
 * Safely query user's own data
 * Automatically filters by clerk_user_id
 */
export async function getUserOwnData(table: string) {
  const { userId, supabase } = await getSupabaseUser();

  return supabase.from(table).select("*").eq("clerk_user_id", userId);
}

/**
 * Create a record with automatic clerk_user_id
 */
export async function createUserRecord(
  table: string,
  data: Record<string, any>,
) {
  const { userId, supabase } = await getSupabaseUser();

  return supabase
    .from(table)
    .insert({
      ...data,
      clerk_user_id: userId,
    })
    .select()
    .single();
}

/**
 * Update a record (with ownership verification)
 */
export async function updateUserRecord(
  table: string,
  id: string,
  data: Record<string, any>,
) {
  const { userId, supabase } = await getSupabaseUser();

  // Verify ownership first
  const { data: existing } = await supabase
    .from(table)
    .select("clerk_user_id")
    .eq("id", id)
    .single();

  if (existing?.clerk_user_id !== userId) {
    throw new Error("Unauthorized: You do not own this record");
  }

  return supabase.from(table).update(data).eq("id", id).select().single();
}

/**
 * Delete a record (with ownership verification)
 */
export async function deleteUserRecord(table: string, id: string) {
  const { userId, supabase } = await getSupabaseUser();

  // Verify ownership first
  const { data: existing } = await supabase
    .from(table)
    .select("clerk_user_id")
    .eq("id", id)
    .single();

  if (existing?.clerk_user_id !== userId) {
    throw new Error("Unauthorized: You do not own this record");
  }

  return supabase.from(table).delete().eq("id", id);
}

/**
 * Get a single record owned by user
 */
export async function getUserRecord(table: string, id: string) {
  const { userId, supabase } = await getSupabaseUser();

  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("id", id)
    .eq("clerk_user_id", userId)
    .single();

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  if (!data) {
    throw new Error("Record not found or access denied");
  }

  return data;
}
