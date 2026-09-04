import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/supabase/auth'
import { BottomNav } from '@/components/bottom-nav'
import { IncomingCallListener } from '@/components/incoming-call-listener'
import { AppShell } from '@/components/app-shell'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Deduped with the identical call inside every page under this layout, so
  // a navigation makes one auth round trip instead of two.
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth/login')
  }

  const supabase = await createClient()

  // Check if user has a profile
  // maybeSingle(): a brand-new account legitimately has no profile row yet.
  // single() treats that as an error (PGRST116) and logs noise on every
  // first sign-in.
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) {
    redirect('/profile/setup')
  }

  return (
    <>
      <AppShell>{children}</AppShell>
      <BottomNav />

      {/* Mounted once for the whole signed-in app so an incoming call can
          interrupt whatever page the user is on. */}
      <IncomingCallListener currentUserId={user.id} />
    </>
  )
}
