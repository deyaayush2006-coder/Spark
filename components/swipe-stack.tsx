'use client'

import { useState, useCallback } from 'react'
import { Profile } from '@/lib/types'
import { SwipeCard } from '@/components/swipe-card'
import { MatchModal } from '@/components/match-modal'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Heart, Frown } from 'lucide-react'

interface SwipeStackProps {
  profiles: Profile[]
  currentUserId: string
}

export function SwipeStack({ profiles, currentUserId }: SwipeStackProps) {
  const [stack, setStack] = useState(profiles)
  const [matchedProfile, setMatchedProfile] = useState<Profile | null>(null)
  const [showMatchModal, setShowMatchModal] = useState(false)

  const handleSwipe = useCallback(async (profile: Profile, direction: 'left' | 'right' | 'super') => {
    const supabase = createClient()

    // Record the swipe
    const { error } = await supabase.from('swipes').insert({
      swiper_id: currentUserId,
      swiped_id: profile.id,
      direction,
    })

    if (error) {
      toast.error('Failed to record swipe')
      return
    }

    // Check for match if it was a like
    if (direction === 'right' || direction === 'super') {
      const { data: match } = await supabase
        .from('matches')
        .select('*')
        .or(`user1_id.eq.${currentUserId},user2_id.eq.${currentUserId}`)
        .or(`user1_id.eq.${profile.id},user2_id.eq.${profile.id}`)
        .single()

      if (match) {
        setMatchedProfile(profile)
        setShowMatchModal(true)
      }
    }

    // Remove from stack
    setStack(prev => prev.filter(p => p.id !== profile.id))
  }, [currentUserId])

  if (stack.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center animate-fade-in">
        <div className="w-24 h-24 rounded-full love-gradient flex items-center justify-center mb-6 animate-float">
          <Heart className="h-12 w-12 text-primary-foreground" />
        </div>
        <h2 className="text-2xl font-serif font-bold mb-2">No more profiles</h2>
        <p className="text-muted-foreground max-w-sm">
          {"You've seen everyone for now! Check back later for new potential matches."}
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="relative h-[calc(100vh-180px)] p-4">
        {stack.slice(0, 3).map((profile, index) => (
          <SwipeCard
            key={profile.id}
            profile={profile}
            onSwipe={handleSwipe}
            isTop={index === 0}
            style={{
              zIndex: stack.length - index,
              transform: `scale(${1 - index * 0.05}) translateY(${index * 10}px)`,
            }}
          />
        ))}
      </div>

      <MatchModal
        open={showMatchModal}
        onClose={() => setShowMatchModal(false)}
        matchedProfile={matchedProfile}
      />
    </>
  )
}
