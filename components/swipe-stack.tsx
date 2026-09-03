'use client'

import { useState, useCallback } from 'react'
import { Profile } from '@/lib/types'
import { SwipeCard } from '@/components/swipe-card'
import { MatchModal } from '@/components/match-modal'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
<<<<<<< HEAD
import { Heart, Frown } from 'lucide-react'
=======
import { Heart } from 'lucide-react'
>>>>>>> 2335d4b (version 2.0)

interface SwipeStackProps {
  profiles: Profile[]
  currentUserId: string
}

export function SwipeStack({ profiles, currentUserId }: SwipeStackProps) {
  const [stack, setStack] = useState(profiles)
  const [matchedProfile, setMatchedProfile] = useState<Profile | null>(null)
  const [showMatchModal, setShowMatchModal] = useState(false)

<<<<<<< HEAD
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
=======
  const handleSwipe = useCallback(
    async (profile: Profile, direction: 'left' | 'right' | 'super') => {
      const supabase = createClient()

      // Remove from the stack immediately so the UI stays responsive and a
      // slow network can't let the same card be swiped twice.
      setStack((prev) => prev.filter((p) => p.id !== profile.id))

      const { error } = await supabase.from('swipes').insert({
        swiper_id: currentUserId,
        swiped_id: profile.id,
        direction,
      })

      if (error) {
        // 23505 = unique violation, i.e. already swiped on this person.
        // That's harmless and shouldn't produce a scary toast.
        if (error.code !== '23505') {
          toast.error('Failed to record swipe')
        }
        return
      }

      if (direction !== 'right' && direction !== 'super') return

      // The database trigger create_match_on_mutual_like() has already run
      // inside the same transaction as the insert above, so if a match was
      // going to be created it exists by now.
      //
      // The match row always stores the two ids as LEAST/GREATEST, so look it
      // up by that exact pair. The previous version chained two .or() calls,
      // which PostgREST ANDs into a much looser condition — it could match a
      // completely unrelated match row involving either person and pop the
      // "It's a match!" modal for the wrong profile.
      const [user1, user2] =
        currentUserId < profile.id ? [currentUserId, profile.id] : [profile.id, currentUserId]

      const { data: match } = await supabase
        .from('matches')
        .select('id')
        .eq('user1_id', user1)
        .eq('user2_id', user2)
        .maybeSingle() // maybeSingle: "no match yet" is the normal case, not an error
>>>>>>> 2335d4b (version 2.0)

      if (match) {
        setMatchedProfile(profile)
        setShowMatchModal(true)
      }
<<<<<<< HEAD
    }

    // Remove from stack
    setStack(prev => prev.filter(p => p.id !== profile.id))
  }, [currentUserId])
=======
    },
    [currentUserId],
  )
>>>>>>> 2335d4b (version 2.0)

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
