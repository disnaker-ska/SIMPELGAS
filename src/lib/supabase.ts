import { createClient } from '@supabase/supabase-js'

// ============================================================
// Server-side Supabase client (uses service_role key)
// Use this ONLY in Server Components, Server Actions, and API Routes
// ============================================================
export function createServerSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, serviceKey)
}

// ============================================================
// Client-side Supabase client (uses anon/publishable key)
// Use this in Client Components ("use client")
// ============================================================
let clientInstance: ReturnType<typeof createClient> | null = null

export function createBrowserSupabaseClient() {
  if (clientInstance) return clientInstance

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  clientInstance = createClient(url, anonKey)
  return clientInstance
}
