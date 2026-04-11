-- Clerk + Supabase Database Setup
-- Copy and paste these SQL queries into your Supabase SQL Editor
-- and run them to create the necessary tables and policies

-- ============================================
-- 1. CREATE PROFILES TABLE
-- ============================================
-- This table stores user profile data synced from Clerk via webhook

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on clerk_user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_clerk_user_id 
  ON profiles(clerk_user_id);

-- ============================================
-- 2. CREATE ITEMS TABLE (Example data table)
-- ============================================

CREATE TABLE IF NOT EXISTS items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Foreign key to profiles (optional, but recommended)
  CONSTRAINT items_clerk_user_id_fkey 
    FOREIGN KEY (clerk_user_id) 
    REFERENCES profiles(clerk_user_id) 
    ON DELETE CASCADE
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_items_clerk_user_id 
  ON items(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_items_created_at 
  ON items(created_at DESC);

-- ============================================
-- 3. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================
-- This ensures users can only access their own data

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. CREATE RLS POLICIES FOR PROFILES
-- ============================================

-- Allow users to view their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT
  USING (clerk_user_id = auth.jwt() ->> 'sub');

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE
  USING (clerk_user_id = auth.jwt() ->> 'sub');

-- Public service role can insert (from webhook)
CREATE POLICY "Service role can insert profiles" ON profiles
  FOR INSERT
  WITH CHECK (true);

-- Allow deletion (for user account deletion via webhook)
CREATE POLICY "Users can delete own profile" ON profiles
  FOR DELETE
  USING (clerk_user_id = auth.jwt() ->> 'sub');

-- ============================================
-- 5. CREATE RLS POLICIES FOR ITEMS
-- ============================================

-- Users can only view their own items
CREATE POLICY "Users can view own items" ON items
  FOR SELECT
  USING (clerk_user_id = auth.jwt() ->> 'sub');

-- Users can insert their own items
CREATE POLICY "Users can insert own items" ON items
  FOR INSERT
  WITH CHECK (clerk_user_id = auth.jwt() ->> 'sub');

-- Users can update their own items
CREATE POLICY "Users can update own items" ON items
  FOR UPDATE
  USING (clerk_user_id = auth.jwt() ->> 'sub');

-- Users can delete their own items
CREATE POLICY "Users can delete own items" ON items
  FOR DELETE
  USING (clerk_user_id = auth.jwt() ->> 'sub');

-- ============================================
-- IMPORTANT NOTES
-- ============================================

/*
1. CLERK_USER_ID vs auth.uid()
   - Clerk users: stored as TEXT (clerk_user_id)
   - Supabase auth users: UUID (auth.uid())
   - Since we're using Clerk for auth, filter by clerk_user_id
   
   Example query:
   SELECT * FROM items WHERE clerk_user_id = 'user_xyz'

2. JWT CLAIMS
   - Clerk JWT includes user ID in the 'sub' claim
   - auth.jwt() ->> 'sub' gets the Clerk user ID
   - Only works if you pass Clerk's JWT as bearer token
   
3. CUSTOM CLAIM APPROACH (Alternative)
   - You can add Clerk user ID as a custom claim in Clerk
   - This requires Supabase to accept Clerk's JWT
   - See documentation for custom JWT setup

4. FOR TESTING IN SUPABASE
   - RLS policies require valid JWT token in Authorization header
   - Use Supabase dashboard's "Query" tab to test without auth
   - Test actual API calls from your app with Clerk token

5. IF YOU GET "policy not found" ERROR
   - Drop and recreate the policies (see below)
   - Make sure RLS is enabled on the table
   - Check that policy names don't have typos

6. TO RESET RLS POLICIES
   - Run these commands to drop old policies:
   
   DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
   DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
   DROP POLICY IF EXISTS "Users can delete own profile" ON profiles;
   DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;
   
   DROP POLICY IF EXISTS "Users can view own items" ON items;
   DROP POLICY IF EXISTS "Users can insert own items" ON items;
   DROP POLICY IF EXISTS "Users can update own items" ON items;
   DROP POLICY IF EXISTS "Users can delete own items" ON items;
   
   - Then re-run the policy creation statements above
*/

-- ============================================
-- TESTING RLS POLICIES
-- ============================================

/*
To test RLS from Supabase dashboard:

1. Go to SQL Editor
2. Try this query (should work without auth):
   SELECT * FROM profiles LIMIT 1;

3. To test with specific user, you'd need to pass their JWT:
   - Get the JWT from your Next.js app (Clerk token)
   - Use it in API calls to Supabase
   - The RLS policy uses auth.jwt() ->> 'sub' to match

4. Common issues:
   - "new row violates row-level security policy" 
     → clerk_user_id doesn't match auth.jwt() ->> 'sub'
   - "permission denied for table items"
     → RLS is enabled but no policy exists for the operation
   - "no rows" when you expect data
     → RLS policy is correctly filtering
*/
