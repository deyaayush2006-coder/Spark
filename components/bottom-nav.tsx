'use client'

import Link, { useLinkStatus } from 'next/link'
import { usePathname } from 'next/navigation'
import { Heart, MessageCircle, Users, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/discover', icon: Heart, label: 'Discover' },
  { href: '/matches', icon: MessageCircle, label: 'Matches' },
  { href: '/social', icon: Users, label: 'Social' },
  { href: '/profile', icon: User, label: 'Profile' },
]

/**
 * The tab's own contents, split out so it can call useLinkStatus().
 *
 * That hook only reports the pending state of the Link it is rendered
 * inside, so it has to live in a child of <Link>, not alongside it.
 * Without this, tapping a tab looked broken: the destination is a dynamic
 * server render, so nothing on screen changed until the new page's data came
 * back, and people tapped again thinking they'd missed.
 */
function NavItemContent({
  icon: Icon,
  label,
  href,
  isActive,
}: {
  icon: typeof Heart
  label: string
  href: string
  isActive: boolean
}) {
  const { pending } = useLinkStatus()

  // Light up the moment the tap lands, before the route has resolved.
  const highlighted = isActive || pending

  return (
    <span
      className={cn(
        'flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all',
        highlighted ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
        pending && 'opacity-70',
      )}
    >
      <Icon
        className={cn(
          'h-6 w-6 transition-transform',
          highlighted && 'scale-110',
          highlighted && href === '/discover' && 'fill-primary',
        )}
      />
      <span className={cn('text-xs font-medium', highlighted && 'love-gradient-text')}>
        {label}
      </span>
    </span>
  )
}

export function BottomNav() {
  const pathname = usePathname()

  // The call screen is full-bleed and puts its hang-up button at the bottom.
  // A fixed z-50 tab bar sits right on top of it, so hide the nav there.
  if (pathname.includes('/call/')) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t z-50 md:top-0 md:bottom-auto">
      <div className="max-w-lg mx-auto flex items-center justify-around py-2">
        {navItems.map(({ href, icon, label }) => (
          <Link
            key={href}
            href={href}
            // Explicit rather than relying on the default: these four links
            // are always on screen, so warming each tab's shell up front is
            // exactly what we want.
            prefetch
          >
            <NavItemContent
              icon={icon}
              label={label}
              href={href}
              isActive={pathname.startsWith(href)}
            />
          </Link>
        ))}
      </div>
    </nav>
  )
}
