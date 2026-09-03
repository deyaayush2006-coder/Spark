/**
 * Startup validation for Supabase environment variables.
 *
 * This exists because of a specific failure mode that is very hard to debug:
 * a Supabase anon/service key is a JWT whose payload contains a `ref` claim
 * naming the project it belongs to. If NEXT_PUBLIC_SUPABASE_URL points at
 * project A but the key was copied from project B, every single request fails
 * with a bare "Invalid API key" — even though both values are, individually,
 * completely valid. Supabase does not tell you the keys are mismatched.
 *
 * `assertSupabaseEnv()` decodes the keys locally (no network call, no secret
 * ever logged) and throws a message that names the actual problem.
 */

type KeyRole = 'anon' | 'service_role'

interface SupabaseKeyClaims {
  ref?: string
  role?: string
  exp?: number
}

function decodeJwtPayload(token: string): SupabaseKeyClaims | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    const json =
      typeof atob === 'function'
        ? atob(padded)
        : Buffer.from(padded, 'base64').toString('utf8')
    return JSON.parse(json) as SupabaseKeyClaims
  } catch {
    return null
  }
}

function projectRefFromUrl(url: string): string | null {
  const match = url.match(/^https:\/\/([a-z0-9]+)\.supabase\.(co|in)/i)
  return match ? match[1] : null
}

function checkKey(
  varName: string,
  rawKey: string,
  expectedRole: KeyRole,
  urlRef: string | null,
  problems: string[],
) {
  const key = rawKey.trim()

  if (key !== rawKey) {
    problems.push(
      `${varName} has leading/trailing whitespace or quotes. Remove them — the value must be the bare key with nothing around it.`,
    )
  }

  // Newer Supabase projects issue non-JWT keys (sb_publishable_… /
  // sb_secret_…). Those can't be decoded, and that's fine — skip the check.
  if (key.startsWith('sb_publishable_') || key.startsWith('sb_secret_')) return

  const claims = decodeJwtPayload(key)
  if (!claims) {
    problems.push(
      `${varName} is not a valid Supabase key. Copy it again from Supabase → Project Settings → API.`,
    )
    return
  }

  if (claims.role && claims.role !== expectedRole) {
    problems.push(
      `${varName} holds a "${claims.role}" key but should hold the "${expectedRole}" key. The anon and service_role keys are easy to mix up — they look almost identical.`,
    )
  }

  if (urlRef && claims.ref && claims.ref !== urlRef) {
    problems.push(
      `${varName} belongs to Supabase project "${claims.ref}", but NEXT_PUBLIC_SUPABASE_URL points at project "${urlRef}".\n` +
        `  >>> THIS IS THE #1 CAUSE OF "Invalid API key". Both values are valid on their own; they just come from different projects.\n` +
        `  >>> Fix: open the ONE project you want in the Supabase dashboard, go to Project Settings → API, and copy the URL and both keys from that same page.`,
    )
  }

  if (claims.exp && claims.exp * 1000 < Date.now()) {
    problems.push(`${varName} expired on ${new Date(claims.exp * 1000).toDateString()}. Generate a new key.`)
  }
}

let alreadyChecked = false

/**
 * Throws a descriptive error if the Supabase env vars are missing or
 * inconsistent. Safe to call on every request — the work is done once.
 *
 * @param includeServiceRole pass true from server-only code that needs the
 *   service_role key; leave false in code that also runs in the browser.
 */
export function assertSupabaseEnv(includeServiceRole = false): void {
  if (alreadyChecked) return

  const problems: string[] = []
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url) {
    problems.push('NEXT_PUBLIC_SUPABASE_URL is missing. Add it to .env.local.')
  }
  if (!anonKey) {
    problems.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is missing. Add it to .env.local.')
  }

  const urlRef = url ? projectRefFromUrl(url) : null
  if (url && !urlRef) {
    problems.push(
      `NEXT_PUBLIC_SUPABASE_URL ("${url}") doesn't look like a Supabase URL. It should be https://<project-ref>.supabase.co with no trailing slash and no /rest/v1 path.`,
    )
  }

  if (anonKey) checkKey('NEXT_PUBLIC_SUPABASE_ANON_KEY', anonKey, 'anon', urlRef, problems)

  if (includeServiceRole) {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) {
      problems.push('SUPABASE_SERVICE_ROLE_KEY is missing (needed by server routes).')
    } else {
      checkKey('SUPABASE_SERVICE_ROLE_KEY', serviceKey, 'service_role', urlRef, problems)
    }
  }

  if (problems.length > 0) {
    throw new Error(
      '\n\n=== Supabase configuration problem ===\n\n' +
        problems.map((p, i) => `${i + 1}. ${p}`).join('\n\n') +
        '\n\nAfter editing .env.local you MUST restart `npm run dev` — Next.js only reads env files at startup.\n',
    )
  }

  alreadyChecked = true
}
