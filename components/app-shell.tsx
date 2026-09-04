'use client'

import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

/**
 * Reserves the space BottomNav occupies.
 *
 * BottomNav is `fixed`, so it never takes up layout space of its own — the
 * shell has to leave room for it. It sits at the bottom on mobile but flips
 * to the TOP on md+ (`md:top-0`), so the padding has to flip sides too.
 * Without the `md:pt-20` half, the nav renders straight over every page's
 * `sticky top-0` header on desktop, hiding the back button, the call buttons
 * and the report menu.
 *
 * This is a client component purely so it can see the pathname: the call
 * screen is full-bleed and BottomNav returns null there, so the shell must
 * not reserve space for a nav that isn't rendered. Keep this condition in
 * sync with the one in components/bottom-nav.tsx.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const navHidden = pathname.includes('/call/')

  return (
    <div className={cn('min-h-screen', !navHidden && 'pb-20 md:pb-0 md:pt-20')}>
      <main className="max-w-lg mx-auto">{children}</main>
    </div>
  )
}
