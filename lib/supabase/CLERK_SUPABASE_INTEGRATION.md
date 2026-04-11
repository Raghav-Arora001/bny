// ============================================
// CLERK + SUPABASE INTEGRATION GUIDE
// ============================================

// ARCHITECTURE:
// 1. User signs in with Clerk
// 2. Clerk provides user.id
// 3. Store user.id in Supabase tables
// 4. Use RLS to enforce data isolation
// 5. Link data using user_id foreign key

// ============================================
// STEP 1: DATABASE SCHEMA (Use this RLS pattern)
// ============================================

/\*
SQL to create in Supabase SQL Editor:

-- Create profiles table linked to Clerk users
CREATE TABLE profiles (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
clerk_user_id TEXT NOT NULL UNIQUE,
email TEXT NOT NULL,
full_name TEXT,
avatar_url TEXT,
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user data table
CREATE TABLE user_data (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
clerk_user_id TEXT NOT NULL,
title TEXT,
content TEXT,
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
CONSTRAINT user_data_clerk_user_id_fkey
FOREIGN KEY (clerk_user_id) REFERENCES profiles(clerk_user_id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;

-- ✅ RLS Policies - Users can only see their own data
CREATE POLICY "Users can view own profile" ON profiles
FOR SELECT USING (clerk_user_id = current_user_id());

CREATE POLICY "Users can update own profile" ON profiles
FOR UPDATE USING (clerk_user_id = current_user_id());

CREATE POLICY "Users can delete own profile" ON profiles
FOR DELETE USING (clerk_user_id = current_user_id());

CREATE POLICY "Users can view own data" ON user_data
FOR SELECT USING (clerk_user_id = current_user_id());

CREATE POLICY "Users can insert own data" ON user_data
FOR INSERT WITH CHECK (clerk_user_id = current_user_id());

CREATE POLICY "Users can update own data" ON user_data
FOR UPDATE USING (clerk_user_id = current_user_id());

CREATE POLICY "Users can delete own data" ON user_data
FOR DELETE USING (clerk_user_id = current_user_id());

-- ❌ NOTE: Supabase doesn't automatically get Clerk's user ID
-- You need to pass it as a custom claim or use JWT
-- See next section for how to handle this...
\*/

// ============================================
// STEP 2: GET CLERK USER IN DIFFERENT CONTEXTS
// ============================================

// In Client Component
'use client'
import { useUser } from '@clerk/nextjs'
import { createClient } from '@/lib/supabase/client'

export default function ClientComponent() {
const { user } = useUser()
const supabase = createClient()

const clerkUserId = user?.id // This is what you use in Supabase queries

const fetchMyData = async () => {
if (!clerkUserId) return

    const { data } = await supabase
      .from('user_data')
      .select('*')
      .eq('clerk_user_id', clerkUserId) // Filter by Clerk user ID

}

return <button onClick={fetchMyData}>Load My Data</button>
}

// In Server Component
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

export default async function ServerComponent() {
const { userId } = await auth()
const supabase = await createClient()

if (!userId) {
return <div>Not authenticated</div>
}

const { data } = await supabase
.from('user_data')
.select('\*')
.eq('clerk_user_id', userId) // Use userId from Clerk

return <div>{/_ Show data _/}</div>
}

// In Server Action
'use server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'

export async function updateMyData(formData: FormData) {
const { userId } = await auth()
const supabase = await createClient()

if (!userId) throw new Error('Not authenticated')

const { data, error } = await supabase
.from('user_data')
.insert({
clerk_user_id: userId,
title: formData.get('title'),
content: formData.get('content'),
})
.select()
.single()

if (error) throw new Error(error.message)
return data
}

// ============================================
// STEP 3: RECOMMENDED PATTERN - BEST PRACTICES
// ============================================

// Create a helper to get authenticated Supabase client with user context
// lib/supabase/authenticated-client.ts

import { createClient as createServerClient } from '@/lib/supabase/server'
import { auth } from '@clerk/nextjs/server'

export async function getAuthenticatedSupabaseUser() {
const { userId } = await auth()

if (!userId) {
throw new Error('User not authenticated')
}

return { userId }
}

// Use in Server Actions
'use server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedSupabaseUser } from '@/lib/supabase/authenticated-client'

export async function createUserData(title: string, content: string) {
const { userId } = await getAuthenticatedSupabaseUser()
const supabase = await createClient()

// This pattern ensures user_id is ALWAYS set and verified
const { data, error } = await supabase
.from('user_data')
.insert({
clerk_user_id: userId, // Guaranteed to exist
title,
content,
})
.select()
.single()

if (error) throw new Error(error.message)
return data
}

// ============================================
// STEP 4: SYNC CLERK → SUPABASE (WEBHOOKS)
// ============================================

// When a new user signs up in Clerk, create their profile in Supabase
// app/api/webhooks/clerk/route.ts

import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const webhookSecret = process.env.CLERK_WEBHOOK_SECRET!

export async function POST(req: Request) {
const headersList = await headers()
const svix_id = headersList.get('svix-id')
const svix_timestamp = headersList.get('svix-timestamp')
const svix_signature = headersList.get('svix-signature')

if (!svix_id || !svix_timestamp || !svix_signature) {
return new NextResponse('Error occured -- no svix headers', {
status: 400,
})
}

const body = await req.text()
const wh = new Webhook(webhookSecret)

let evt: any

try {
evt = wh.verify(body, {
'svix-id': svix_id,
'svix-timestamp': svix_timestamp,
'svix-signature': svix_signature,
}) as any
} catch (err) {
console.error('Webhook verification failed:', err)
return new NextResponse('Error occured', {
status: 400,
})
}

const eventType = evt.type
const { id, email_addresses, first_name, last_name, image_url } = evt.data

const supabase = await createClient()

if (eventType === 'user.created') {
// Create profile when user signs up
const { error } = await supabase.from('profiles').insert({
clerk_user_id: id,
email: email_addresses[0]?.email_address || '',
full_name: `${first_name || ''} ${last_name || ''}`.trim(),
avatar_url: image_url,
})

    if (error) {
      console.error('Failed to create profile:', error)
      return new NextResponse('Error creating profile', { status: 400 })
    }

}

if (eventType === 'user.updated') {
// Update profile when user info changes
const { error } = await supabase
.from('profiles')
.update({
email: email_addresses[0]?.email_address || '',
full_name: `${first_name || ''} ${last_name || ''}`.trim(),
avatar_url: image_url,
})
.eq('clerk_user_id', id)

    if (error) {
      console.error('Failed to update profile:', error)
    }

}

if (eventType === 'user.deleted') {
// Delete profile when user deletes account
const { error } = await supabase
.from('profiles')
.delete()
.eq('clerk_user_id', id)

    if (error) {
      console.error('Failed to delete profile:', error)
    }

}

return new NextResponse('Webhook processed', { status: 200 })
}

// ============================================
// STEP 5: SETUP CLERK WEBHOOK
// ============================================

/\*
In Clerk Dashboard:

1. Go to Settings → Webhooks
2. Create new endpoint: https://your-domain.com/api/webhooks/clerk
3. Subscribe to these events:
   - user.created
   - user.updated
   - user.deleted

Environment variable:
CLERK*WEBHOOK_SECRET=whsec*... (from Clerk dashboard)
\*/

// ============================================
// STEP 6: COMMON QUERIES PATTERN
// ============================================

// User's own data (always filtered by clerk_user_id)
export async function getUserData() {
const { userId } = await auth()
const supabase = await createClient()

return supabase
.from('user_data')
.select('\*')
.eq('clerk_user_id', userId)
}

// Get user's profile
export async function getUserProfile() {
const { userId } = await auth()
const supabase = await createClient()

return supabase
.from('profiles')
.select('\*')
.eq('clerk_user_id', userId)
.single()
}

// Create new item (always sets clerk_user_id)
'use server'
export async function createItem(title: string) {
const { userId } = await auth()
if (!userId) throw new Error('Not authenticated')

const supabase = await createClient()

return supabase
.from('user_data')
.insert({ clerk_user_id: userId, title })
.select()
.single()
}

// Update item (verify ownership before updating)
'use server'
export async function updateItem(id: string, title: string) {
const { userId } = await auth()
if (!userId) throw new Error('Not authenticated')

const supabase = await createClient()

// Verify user owns this item before updating
const { data: existing } = await supabase
.from('user_data')
.select('clerk_user_id')
.eq('id', id)
.single()

if (existing?.clerk_user_id !== userId) {
throw new Error('Unauthorized')
}

return supabase
.from('user_data')
.update({ title })
.eq('id', id)
.select()
.single()
}

// ============================================
// STEP 7: CLIENT COMPONENT EXAMPLE
// ============================================

'use client'
import { useUser } from '@clerk/nextjs'
import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function MyItems() {
const { user } = useUser()
const supabase = createClient()
const [items, setItems] = useState<any[]>([])

// Fetch items when user loads
useEffect(() => {
if (user?.id) {
fetchItems()
}
}, [user?.id])

const fetchItems = useCallback(async () => {
if (!user?.id) return

    const { data } = await supabase
      .from('user_data')
      .select('*')
      .eq('clerk_user_id', user.id)
      .order('created_at', { ascending: false })

    setItems(data || [])

}, [user?.id, supabase])

// Subscribe to real-time changes
useEffect(() => {
if (!user?.id) return

    const channel = supabase
      .channel(`user_data:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_data',
          filter: `clerk_user_id=eq.${user.id}`,
        },
        () => {
          fetchItems() // Refresh when data changes
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }

}, [user?.id, fetchItems])

return (
<div>
<h1>My Items ({items.length})</h1>
{items.map((item) => (
<div key={item.id}>{item.title}</div>
))}
</div>
)
}

// ============================================
// SUMMARY: BEST PRACTICE FLOW
// ============================================

/\*

1. USER SIGNS UP
   ↓
   Clerk creates user account
   Clerk webhook → Supabase creates profile row with clerk_user_id
2. USER CREATES DATA
   ↓
   Server Action gets user.id from Clerk
   Inserts data with clerk_user_id field
   RLS automatically enforces isolation
3. USER QUERIES DATA
   Client: Gets user from useUser()
   Server: Gets userId from auth()
   Filter queries: .eq('clerk_user_id', userId)
4. DATA ISOLATION
   ✅ Always filter by clerk_user_id
   ✅ Use RLS policies to enforce on database
   ✅ Verify ownership in Server Actions before mutations
5. KEY POINTS
   ✅ Clerk manages authentication
   ✅ Supabase stores application data
   ✅ Link them via clerk_user_id
   ✅ Sync with webhooks for user profile
   ✅ Use RLS for security
   \*/
