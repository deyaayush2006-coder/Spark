import 'server-only'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Service-role Supabase client. This bypasses Row Level Security entirely,
 * so it must only ever be used in trusted server code (Route Handlers,
 * Server Actions) that has already independently verified the caller is
 * allowed to perform the operation — never in a Client Component, and never
 * passed the SUPABASE_SERVICE_ROLE_KEY to the browser.
 *
 * The `server-only` import above makes this a build error if anything
 * accidentally imports this module from client-side code.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. ' +
        'The service role key must be set as a server-only environment variable ' +
        '(never prefixed with NEXT_PUBLIC_) — see .env.example.'
    )
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
