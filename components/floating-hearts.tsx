'use client'

import { Heart } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface FloatingHeart {
  id: number
  left: number
  delay: number
  duration: number
  size: number
  opacity: number
  drift: number
}

/**
 * @param className overrides the container box. The default fills the
 * viewport; the match modal passes an absolutely-positioned box so the
 * hearts stay inside the celebration card instead of escaping to cover the
 * whole screen (a `fixed` child ignores an `absolute` parent).
 */
export function FloatingHearts({ className }: { className?: string } = {}) {
  const [hearts, setHearts] = useState<FloatingHeart[]>([])

  useEffect(() => {
    const newHearts: FloatingHeart[] = Array.from({ length: 15 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 5,
      duration: 8 + Math.random() * 8,
      size: 12 + Math.random() * 24,
      opacity: 0.1 + Math.random() * 0.2,
      // Sideways travel, so they don't all rise in perfectly straight lines.
      drift: -60 + Math.random() * 120,
    }))
    setHearts(newHearts)
  }, [])

  return (
    <div
      className={cn('fixed inset-0 pointer-events-none overflow-hidden text-primary', className)}
    >
      {hearts.map((heart) => (
        <div
          key={heart.id}
          // WAS: animate-float, which only nudges an element 10px up and back
          // down. These hearts were positioned below the fold at bottom:-50px
          // and so never came into view at all — the whole effect was
          // invisible. `rise` carries them the full height of the screen.
          className="absolute animate-rise"
          style={{
            left: `${heart.left}%`,
            bottom: '-50px',
            animationDelay: `${heart.delay}s`,
            animationDuration: `${heart.duration}s`,
            ['--rise-opacity' as string]: heart.opacity,
            ['--rise-drift' as string]: `${heart.drift}px`,
          }}
        >
          <Heart 
            style={{ width: heart.size, height: heart.size }}
            className="fill-current"
          />
        </div>
      ))}
    </div>
  )
}
