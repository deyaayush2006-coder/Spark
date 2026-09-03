import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BottomNav } from '@/components/bottom-nav'
<<<<<<< HEAD
=======
import { IncomingCallListener } from '@/components/incoming-call-listener'
>>>>>>> 2335d4b (version 2.0)

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
<<<<<<< HEAD
  const { data: { user } } = await supabase.auth.getUser()
=======
  const {
    data: { user },
  } = await supabase.auth.getUser()
>>>>>>> 2335d4b (version 2.0)

  if (!user) {
    redirect('/auth/login')
  }

  // Check if user has a profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/profile/setup')
  }

  return (
    <div className="min-h-screen pb-20 md:pb-0">
<<<<<<< HEAD
      <main className="max-w-lg mx-auto">
        {children}
      </main>
      <BottomNav />
=======
      <main className="max-w-lg mx-auto">{children}</main>
      <BottomNav />

      {/* Mounted once for the whole signed-in app so an incoming call can
          interrupt whatever page the user is on. */}
      <IncomingCallListener currentUserId={user.id} />
>>>>>>> 2335d4b (version 2.0)
    </div>
  )
}
