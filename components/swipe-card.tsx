'use client'

import { useState, useRef, useEffect, CSSProperties } from 'react'
import { Profile } from '@/lib/types'
import { Heart, X, Star, MapPin, Briefcase, Instagram, Music, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface SwipeCardProps {
  profile: Profile
  onSwipe: (profile: Profile, direction: 'left' | 'right' | 'super') => void
  isTop: boolean
  style?: CSSProperties
}

// Distance at which an indicator reaches full strength, and the distance a
// release has to clear to actually commit the swipe.
const INDICATOR_RANGE = 110
const COMMIT_THRESHOLD = 100

export function SwipeCard({ profile, onSwipe, isTop, style }: SwipeCardProps) {
  const [photoIndex, setPhotoIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  // Drag distance in px, mirrored into state so the overlays can react
  // continuously. The transform itself is still written straight to the node
  // so dragging never waits on a React render.
  const [dragX, setDragX] = useState(0)
  const [burst, setBurst] = useState<'left' | 'right' | 'super' | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const startX = useRef(0)
  const currentX = useRef(0)
  const frame = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current)
    }
  }, [])

  // A photoless profile used to fall back to a hard-coded Unsplash photo of
  // a specific woman - shown under every such profile's name and age, for
  // every gender. Use the neutral local placeholder instead.
  const photos = profile.photos?.length ? profile.photos : ['/placeholder-user.jpg']

  // 0 to 1 as the card is dragged toward either edge.
  const intent = Math.min(Math.abs(dragX) / INDICATOR_RANGE, 1)
  const swipeDirection = dragX > 12 ? 'right' : dragX < -12 ? 'left' : null

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isTop || isAnimating) return
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    startX.current = clientX
    // The previous release may have left a spring-back easing on the node.
    // Clear it here rather than waiting for the re-render, or the first few
    // frames of this drag lag behind the finger.
    if (cardRef.current) cardRef.current.style.transition = 'none'
    setIsDragging(true)
  }

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isTop || isAnimating || !cardRef.current) return
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    currentX.current = clientX - startX.current

    const rotation = currentX.current * 0.06
    // Lift the card slightly while it is held, so it reads as picked up off
    // the stack rather than sliding along it.
    const lift = 1 + Math.min(Math.abs(currentX.current) / 2000, 0.03)
    cardRef.current.style.transform =
      `translateX(${currentX.current}px) rotate(${rotation}deg) scale(${lift})`

    // Coalesce the state update to one per frame: a drag fires dozens of
    // move events per second and each one would otherwise be a render.
    if (frame.current === null) {
      frame.current = requestAnimationFrame(() => {
        frame.current = null
        setDragX(currentX.current)
      })
    }
  }

  const handleTouchEnd = () => {
    if (!isTop || isAnimating || !cardRef.current) return
    setIsDragging(false)

    // Drop any move update still queued for the next frame; it would land
    // after the reset below and leave the indicators half lit.
    if (frame.current !== null) {
      cancelAnimationFrame(frame.current)
      frame.current = null
    }

    if (Math.abs(currentX.current) > COMMIT_THRESHOLD) {
      const direction = currentX.current > 0 ? 'right' : 'left'
      setIsAnimating(true)
      setBurst(direction)
      cardRef.current.classList.add(direction === 'right' ? 'animate-swipe-right' : 'animate-swipe-left')
      setTimeout(() => onSwipe(profile, direction), 300)
    } else {
      // Spring back rather than snapping: an overshoot curve is what makes a
      // half-hearted drag feel elastic instead of broken.
      cardRef.current.style.transition = 'transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)'
      cardRef.current.style.transform = ''
      setDragX(0)
    }
    currentX.current = 0
  }

  const handleButtonSwipe = (direction: 'left' | 'right' | 'super') => {
    if (!isTop || isAnimating || !cardRef.current) return
    setIsAnimating(true)
    setBurst(direction)

    if (direction === 'super') {
      cardRef.current.style.transition = 'transform 0.4s ease-out, opacity 0.4s ease-out'
      cardRef.current.style.transform = 'translateY(-150%) scale(1.1) rotate(-4deg)'
      cardRef.current.style.opacity = '0'
    } else {
      cardRef.current.classList.add(direction === 'right' ? 'animate-swipe-right' : 'animate-swipe-left')
    }

    setTimeout(() => onSwipe(profile, direction), 300)
  }

  const nextPhoto = () => setPhotoIndex(prev => (prev + 1) % photos.length)
  const prevPhoto = () => setPhotoIndex(prev => (prev - 1 + photos.length) % photos.length)

  return (
    <div
      ref={cardRef}
      className={cn(
        'absolute inset-x-4 top-0 bg-card rounded-3xl overflow-hidden shadow-xl',
        // Deepen the shadow while held, so the lift above has something to
        // cast. Purely a transition - the resting shadow is unchanged.
        'transition-shadow duration-200',
        isDragging && 'shadow-2xl',
        !isTop && 'pointer-events-none'
      )}
      style={{
        height: 'calc(100% - 80px)',
        ...style,
        transition: isAnimating || isDragging ? 'none' : 'transform 0.3s ease-out',
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseMove={(e) => e.buttons === 1 && handleTouchMove(e)}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
    >
      {/* Photo */}
      <div className="relative h-full">
        <img
          // Keying on the photo remounts the img, which restarts the fade so
          // each photo crossfades in instead of popping.
          key={photos[photoIndex]}
          src={photos[photoIndex]}
          alt={profile.name}
          className="w-full h-full object-cover animate-fade-in"
          draggable={false}
        />

        {/* Tint the card toward green or red as it is dragged. */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none transition-colors"
          style={{
            background:
              swipeDirection === 'right'
                ? `rgba(34, 197, 94, ${intent * 0.22})`
                : swipeDirection === 'left'
                  ? `rgba(239, 68, 68, ${intent * 0.22})`
                  : 'transparent',
          }}
        />

        {/* Photo navigation */}
        {photos.length > 1 && (
          <>
            <div className="absolute top-4 inset-x-4 flex gap-1">
              {photos.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'h-1 flex-1 rounded-full transition-all duration-300',
                    i === photoIndex ? 'bg-white' : 'bg-white/40'
                  )}
                />
              ))}
            </div>
            <button
              type="button"
              aria-label="Previous photo"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={prevPhoto}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-20 flex items-center justify-center press active:opacity-70"
            >
              <ChevronLeft className="h-8 w-8 text-white drop-shadow-lg transition-transform hover:-translate-x-0.5" />
            </button>
            <button
              type="button"
              aria-label="Next photo"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={nextPhoto}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-20 flex items-center justify-center press active:opacity-70"
            >
              <ChevronRight className="h-8 w-8 text-white drop-shadow-lg transition-transform hover:translate-x-0.5" />
            </button>
          </>
        )}

        {/* Swipe indicators.
            These used to flip between opacity 0 and 1 at a fixed 50px, so the
            card gave no feedback at all until it suddenly gave all of it.
            They now track the drag: you can see how close you are to
            committing, and back out if you didn't mean it. */}
        <div
          aria-hidden
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{
            opacity: swipeDirection === 'right' ? intent : 0,
            transform: `scale(${0.75 + intent * 0.25}) rotate(${-12 * (1 - intent)}deg)`,
            transition: isDragging ? 'none' : 'opacity 0.2s ease, transform 0.2s ease',
          }}
        >
          <div className="w-24 h-24 rounded-full border-4 border-green-500 flex items-center justify-center bg-green-500/20">
            <Heart className="h-12 w-12 text-green-500 fill-green-500" />
          </div>
        </div>
        <div
          aria-hidden
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{
            opacity: swipeDirection === 'left' ? intent : 0,
            transform: `scale(${0.75 + intent * 0.25}) rotate(${12 * (1 - intent)}deg)`,
            transition: isDragging ? 'none' : 'opacity 0.2s ease, transform 0.2s ease',
          }}
        >
          <div className="w-24 h-24 rounded-full border-4 border-red-500 flex items-center justify-center bg-red-500/20">
            <X className="h-12 w-12 text-red-500" />
          </div>
        </div>

        {/* Profile info overlay */}
        <div
          className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6 cursor-pointer transition-all duration-300"
          onClick={() => setShowDetails(!showDetails)}
        >
          <div className="text-white">
            <h2 className="text-2xl font-serif font-bold flex items-center gap-2">
              {profile.name}, {profile.age}
              {profile.is_bot && (
                <Badge variant="secondary" className="text-xs">Bot</Badge>
              )}
            </h2>

            {profile.occupation && (
              <p className="flex items-center gap-1 text-white/80 mt-1">
                <Briefcase className="h-4 w-4" />
                {profile.occupation}
              </p>
            )}

            {profile.location && (
              <p className="flex items-center gap-1 text-white/80">
                <MapPin className="h-4 w-4" />
                {profile.location}
              </p>
            )}

            {showDetails && (
              <div className="mt-4 space-y-3 animate-slide-up">
                {profile.bio && (
                  <p className="text-white/90 leading-relaxed">{profile.bio}</p>
                )}

                {profile.interests && profile.interests.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {profile.interests.map((interest, i) => (
                      <Badge
                        key={interest}
                        variant="secondary"
                        // Staggered so the tags cascade in rather than
                        // appearing as one block.
                        className="bg-white/20 text-white border-0 animate-pop-in opacity-0 transition-transform hover:scale-105"
                        style={{ animationDelay: `${0.05 + i * 0.04}s` }}
                      >
                        {interest}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex gap-3">
                  {profile.instagram_url && (
                    <a
                      href={profile.instagram_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-white/80 hover:text-white transition-transform hover:scale-125 press"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Instagram className="h-5 w-5" />
                    </a>
                  )}
                  {profile.spotify_url && (
                    <a
                      href={profile.spotify_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-white/80 hover:text-white transition-transform hover:scale-125 press"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Music className="h-5 w-5" />
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      {isTop && (
        <div className="absolute bottom-24 inset-x-0 flex items-center justify-center gap-4 p-4">
          <div className="relative">
            {burst === 'left' && (
              <span
                aria-hidden
                className="absolute inset-0 rounded-full bg-red-400/60 animate-burst pointer-events-none"
              />
            )}
            <Button
              size="lg"
              variant="outline"
              className={cn(
                'w-16 h-16 rounded-full border-2 border-red-400 text-red-400 hover:bg-red-400 hover:text-white',
                'transition-transform duration-200 hover:scale-110 hover:rotate-90',
                // Grows in sympathy as the card is dragged its way.
                swipeDirection === 'left' && 'scale-110',
              )}
              onClick={() => handleButtonSwipe('left')}
            >
              <X className="h-8 w-8" />
            </Button>
          </div>

          <div className="relative">
            {burst === 'super' && (
              <span
                aria-hidden
                className="absolute inset-0 rounded-full love-gradient opacity-60 animate-burst pointer-events-none"
              />
            )}
            <Button
              size="lg"
              className="w-20 h-20 rounded-full love-gradient text-primary-foreground border-0 shadow-lg transition-transform duration-200 hover:scale-110 group"
              onClick={() => handleButtonSwipe('super')}
            >
              <Star className="h-10 w-10 group-hover:animate-wiggle" />
            </Button>
          </div>

          <div className="relative">
            {burst === 'right' && (
              <span
                aria-hidden
                className="absolute inset-0 rounded-full bg-green-400/60 animate-burst pointer-events-none"
              />
            )}
            <Button
              size="lg"
              variant="outline"
              className={cn(
                'w-16 h-16 rounded-full border-2 border-green-400 text-green-400 hover:bg-green-400 hover:text-white',
                'transition-transform duration-200 hover:scale-110 group',
                swipeDirection === 'right' && 'scale-110',
              )}
              onClick={() => handleButtonSwipe('right')}
            >
              <Heart className="h-8 w-8 group-hover:animate-heartbeat" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
