'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Phone, Video } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { notifyCallee, randomId } from '@/lib/calls'
import { toast } from 'sonner'

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

    // getUserMedia only exists in a secure context (HTTPS or localhost).
    // Opening the app at http://192.168.x.x on a phone hides it entirely,
    // which used to surface as a baffling "permission denied".
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      toast.error('Calls need a secure (https://) connection. Open Spark from its https address.')
      setStarting(false)
      return
    }

    // Ask for mic/camera permission BEFORE creating the call row, so we don't
    // ring the other person only to fail on a denied permission prompt.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: kind === 'video',
      })
      // Release the devices immediately; LiveKit acquires its own.
      stream.getTracks().forEach((t) => t.stop())
    } catch (err) {
      const name = (err as DOMException)?.name
      toast.error(
        name === 'NotFoundError'
          ? kind === 'video'
            ? 'No camera or microphone found on this device'
            : 'No microphone found on this device'
          : name === 'NotReadableError'
            ? 'Your camera or microphone is being used by another app'
            : kind === 'video'
              ? 'Camera and microphone access is needed for video calls'
              : 'Microphone access is needed for voice calls',
      )
      setStarting(false)
      return
    }

    const supabase = createClient()
    const { data, error } = await supabase
      .from('calls')
      .insert({
        match_id: matchId,
        caller_id: currentUserId,
        callee_id: otherUserId,
        kind,
        room_name: `call_${randomId()}`,
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

    // Rings their phone even if Spark is closed or in the background.
    notifyCallee(data.id)
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
