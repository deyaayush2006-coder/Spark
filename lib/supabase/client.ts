import { createBrowserClient } from '@supabase/ssr'
import { assertSupabaseEnv } from '@/lib/env'

export function createClient() {
  // Fails fast with a message that names the actual problem, instead of
  // letting every request come back as an opaque "Invalid API key".
  assertSupabaseEnv()

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}