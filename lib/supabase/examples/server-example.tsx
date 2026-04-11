import { createClient } from "@/lib/supabase/server";

/**
 * Example: Using Supabase from a Server Component
 *
 * This shows how to query authenticated data from Supabase in a Server Component.
 * The Supabase client automatically includes the user's session token.
 */

export default async function ServerExample() {
  const supabase = await createClient();

  // Get the authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch user-specific data with RLS
  const { data: userProfiles, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user?.id)
    .single();

  if (error) {
    console.error("Error:", error);
  }

  return (
    <div>
      <p>Welcome, {user?.email}!</p>
      {userProfiles && (
        <div>
          <h2>Your Profile</h2>
          <pre>{JSON.stringify(userProfiles, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
