# Clerk + Supabase Integration - Complete Guide

## Overview

Your project uses:

- **Clerk** for authentication (sign-in, sign-up, user management)
- **Supabase** for application data (database, files, real-time)

They work together like this:

```
User Signs In with Clerk
         ↓
Clerk Issues JWT Token
         ↓
App Uses Clerk User ID (user.id)
         ↓
Queries Supabase with clerk_user_id
         ↓
RLS Policies Enforce Data Isolation
```

## Quick Start (2 Steps)

### Step 1: Generate Clerk Webhook Secret

1. Go to **Clerk Dashboard → Settings → Webhooks**
2. Click **Create Endpoint**
3. URL: `https://your-domain.com/api/webhooks/clerk`
4. Subscribe to: `user.created`, `user.updated`, `user.deleted`
5. Copy the **Signing Secret**
6. Add to `.env.local`:
   ```
   CLERK_WEBHOOK_SECRET=whsec_...
   ```

### Step 2: Create Database Tables

1. Go to **Supabase → SQL Editor**
2. Run the SQL from `SUPABASE_DATABASE_SETUP.sql`
3. This creates `profiles` and `items` tables with RLS

## Architecture

### Data Flow

```
┌─────────────────────────────────────────┐
│           Client Component              │
├─────────────────────────────────────────┤
│ const { user } = useUser()              │
│ const supabase = createClient()         │
│ // Query with user.id                   │
└──────────┬──────────────────────────────┘
           │
           ↓
┌─────────────────────────────────────────┐
│         Server Action / Route           │
├─────────────────────────────────────────┤
│ const { userId } = await auth()         │
│ const supabase = await createClient()   │
│ // Query with userId                    │
└──────────┬──────────────────────────────┘
           │
           ↓
┌─────────────────────────────────────────┐
│       Supabase with RLS Applied         │
├─────────────────────────────────────────┤
│ WHERE clerk_user_id = '{user_id}'       │
│ RLS validates ownership                 │
└─────────────────────────────────────────┘
```

### File Structure

```
lib/supabase/
├── client.ts                 # Browser client
├── server.ts                 # Server client
├── proxy.ts                  # Middleware
├── auth-helpers.ts          # Helper functions ⭐ USE THESE
├── QUICK_REFERENCE.md       # Quick snippets
├── CLERK_SUPABASE_INTEGRATION.md  # Full guide
└── examples/
    ├── client-example.tsx    # Client Component example
    ├── server-example.tsx    # Server Component example
    ├── server-actions.ts     # Server Actions example
    ├── full-example.tsx      # Complete working example
    └── form-example.tsx      # Form integration example

app/api/webhooks/clerk/
└── route.ts                 # Webhook handler

SUPABASE_DATABASE_SETUP.sql   # Database SQL setup
SUPABASE_SETUP.md            # Setup instructions
```

## How to Use

### 1. Client Component (Using Clerk + Supabase)

```tsx
"use client";
import { useUser } from "@clerk/nextjs";
import { createClient } from "@/lib/supabase/client";

export default function MyComponent() {
  const { user } = useUser();
  const supabase = createClient();

  const fetchData = async () => {
    const { data } = await supabase
      .from("items")
      .select("*")
      .eq("clerk_user_id", user?.id); // Filter by Clerk user ID
  };

  return <button onClick={fetchData}>Load Data</button>;
}
```

### 2. Server Component (Using Clerk + Supabase)

```tsx
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";

export default async function MyPage() {
  const { userId } = await auth();
  const supabase = await createClient();

  if (!userId) return <div>Not authenticated</div>;

  const { data } = await supabase
    .from("items")
    .select("*")
    .eq("clerk_user_id", userId); // Filter by Clerk user ID

  return <div>{/* Display data */}</div>;
}
```

### 3. Server Action (Using Helper Functions) ⭐ RECOMMENDED

```tsx
"use server";
import { createUserRecord } from "@/lib/supabase/auth-helpers";

export async function createItem(title: string) {
  // clerk_user_id is automatically added and verified
  return createUserRecord("items", { title });
}
```

## Helper Functions (Most Important!)

These are in `lib/supabase/auth-helpers.ts`:

```tsx
// Get authenticated user + supabase client
const { userId, supabase } = await getSupabaseUser();

// Fetch user's own data (auto-filters by clerk_user_id)
await getUserOwnData("items");

// Create record (auto-adds clerk_user_id)
await createUserRecord("items", { title: "My Item" });

// Update record (verifies ownership first)
await updateUserRecord("items", id, { title: "Updated" });

// Delete record (verifies ownership first)
await deleteUserRecord("items", id);

// Get single record (verifies it's yours)
await getUserRecord("items", id);
```

Use these instead of writing raw queries!

## Database Schema

### Profiles Table (Created by Webhook)

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL UNIQUE,  -- Links to Clerk
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Your Data Tables

```sql
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL,  -- Always include this!
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  FOREIGN KEY (clerk_user_id) REFERENCES profiles(clerk_user_id) ON DELETE CASCADE
);
```

**Key Pattern**: Every table has a `clerk_user_id` column to link to the user.

## RLS Policies

Row Level Security (RLS) automatically enforces that users can only access their own data:

```sql
-- Users can only view items they created
CREATE POLICY "users_view_own_items" ON items
  FOR SELECT
  USING (clerk_user_id = auth.jwt() ->> 'sub');

-- Users can only insert items they own
CREATE POLICY "users_insert_own_items" ON items
  FOR INSERT
  WITH CHECK (clerk_user_id = auth.jwt() ->> 'sub');
```

