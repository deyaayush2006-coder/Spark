'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  LiveKitRoom,
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  ControlBar,
  useTracks,
  useRoomContext,
} from '@livekit/components-react'
import { Track, RoomEvent } from 'livekit-client'
import '@livekit/components-styles'
import { Loader2, PhoneOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Profile } from '@/lib/types'

interface CallRoomProps {
  callId: string
  matchId: string
  kind: 'audio' | 'video'
  otherUser: Pick<Profile, 'id' | 'name' | 'photos'>
  /** True when this user pressed the call button (so we show "Ringing…"). */
  isCaller: boolean
}

export function CallRoom({ callId, matchId, kind, otherUser, isCaller }: CallRoomProps) {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [serverUrl, setServerUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Fetch a LiveKit token for this specific call.
  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        const res = await fetch('/api/livekit-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callId }),
        })
        const data = await res.json()
        if (cancelled) return
        if (!res.ok) {
          setError(data.error ?? 'Could not join the call')
          return
        }
        setToken(data.token)
        setServerUrl(data.serverUrl)
      } catch {
        if (!cancelled) setError('Network error while joining the call')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [callId])

  // Mark the call ended in the database, then go back to the chat.
  const endCall = useCallback(
    async (status: 'ended' | 'declined' = 'ended') => {
      const supabase = createClient()
      await supabase.from('calls').update({ status }).eq('id', callId)
      router.replace(`/matches/${matchId}`)
    },
    [callId, matchId, router],
  )

  // If the *other* side hangs up, declines, or answers, react to it.
  //
  // Realtime is the fast path, but the same mobile problem as the incoming
  // call listener applies here: a phone that switches network or sleeps for a
  // moment drops the websocket, and the UPDATE event is then lost forever —
  // leaving this side stuck on "Ringing…" after the other person hung up. So
  // the status is also polled.
  useEffect(() => {
    const supabase = createClient()
    let left = false

    const handle = (status: string) => {
      if (left) return
      if (status === 'declined') {
        left = true
        toast.info(`${otherUser.name} declined the call`)
        router.replace(`/matches/${matchId}`)
      } else if (status === 'ended' || status === 'missed') {
        left = true
        router.replace(`/matches/${matchId}`)
      }
    }

    const channel = supabase
      .channel(`call:${callId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'calls', filter: `id=eq.${callId}` },
        (payload) => handle((payload.new as { status: string }).status),
      )
      .subscribe()

    const poll = setInterval(async () => {
      if (left || document.hidden) return
      const { data } = await supabase.from('calls').select('status').eq('id', callId).maybeSingle()
      if (data) handle(data.status)
    }, 3_000)

    return () => {
      left = true
      clearInterval(poll)
      supabase.removeChannel(channel)
    }
  }, [callId, matchId, otherUser.name, router])

  // Caller gives up after 45 seconds of nobody answering.
  useEffect(() => {
    if (!isCaller) return
    const timer = setTimeout(async () => {
      const supabase = createClient()
      const { data } = await supabase.from('calls').select('status').eq('id', callId).single()
      if (data?.status === 'ringing') {
        await supabase.from('calls').update({ status: 'missed' }).eq('id', callId)
        toast.info('No answer')
        router.replace(`/matches/${matchId}`)
      }
    }, 45_000)
    return () => clearTimeout(timer)
  }, [isCaller, callId, matchId, router])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 p-8 text-center">
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={() => router.replace(`/matches/${matchId}`)}>Back to chat</Button>
      </div>
    )
  }

  if (!token || !serverUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Connecting…</p>
      </div>
    )
  }

  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect
      video={kind === 'video'}
      audio
      onDisconnected={() => endCall('ended')}
      onError={(e: Error) => setError(e.message)}
      data-lk-theme="default"
      className="h-screen"
    >
      <CallStage kind={kind} otherUser={otherUser} onHangUp={() => endCall('ended')} />
      <RoomAudioRenderer />
    </LiveKitRoom>
  )
}

/**
 * Inner stage. Split out because these hooks must run inside <LiveKitRoom>,
 * which is what provides the room context.
 */
function CallStage({
  kind,
  otherUser,
  onHangUp,
}: {
  kind: 'audio' | 'video'
  otherUser: Pick<Profile, 'id' | 'name' | 'photos'>
  onHangUp: () => void
}) {
  const room = useRoomContext()
  const [otherJoined, setOtherJoined] = useState(false)

  useEffect(() => {
    const sync = () => setOtherJoined(room.remoteParticipants.size > 0)
    sync()
    room.on(RoomEvent.ParticipantConnected, sync)
    room.on(RoomEvent.ParticipantDisconnected, sync)
    return () => {
      room.off(RoomEvent.ParticipantConnected, sync)
      room.off(RoomEvent.ParticipantDisconnected, sync)
    }
  }, [room])

  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  )

  const photo = otherUser.photos?.[0]

  // Audio call, or video call where the other person hasn't joined yet:
  // show a calling screen rather than an empty black grid.
  if (kind === 'audio' || !otherJoined) {
    return (
      <div className="flex flex-col h-screen bg-background">
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <Avatar className="w-32 h-32 animate-float">
            {photo && <AvatarImage src={photo} alt="" />}
            <AvatarFallback className="love-gradient text-primary-foreground text-4xl">
              {otherUser.name?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="text-center">
            <h1 className="text-2xl font-serif font-bold">{otherUser.name}</h1>
            <p className="text-muted-foreground">
              {otherJoined ? `${kind === 'audio' ? 'Voice' : 'Video'} call connected` : 'Ringing…'}
            </p>
          </div>
        </div>

        <div className="p-6 flex flex-col items-center gap-4">
          <ControlBar
            variation="minimal"
            controls={{
              microphone: true,
              camera: kind === 'video',
              screenShare: false,
              chat: false,
              leave: false,
            }}
          />
          <Button
            size="lg"
            variant="destructive"
            className="rounded-full w-16 h-16"
            onClick={onHangUp}
            aria-label="End call"
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-black">
      <GridLayout tracks={tracks} className="flex-1">
        <ParticipantTile />
      </GridLayout>
      <div className="p-4 flex items-center justify-center gap-4 bg-background">
        <ControlBar
          variation="minimal"
          controls={{ microphone: true, camera: true, screenShare: false, chat: false, leave: false }}
        />
        <Button
          size="lg"
          variant="destructive"
          className="rounded-full w-14 h-14"
          onClick={onHangUp}
          aria-label="End call"
        >
          <PhoneOff className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}
