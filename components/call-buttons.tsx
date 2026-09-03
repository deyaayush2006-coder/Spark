'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Phone, Video } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

/**
 * Room ids must be unguessable. Prefer the platform RNG, but fall back to
 * getRandomValues so this also works outside a secure context.
 */
function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

interface CallButtonsProps {
  matchId: string
  currentUserId: string
  otherUserId: string
  /** Bots can't answer a phone. */
  disabled?: boolean
}

export function CallButtons({ matchId, currentUserId, otherUserId, disabled }: CallButtonsProps) {
  const router = useRouter()
  const [starting, setStarting] = useState(false)

  const startCall = async (kind: 'audio' | 'video') => {
    if (starting || disabled) return
    setStarting(true)

    const supabase = createClient()

    // Ask for mic/camera permission BEFORE creating the call row, so we don't
    // ring the other person only to fail on a denied permission prompt.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: kind === 'video',
      })
      // Release the devices immediately; LiveKit acquires its own.
      stream.getTracks().forEach((t) => t.stop())
    } catch {
      toast.error(
        kind === 'video'
          ? 'Camera and microphone access is needed for video calls'
          : 'Microphone access is needed for voice calls',
      )
      setStarting(false)
      return
    }

    // crypto.randomUUID() only exists in a "secure context" — HTTPS, or
    // localhost. If you test on a phone over http://192.168.x.x it is
    // undefined and this would throw. (Note that getUserMedia above has the
    // same restriction, so plain-HTTP LAN testing can't do calls at all —
    // use a tunnel like `npx localtunnel` or deploy to Vercel.)
    const roomName = `call_${randomId()}`

    const { data, error } = await supabase
      .from('calls')
      .insert({
        match_id: matchId,
        caller_id: currentUserId,
        callee_id: otherUserId,
        kind,
        room_name: roomName,
      })
      .select('id')
      .single()

    if (error || !data) {
      // The RLS policy refuses inserts for unmatched or blocked pairs, so this
      // is the expected path when the other person has blocked you.
      toast.error('Could not start the call')
      setStarting(false)
      return
    }

    router.push(`/matches/${matchId}/call/${data.id}`)
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => startCall('audio')}
        disabled={disabled || starting}
        aria-label="Start voice call"
      >
        <Phone className="h-5 w-5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => startCall('video')}
        disabled={disabled || starting}
        aria-label="Start video call"
      >
        <Video className="h-5 w-5" />
      </Button>
    </div>
  )
}
