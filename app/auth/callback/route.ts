import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
<<<<<<< HEAD
  const next = searchParams.get('next') ?? '/profile/setup'
=======
  const rawNext = searchParams.get('next') ?? '/profile/setup'
  // Only allow a same-site relative path (must start with exactly one '/',
  // never '//' which some browsers treat as protocol-relative) so this
  // can't be used to redirect a user off-site after login.
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/profile/setup'
>>>>>>> 2335d4b (version 2.0)

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Check if user has a profile
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .single()
        
        // If no profile, redirect to setup
        if (!profile) {
          return NextResponse.redirect(`${origin}/profile/setup`)
        }
      }
      
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/error`)
}
