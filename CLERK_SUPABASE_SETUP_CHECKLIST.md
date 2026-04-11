# Clerk + Supabase Setup Checklist

Complete these steps to get Clerk and Supabase working together:

## Phase 1: Initial Setup (Already Done ✓)

- [x] Installed `@clerk/nextjs` and `@clerk/ui`
- [x] Installed `@supabase/supabase-js` and `@supabase/ssr`
- [x] Created Supabase client files:
  - [x] `lib/supabase/client.ts` (browser)
  - [x] `lib/supabase/server.ts` (server)
  - [x] `lib/supabase/proxy.ts` (middleware)
- [x] Integrated middleware in `proxy.ts`
- [x] Created environment variables placeholder in `.env.local`

## Phase 2: Clerk Configuration (15 min)

- [ ] **Get Clerk API Keys**
  - Go to https://dashboard.clerk.com
  - Create project or open existing
  - Go to **API Keys** page
  - Copy `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
  - Copy `CLERK_SECRET_KEY`

- [ ] **Add to `.env.local`**

  ```
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
  CLERK_SECRET_KEY=sk_test_...
  ```

- [ ] **Setup Webhook for User Sync**
  - Go to Clerk Dashboard → **Settings → Webhooks**
  - Click **Create Endpoint**
  - URL: `https://localhost:3000/api/webhooks/clerk` (dev)
  - Or: `https://your-domain.com/api/webhooks/clerk` (prod)
  - Subscribe to events:
    - [x] `user.created`
    - [x] `user.updated`
    - [x] `user.deleted`
  - Copy **Signing Secret**

- [ ] **Add Webhook Secret to `.env.local`**

  ```
  CLERK_WEBHOOK_SECRET=whsec_...
  ```

- [ ] **Test Clerk Sign In**
  - Run `npm run dev`
  - Visit `http://localhost:3000`
  - Sign in with Clerk
  - You should see Sign In/Sign Up buttons

## Phase 3: Supabase Configuration (15 min)

- [ ] **Create Supabase Project**
  - Go to https://supabase.com
  - Create new project
  - Wait for database to be ready

- [ ] **Get Supabase API Keys**
  - Go to **Settings → API**
  - Copy **Project URL** (looks like `https://xxx.supabase.co`)
  - Copy **Publishable Key** (look for `sb_publishable_*` or `anon` key)

- [ ] **Add to `.env.local`**

  ```
  NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJ...
  ```

- [ ] **Create Database Tables**
  - Go to Supabase → **SQL Editor**
  - Click **New Query**
  - Copy all SQL from `SUPABASE_DATABASE_SETUP.sql`
  - Paste and run
  - Tables created:
    - [x] `profiles`
    - [x] `items` (example table)
    - [x] RLS policies enabled

- [ ] **Verify Tables Created**
  - Go to **Table Editor**
  - Should see:
    - [x] `profiles` table
    - [x] `items` table
    - [x] RLS enabled (lock icon)

## Phase 4: Integration Testing (10 min)

- [ ] **Test Webhook Locally** (optional, but recommended)
  - In Clerk Dashboard, go to **Webhooks**
  - Find your endpoint → **Testing tab**
  - Send test `user.created` event
  - Check your app logs (you should see `[Webhook] Creating profile...`)
  - Or manually create a profile in Supabase for testing

- [ ] **Test Creating User Profile**

  ```tsx
  "use server";
  import { auth } from "@clerk/nextjs/server";
  import { createUserRecord } from "@/lib/supabase/auth-helpers";

  export async function createTestProfile() {
    const { userId } = await auth();
    return createUserRecord("profiles", {
      clerk_user_id: userId,
      email: "test@test.com",
    });
  }
  ```

- [ ] **Test Querying User Data**

  ```tsx
  "use client";
  import { useUser } from "@clerk/nextjs";
  import { createClient } from "@/lib/supabase/client";

  export default function Test() {
    const { user } = useUser();
    const supabase = createClient();

    const test = async () => {
      const { data } = await supabase
        .from("items")
        .select("*")
        .eq("clerk_user_id", user?.id);

      console.log("Items:", data);
    };

    return <button onClick={test}>Test Query</button>;
  }
  ```

## Phase 5: Using Helper Functions (Recommended!)

- [ ] **Read `lib/supabase/auth-helpers.ts`**
  - Understand what each function does
  - Use these instead of writing raw queries

