'use client'

import { useState, useRef, CSSProperties } from 'react'
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

export function SwipeCard({ profile, onSwipe, isTop, style }: SwipeCardProps) {
  const [photoIndex, setPhotoIndex] = useState(0)
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const startX = useRef(0)
  const currentX = useRef(0)

  const photos = profile.photos || ['https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400']

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isTop) return
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    startX.current = clientX
  }

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isTop || !cardRef.current) return
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    currentX.current = clientX - startX.current
    
    const rotation = currentX.current * 0.1
    cardRef.current.style.transform = `translateX(${currentX.current}px) rotate(${rotation}deg)`
    
    if (currentX.current > 50) {
      setSwipeDirection('right')
    } else if (currentX.current < -50) {
      setSwipeDirection('left')
    } else {
      setSwipeDirection(null)
    }
  }

  const handleTouchEnd = () => {
    if (!isTop || !cardRef.current) return
    
    if (Math.abs(currentX.current) > 100) {
      const direction = currentX.current > 0 ? 'right' : 'left'
      setIsAnimating(true)
      cardRef.current.classList.add(direction === 'right' ? 'animate-swipe-right' : 'animate-swipe-left')
      setTimeout(() => onSwipe(profile, direction), 300)
    } else {
      cardRef.current.style.transform = ''
      setSwipeDirection(null)
    }
    currentX.current = 0
  }

  const handleButtonSwipe = (direction: 'left' | 'right' | 'super') => {
    if (!isTop || isAnimating || !cardRef.current) return
    setIsAnimating(true)
    
    if (direction === 'super') {
      cardRef.current.style.transition = 'transform 0.4s ease-out, opacity 0.4s ease-out'
      cardRef.current.style.transform = 'translateY(-150%) scale(1.1)'
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
        'absolute inset-x-4 top-0 bg-card rounded-3xl overflow-hidden shadow-xl transition-[transform,opacity]',
        !isTop && 'pointer-events-none'
      )}
      style={{
        height: 'calc(100% - 80px)',
        ...style,
        transition: isAnimating ? 'none' : 'transform 0.3s ease-out',
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
          src={photos[photoIndex]}
          alt={profile.name}
          className="w-full h-full object-cover"
          draggable={false}
        />

        {/* Photo navigation */}
        {photos.length > 1 && (
          <>
            <div className="absolute top-4 inset-x-4 flex gap-1">
              {photos.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'h-1 flex-1 rounded-full transition-colors',
                    i === photoIndex ? 'bg-white' : 'bg-white/40'
                  )}
                />
              ))}
            </div>
            <button
              onClick={prevPhoto}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-20 flex items-center justify-center"
            >
              <ChevronLeft className="h-8 w-8 text-white drop-shadow-lg" />
            </button>
            <button
              onClick={nextPhoto}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-20 flex items-center justify-center"
            >
              <ChevronRight className="h-8 w-8 text-white drop-shadow-lg" />
            </button>
          </>
        )}

        {/* Swipe indicators */}
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center transition-opacity',
            swipeDirection === 'right' ? 'opacity-100' : 'opacity-0'
          )}
        >
          <div className="w-24 h-24 rounded-full border-4 border-green-500 flex items-center justify-center bg-green-500/20">
            <Heart className="h-12 w-12 text-green-500 fill-green-500" />
          </div>
        </div>
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center transition-opacity',
            swipeDirection === 'left' ? 'opacity-100' : 'opacity-0'
          )}
        >
          <div className="w-24 h-24 rounded-full border-4 border-red-500 flex items-center justify-center bg-red-500/20">
            <X className="h-12 w-12 text-red-500" />
          </div>
        </div>

        {/* Profile info overlay */}
        <div 
          className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6 cursor-pointer"
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
                    {profile.interests.map((interest) => (
                      <Badge key={interest} variant="secondary" className="bg-white/20 text-white border-0">
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
                      className="flex items-center gap-1 text-white/80 hover:text-white"
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
                      className="flex items-center gap-1 text-white/80 hover:text-white"
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
          <Button
            size="lg"
            variant="outline"
            className="w-16 h-16 rounded-full border-2 border-red-400 text-red-400 hover:bg-red-400 hover:text-white"
            onClick={() => handleButtonSwipe('left')}
          >
            <X className="h-8 w-8" />
          </Button>
          <Button
            size="lg"
            className="w-20 h-20 rounded-full love-gradient text-primary-foreground border-0 shadow-lg"
            onClick={() => handleButtonSwipe('super')}
          >
            <Star className="h-10 w-10" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="w-16 h-16 rounded-full border-2 border-green-400 text-green-400 hover:bg-green-400 hover:text-white"
            onClick={() => handleButtonSwipe('right')}
          >
            <Heart className="h-8 w-8" />
          </Button>
        </div>
      )}
    </div>
  )
}
