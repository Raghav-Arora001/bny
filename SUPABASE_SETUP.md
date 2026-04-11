# Supabase Setup Guide

This project is configured with **Supabase** for backend databases and **Clerk** for authentication.

## Quick Start

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Create a new project
3. Wait for the project to be provisioned
4. Go to **Settings → API** to get your credentials

### 2. Get Your API Keys

Copy these values from the Supabase dashboard:

- **Project URL** (looks like: `https://xxxxx.supabase.co`)
- **Publishable Key** (the `anon` key or new `sb_publishable_*` key)

### 3. Add Environment Variables

Update `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key_here
```

### 4. Run Your App

```bash
npm run dev
```

Visit `http://localhost:3000` and you're ready to use Supabase!

## File Structure

```
lib/
  supabase/
    client.ts          # Browser client (Client Components)
    server.ts          # Server client (Server Components)
    proxy.ts           # Session refresh logic
    examples/
      client-example.tsx      # Client Component example
      server-example.tsx      # Server Component example
      server-actions.ts       # Server Actions example
      form-example.tsx        # Form with Server Actions example
```

## Using Supabase in Your Code

### In a Client Component

```tsx
"use client";
import { createClient } from "@/lib/supabase/client";

export default function MyComponent() {
  const supabase = createClient();

  const handleFetch = async () => {
    const { data, error } = await supabase.from("my_table").select("*");

    console.log(data, error);
  };

  return <button onClick={handleFetch}>Fetch Data</button>;
}
```

### In a Server Component

```tsx
import { createClient } from "@/lib/supabase/server";

export default async function MyPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("my_table")
    .select("*")
    .eq("user_id", user?.id);

  return <div>{/* Your content */}</div>;
}
```

### In a Server Action

```tsx
"use server";
import { createClient } from "@/lib/supabase/server";

export async function myServerAction(formData: FormData) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("my_table")
    .insert({
      title: formData.get("title"),
    })
    .select();

  return data;
}
```

## Database Setup

### Create Your First Table

1. Go to your Supabase dashboard
2. Open **SQL Editor**
3. Click **New Query**
4. Paste this SQL to create a basic table:

```sql
-- Create a profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policy so users can only see their own data
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
```

4. Click **Run**

### Use in Code

```tsx
const { data: profile } = await supabase.from("profiles").select("*").single();
```

## Authentication Integration

Since you're using **Clerk for authentication**, note that:

- **Clerk manages user signup/login flows**
- **Supabase stores your application data** (tables, files, real-time, etc.)

You can use both together:

```tsx
import { useUser } from "@clerk/nextjs";
import { createClient } from "@/lib/supabase/client";

export default function MyComponent() {
  const { user } = useUser();
  const supabase = createClient();

  const fetchUserData = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", user.id); // Use Clerk's user.id
  };

  return <button onClick={fetchUserData}>Load Data</button>;
}
```

## Storage Example

Upload and download files from Supabase Storage:

```tsx
const handleUpload = async (file: File) => {
  const supabase = createClient();

  const { data, error } = await supabase.storage
    .from("my-bucket")
    .upload(`uploads/${file.name}`, file);

  if (error) console.error(error);
  return data;
};

const handleDownload = async (path: string) => {
  const supabase = createClient();

  const { data, error } = await supabase.storage
    .from("my-bucket")
    .download(path);

  if (error) console.error(error);
  return data;
};
```

## Real-Time Subscriptions

Listen to database changes in real-time:

```tsx
"use client";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function RealtimeExample() {
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("my_table")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "my_table",
        },
        (payload) => {
          console.log("Change:", payload);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return <div>Listening for real-time updates...</div>;
}
```

## Row Level Security (RLS)

Always use RLS to protect your data:

```sql
-- Example RLS policy
CREATE POLICY "Users can only see their own data" ON my_table
  FOR SELECT USING (auth.uid() = user_id);
```

## Troubleshooting

### Keys not working?

- Make sure `.env.local` variables start with `NEXT_PUBLIC_` for client-side
- Restart your dev server after changing `.env.local`
- Check that you're using the **Publishable Key** (not Secret Key) in `.env.local`

### CORS errors?

- Go to Supabase Dashboard → **Authentication → URL Configuration**
- Add your app URL to the list of redirect URLs

### Session expiring?

- The `proxy.ts` middleware automatically refreshes your Supabase session
- No additional setup needed

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Next.js Guide](https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs)
- [Database API Reference](https://supabase.com/docs/reference/javascript)
- [Authentication Guide](https://supabase.com/docs/guides/auth)
- [Storage Guide](https://supabase.com/docs/guides/storage)
- [Real-Time Guide](https://supabase.com/docs/guides/realtime)

## Next Steps

1. Create your database tables in Supabase
2. Set up Row Level Security (RLS) policies
3. Use the examples in `lib/supabase/examples/` as templates
4. Check the Supabase docs for advanced features like Edge Functions, Webhooks, and Vector Search
