import { cache } from 'react'
import { createClient } from './server'

/**
 * The signed-in user, fetched at most ONCE per server render.
 *
 * supabase.auth.getUser() is not a local cookie read — it makes a network
 * round trip to the Supabase Auth server to validate the JWT. Every page in
 * this app called it, and so did (app)/layout.tsx above it, so a single
 * navigation paid for that round trip two or three times in a row before any
 * data query even started.
 *
 * React's cache() dedupes per request: the layout and the page it wraps now
 * share one call. Do NOT swap this for getSession() to save the trip — that
 * reads an unverified cookie and is unsafe on the server.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
})
