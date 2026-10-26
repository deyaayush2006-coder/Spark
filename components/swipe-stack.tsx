'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import type { DiscoverProfile, Profile } from '@/lib/types'
import { SwipeCard } from '@/components/swipe-card'
import { MatchModal } from '@/components/match-modal'
import { createClient } from '@/lib/supabase/client'
import { fetchDiscoverDeck } from '@/lib/discover'
import { toast } from 'sonner'
import { Heart, Loader2 } from 'lucide-react'

interface SwipeStackProps {
  profiles: DiscoverProfile[]
  currentUserId: string
}

/** Fetch the next page when this few cards are left, so the deck never visibly runs dry. */
const REFILL_AT = 5

export function SwipeStack({ profiles, currentUserId }: SwipeStackProps) {
  const [stack, setStack] = useState(profiles)
  const [matchedProfile, setMatchedProfile] = useState<Profile | null>(null)
  const [showMatchModal, setShowMatchModal] = useState(false)
  const [refilling, setRefilling] = useState(false)
  // True once the server returns an empty page: there really is nobody left.
  const [exhausted, setExhausted] = useState(profiles.length === 0)

  // Every id this session has shown, swiped or not. Sent as the exclusion
  // list so a refill can't hand back a card whose swipe is still in flight.
  const seenRef = useRef<Set<string>>(new Set(profiles.map((p) => p.id)))
  const refillingRef = useRef(false)

  const refill = useCallback(async () => {
    if (refillingRef.current) return
    refillingRef.current = true
    setRefilling(true)
    try {
      const next = await fetchDiscoverDeck(createClient(), currentUserId, [...seenRef.current])
      const fresh = next.filter((p) => !seenRef.current.has(p.id))
      fresh.forEach((p) => seenRef.current.add(p.id))
      if (fresh.length === 0) setExhausted(true)
      setStack((prev) => [...prev, ...fresh])
    } finally {
      refillingRef.current = false
      setRefilling(false)
    }
  }, [currentUserId])

  useEffect(() => {
    if (!exhausted && stack.length <= REFILL_AT) void refill()
  }, [stack.length, exhausted, refill])

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
      // up by that exact pair.
      const [user1, user2] =
        currentUserId < profile.id ? [currentUserId, profile.id] : [profile.id, currentUserId]

      const { data: match } = await supabase
        .from('matches')
        .select('id')
        .eq('user1_id', user1)
        .eq('user2_id', user2)
        .maybeSingle() // maybeSingle: "no match yet" is the normal case, not an error

      if (match) {
        setMatchedProfile(profile)
        setShowMatchModal(true)
      }
    },
    [currentUserId],
  )

  if (stack.length === 0) {
    if (refilling) {
      return (
        <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )
    }
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center animate-fade-in">
        <div className="w-24 h-24 rounded-full love-gradient flex items-center justify-center mb-6 animate-float">
          <Heart className="h-12 w-12 text-primary-foreground" />
        </div>
        <h2 className="text-2xl font-serif font-bold mb-2">No more profiles</h2>
        <p className="text-muted-foreground max-w-sm">
          {"You've seen everyone who fits your preferences for now. Check back later, or widen your age range in your profile."}
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
