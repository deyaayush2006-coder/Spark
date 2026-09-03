import { createBrowserClient } from '@supabase/ssr'
<<<<<<< HEAD

export function createClient() {
=======
import { assertSupabaseEnv } from '@/lib/env'

export function createClient() {
  // Fails fast with a message that names the actual problem, instead of
  // letting every request come back as an opaque "Invalid API key".
  assertSupabaseEnv()

>>>>>>> 2335d4b (version 2.0)
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