- [ ] **Common Operations**

  ```tsx
  // Get authenticated user + client
  const { userId, supabase } = await getSupabaseUser();

  // Fetch user's data (auto-filters by clerk_user_id)
  await getUserOwnData("items");

  // Create record (auto-adds clerk_user_id)
  await createUserRecord("items", { title: "My Item" });

  // Update record (verifies ownership)
  await updateUserRecord("items", id, { title: "New" });

  // Delete record (verifies ownership)
  await deleteUserRecord("items", id);

  // Get single record (verifies it's yours)
  await getUserRecord("items", id);
  ```

## Phase 6: Real World Usage

- [ ] **Use `full-example.tsx` as Template**
  - Located at `lib/supabase/examples/full-example.tsx`
  - Shows complete working example
  - Copy and adapt for your needs

- [ ] **Build Your First Feature**
  - Create a table in Supabase
  - Set up RLS policies
  - Use helper functions from `auth-helpers.ts`
  - Test in your app

- [ ] **Add Real-Time Updates** (optional)
  - Use Supabase subscriptions
  - Subscribe to user's own data changes
  - Auto-refresh UI

## Phase 7: Production Deployment

- [ ] **Update Webhook URL in Clerk**
  - Go to Clerk Dashboard → **Webhooks**
  - Update endpoint URL to production domain
  - Test webhook in **Testing tab**

- [ ] **Set Environment Variables in Production**
  - Add to your hosting platform:
    ```
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
    CLERK_SECRET_KEY=...
    CLERK_WEBHOOK_SECRET=...
    NEXT_PUBLIC_SUPABASE_URL=...
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
    ```

- [ ] **Test in Production**
  - Sign in with new user
  - Webhook should fire and create profile
  - User should be able to create/update data
  - Other users can't see their data

- [ ] **Enable SSL/TLS**
  - Ensure your domain uses HTTPS
  - Webhooks require secure connections

## Troubleshooting

### Webhook Not Firing

**Problem**: Users sign in but no profile is created

**Solution**:

1. Check webhook endpoint URL is correct
2. Check `CLERK_WEBHOOK_SECRET` is set
3. Restart your dev server
4. Check app logs for errors
5. In Clerk Dashboard, click webhook → **Attempts** to see errors
6. Manually create profile for testing:
   ```sql
   INSERT INTO profiles (clerk_user_id, email)
   VALUES ('user_123', 'user@example.com');
   ```

### RLS "Permission Denied" Error

**Problem**: Queries fail with "permission denied for table items"

**Solution**:

1. Verify RLS policies were created in SQL
2. Check `WHERE` clause uses `clerk_user_id` (not `id`)
3. Verify `clerk_user_id` is TEXT not UUID
4. Check `auth.jwt() ->> 'sub'` gets the right value
5. Look at `SUPABASE_DATABASE_SETUP.sql` and re-run policies

### User Can See Other Users' Data

**Problem**: RLS policies didn't work

**Solution**:

1. Verify `RLS ENABLED` in table properties
2. Re-create RLS policies (drop old ones first)
3. Test with correct `clerk_user_id` value
4. Check filter in query: `.eq('clerk_user_id', userId)`

### Environment Variables Not Found

**Problem**: `.env.local` variables show undefined

**Solution**:

1. Restart dev server: `npm run dev`
2. Check `.env.local` file exists in root
3. Check variable names start with `NEXT_PUBLIC_` for client
4. Don't include `.env.local` in `.gitignore` locally, git commit is fine

### Webhooks Work But Profile Not Created

**Problem**: Webhook fires but database error

**Solution**:

1. Check `clerk_user_id` is TEXT column, not UUID
2. Verify `profiles` table exists
3. Manually test insert:
   ```sql
   INSERT INTO profiles (clerk_user_id, email)
   VALUES ('test_user_id', 'test@test.com');
   ```
4. Check app logs for exact error message

## Next Steps

1. **Read Documentation**
   - [ ] `CLERK_SUPABASE_COMPLETE_GUIDE.md`
   - [ ] `lib/supabase/QUICK_REFERENCE.md`
   - [ ] `CLERK_SUPABASE_INTEGRATION.md`

2. **Review Examples**
   - [ ] `lib/supabase/examples/full-example.tsx`
   - [ ] `lib/supabase/examples/server-actions.ts`
   - [ ] `lib/supabase/examples/client-example.tsx`

3. **Build Your App**
   - [ ] Create your database schema
   - [ ] Set up RLS policies
   - [ ] Use helper functions from `auth-helpers.ts`
   - [ ] Test locally
   - [ ] Deploy to production

## Support

- **Clerk**: https://clerk.com/docs
- **Supabase**: https://supabase.com/docs
- **This Project**: See `CLERK_SUPABASE_COMPLETE_GUIDE.md`

---

**You're all set!** 🚀 Start building amazing features with Clerk + Supabase!
