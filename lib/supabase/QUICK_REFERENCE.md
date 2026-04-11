// Quick Reference: Using Supabase in Next.js 16

// ============================================
// 1. CLIENT COMPONENT (Browser)
// ============================================
'use client'
import { createClient } from '@/lib/supabase/client'

export default function ClientComponent() {
const supabase = createClient() // No async needed

const fetchData = async () => {
const { data } = await supabase.from('table').select('\*')
return data
}

return <button onClick={fetchData}>Fetch</button>
}

// ============================================
// 2. SERVER COMPONENT (Server-side)
// ============================================
import { createClient } from '@/lib/supabase/server'

export default async function ServerComponent() {
const supabase = await createClient() // Must be async

const { data } = await supabase.from('table').select('\*')

return <div>{/_ Use data here _/}</div>
}

// ============================================
// 3. SERVER ACTION (Form submissions)
// ============================================
'use server'
import { createClient } from '@/lib/supabase/server'

export async function insertData(formData: FormData) {
const supabase = await createClient()

const { data, error } = await supabase
.from('table')
.insert({
name: formData.get('name'),
})
.select()

if (error) throw new Error(error.message)
return data
}

// ============================================
// 4. ROUTE HANDLER (API endpoints)
// ============================================
// app/api/data/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
const supabase = await createClient()

const { data, error } = await supabase.from('table').select('\*')

if (error) return NextResponse.json({ error: error.message }, { status: 400 })
return NextResponse.json(data)
}

// ============================================
// 5. AUTHENTICATION
// ============================================
import { createClient } from '@/lib/supabase/server'

// Get current user
const supabase = await createClient()
const {
data: { user },
} = await supabase.auth.getUser()

if (!user) {
// User is not authenticated
}

// In RLS queries, use auth.uid() to reference the user's ID
const { data } = await supabase
.from('my_data')
.select('\*')
.eq('user_id', user.id)

// ============================================
// 6. REAL-TIME SUBSCRIPTIONS
// ============================================
'use client'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function RealtimeComponent() {
useEffect(() => {
const supabase = createClient()

    const channel = supabase
      .channel('table_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'my_table' },
        (payload) => console.log('Update:', payload)
      )
      .subscribe()

    return () => supabase.removeChannel(channel)

}, [])

return <div>Listening...</div>
}

// ============================================
// 7. STORAGE (File uploads)
// ============================================
'use client'
import { createClient } from '@/lib/supabase/client'

export async function uploadFile(file: File) {
const supabase = createClient()

const { data, error } = await supabase.storage
.from('my_bucket')
.upload(`uploads/${file.name}`, file)

return data
}

export async function downloadFile(path: string) {
const supabase = createClient()

const { data, error } = await supabase.storage
.from('my_bucket')
.download(path)

return data
}

// ============================================
// QUICK DECISION TREE
// ============================================
/\*
WHERE IS YOUR CODE?

├─ In JSX component? → Use 'use client' + createClient()
├─ In async server component? → createClient (from server)
├─ Handling form action? → 'use server' action + createClient()
├─ In API route (app/api/)? → createClient (from server)
├─ In useEffect/onClick? → 'use client' + createClient()
├─ Fetching on load? → Server component + createClient()
└─ Real-time updates? → 'use client' + createClient() + .channel()

USING CLERK TOO?

The user from Clerk is: user.id
Use this in Supabase RLS policies and queries:
.eq('user_id', clerkUser.id)

The sessions are managed separately:

- Clerk: Manages authentication UI
- Supabase: Stores application data
  \*/
