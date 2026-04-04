'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Heart, MessageCircle, Users, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/discover', icon: Heart, label: 'Discover' },
  { href: '/matches', icon: MessageCircle, label: 'Matches' },
  { href: '/social', icon: Users, label: 'Social' },
  { href: '/profile', icon: User, label: 'Profile' },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t z-50 md:top-0 md:bottom-auto">
      <div className="max-w-lg mx-auto flex items-center justify-around py-2">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all',
                isActive 
                  ? 'text-primary' 
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon 
                className={cn(
                  'h-6 w-6 transition-transform',
                  isActive && 'scale-110',
                  isActive && href === '/discover' && 'fill-primary'
                )} 
              />
              <span className={cn(
                'text-xs font-medium',
                isActive && 'love-gradient-text'
              )}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