The `auth.jwt() ->> 'sub'` gets the Clerk user ID from the JWT.

## Webhook Flow

When a user signs up in Clerk:

1. Clerk creates user account
2. Webhook triggers → calls `/api/webhooks/clerk`
3. Handler creates profile row in Supabase with `clerk_user_id`
4. User is now ready to create data

When user updates profile in Clerk:

1. Clerk updates user
2. Webhook triggers → updates `profiles` table
3. Profile stays in sync

When user deletes account in Clerk:

1. Clerk deletes user
2. Webhook triggers → deletes `profiles` row
3. CASCADE delete removes all user's data

## Best Practices

### ✅ DO THIS

1. **Always include `clerk_user_id` in tables**

   ```sql
   CREATE TABLE items (
     ...
     clerk_user_id TEXT NOT NULL,
     ...
   );
   ```

2. **Filter by `clerk_user_id` in queries**

   ```tsx
   .eq('clerk_user_id', userId)
   ```

3. **Use helper functions from `auth-helpers.ts`**

   ```tsx
   await createUserRecord("items", { title });
   ```

4. **Verify ownership in Server Actions**

   ```tsx
   // The helper functions do this automatically
   await updateUserRecord("items", id, { title });
   ```

5. **Set up RLS policies**
   ```sql
   CREATE POLICY "..." ON items
     FOR SELECT USING (clerk_user_id = auth.jwt() ->> 'sub');
   ```

### ❌ DON'T DO THIS

1. ❌ Trust `clerk_user_id` from client

   ```tsx
   // WRONG - client could pass any ID
   .eq('clerk_user_id', formData.get('userId'))
   ```

2. ❌ Skip ownership verification

   ```tsx
   // WRONG - no check who owns this
   await supabase.from('items').update(...).eq('id', id)
   ```

3. ❌ Forget RLS policies

   ```tsx
   // WRONG - users could query other's data
   ALTER TABLE items DISABLE ROW LEVEL SECURITY;
   ```

4. ❌ Create tables without `clerk_user_id`

   ```sql
   -- WRONG - no way to link to user
   CREATE TABLE items (id UUID, title TEXT);
   ```

5. ❌ Use Supabase auth instead of Clerk
   ```tsx
   // WRONG - use Clerk for auth
   const {
     data: { user },
   } = await supabase.auth.getUser();
   ```

## Common Questions

### Q: How do I get the Clerk user ID?

**Client Component:**

```tsx
const { user } = useUser();
const clerkId = user?.id;
```

**Server Component:**

```tsx
const { userId } = await auth();
```

### Q: How do I query another user's data?

You can't! RLS policies automatically prevent it. If you need public data, create a separate public table and set RLS accordingly.

### Q: Do I need to pass the JWT?

No. The middleware (`proxy.ts`) automatically refreshes the Clerk session. Queries automatically use the authenticated user.

### Q: What if the webhook doesn't fire?

Users can still sign in, but their profile won't be created. You can manually create a profile:

```tsx
"use server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";

export async function createProfileIfNeeded(fullName: string) {
  const { userId } = await auth();
  const supabase = await createClient();

  // Only insert if doesn't exist
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("clerk_user_id", userId)
    .single();

  if (existing) return existing;

  return supabase
    .from("profiles")
    .insert({
      clerk_user_id: userId,
      full_name: fullName,
      email: user?.emailAddresses[0]?.emailAddress || "",
    })
    .select()
    .single();
}
```

### Q: How do I handle real-time updates?

Use Supabase subscriptions, but filter by user:

```tsx
"use client";
useEffect(() => {
  if (!user?.id) return;

  const channel = supabase
    .channel(`items:${user.id}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "items",
        filter: `clerk_user_id=eq.${user.id}`,
      },
      (payload) => {
        console.log("Update:", payload);
      },
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}, [user?.id]);
```

## Testing

### Local Testing

1. Start dev server: `npm run dev`
2. Sign in with Clerk
3. The webhook won't fire locally (no public URL)
4. Manually create a profile record in Supabase for testing
5. Test queries in your app

### Production Testing

1. Set `CLERK_WEBHOOK_SECRET` in your hosting platform
2. Deploy your app
3. Clerk webhooks will fire automatically
4. Test by signing up a new user

## Resources

- **Clerk Docs**: https://clerk.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **Integration Guide**: `CLERK_SUPABASE_INTEGRATION.md`
- **Database Setup**: `SUPABASE_DATABASE_SETUP.sql`
- **Quick Reference**: `lib/supabase/QUICK_REFERENCE.md`
- **Examples**: `lib/supabase/examples/`

## Summary

| Component            | Purpose                | Key Function             |
| -------------------- | ---------------------- | ------------------------ |
| **Clerk**            | User authentication    | `useUser()`, `auth()`    |
| **Supabase**         | Application data       | `createClient()`         |
| **clerk_user_id**    | Links Clerk → Supabase | Filter queries by this   |
| **RLS Policies**     | Data isolation         | Enforce who sees what    |
| **Webhook**          | Sync users             | Create profile on signup |
| **Helper Functions** | Safe operations        | Verify ownership         |

**Remember**: Clerk handles WHO the user is. Supabase stores WHAT data they own.
