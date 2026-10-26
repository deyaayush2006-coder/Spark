'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoTrack,
  useTracks,
  useRoomContext,
  useRemoteParticipants,
  useLocalParticipant,
  useConnectionState,
  useConnectionQualityIndicator,
  useStartAudio,
} from '@livekit/components-react'
import {
  Track,
  ConnectionState,
  ConnectionQuality,
  DisconnectReason,
  VideoPresets,
  type LocalVideoTrack,
  type Participant,
  type RoomOptions,
} from 'livekit-client'
import {
  Loader2,
  Mic,
  MicOff,
  PhoneOff,
  RefreshCw,
  SwitchCamera,
  Video,
  VideoOff,
  Volume2,
  WifiOff,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/client'
import { RING_TIMEOUT_MS, beaconCallStatus, formatDuration, notifyCallee } from '@/lib/calls'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Profile } from '@/lib/types'

type OtherUser = Pick<Profile, 'id' | 'name' | 'photos'>

interface CallRoomProps {
  callId: string
  matchId: string
  kind: 'audio' | 'video'
  otherUser: OtherUser
  /** True when this user pressed the call button. */
  isCaller: boolean
  /** Status when the page rendered (the callee's is already 'accepted'). */
  initialStatus: string
}

/**
 * Media settings. The defaults LiveKitRoom used before sent one fixed-quality
 * video stream no matter how bad the other person's connection was, which is
 * what made calls over mobile data freeze and stutter.
 *
 *  - simulcast: publish 180p/360p/720p copies at once; the server forwards
 *    whichever one the receiver's connection can take, and switches as it
 *    changes.
 *  - adaptiveStream: only receive the resolution the screen actually shows.
 *  - dynacast: stop encoding layers nobody is watching (saves the sender's
 *    CPU, battery and upload).
 *  - red + dtx: redundant audio packets survive packet loss on bad networks;
 *    silence isn't transmitted at all.
 *  - echo cancellation / noise suppression / auto gain on the microphone.
 */
const ROOM_OPTIONS: RoomOptions = {
  adaptiveStream: true,
  dynacast: true,
  disconnectOnPageLeave: true,
  videoCaptureDefaults: {
    resolution: VideoPresets.h720.resolution,
    facingMode: 'user',
  },
  audioCaptureDefaults: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
  publishDefaults: {
    simulcast: true,
    videoSimulcastLayers: [VideoPresets.h180, VideoPresets.h360],
    red: true,
    dtx: true,
  },
}

/** How long to wait for the other person to come back after their connection drops. */
const REMOTE_GRACE_MS = 20_000

/** Mount counts per call, so React StrictMode's dev double-mount isn't mistaken for leaving. */
const mountedCalls = new Map<string, number>()

function friendlyError(message: string): string {
  const m = message.toLowerCase()
  if (
    [
      'pc connection',
      'ice connection',
      'ice candidate',
      'could not connect',
      'signal',
      'region',
      'failed to fetch',
      'timeout',
      'websocket',
    ].some((s) => m.includes(s))
  ) {
    return 'Couldn’t connect the call. The network you’re on may be blocking calls — try switching between Wi‑Fi and mobile data, then retry.'
  }
  if (m.includes('permission') || m.includes('notallowed')) {
    return 'Spark needs camera/microphone permission. Allow it in your browser’s site settings, then retry.'
  }
  return message
}

export function CallRoom({ callId, matchId, kind, otherUser, isCaller, initialStatus }: CallRoomProps) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const chatUrl = `/matches/${matchId}`

  const [connection, setConnection] = useState<{ token: string; serverUrl: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dropped, setDropped] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [status, setStatus] = useState(initialStatus)

  const leftRef = useRef(false)
  // Whether this attempt ever reached the media server. A failure before
  // that is "couldn't connect", not "your connection dropped".
  const connectedRef = useRef(false)
  const statusRef = useRef(initialStatus)
  useEffect(() => {
    statusRef.current = status
  }, [status])

  /** Leave the call screen without touching the database (the other side ended it). */
  const leave = useCallback(
    (message?: string) => {
      if (leftRef.current) return
      leftRef.current = true
      if (message) toast.info(message)
      router.replace(chatUrl)
    },
    [router, chatUrl],
  )

  /**
   * Hang up. Before an answer that's a cancelled call — 'missed' for the
   * other person, who gets a missed-call notification — afterwards 'ended'.
   */
  const hangUp = useCallback(
    async (message?: string, opts?: { onlyIfUnanswered?: boolean }) => {
      if (leftRef.current) return
      leftRef.current = true
      const unanswered = isCaller && statusRef.current === 'ringing'

      const { data } = await supabase
        .from('calls')
        .update({ status: unanswered ? 'missed' : 'ended' })
        .eq('id', callId)
        .select('status')
        .maybeSingle()

      // They answered in the same instant we cancelled. The database kept
      // the call alive (an answered call can't become 'missed').
      if (data?.status === 'accepted') {
        if (opts?.onlyIfUnanswered) {
          // The ring timer lost the race to an answer: stay on the call.
          leftRef.current = false
          setStatus('accepted')
          return
        }
        await supabase.from('calls').update({ status: 'ended' }).eq('id', callId)
      } else if (data?.status === 'missed') {
        notifyCallee(callId)
      }

      if (message) toast.info(message)
      router.replace(chatUrl)
    },
    [supabase, callId, isCaller, router, chatUrl],
  )

  // Fetch a LiveKit token. Re-runs on "Rejoin".
  useEffect(() => {
    let cancelled = false
    setConnection(null)
    setError(null)

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
        if (data.warning) console.warn(`[livekit] ${data.warning}`)
        setConnection({ token: data.token, serverUrl: data.serverUrl })
      } catch {
        if (!cancelled) setError('Network error while joining the call')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [callId, attempt])

  // Follow the call's status: answered, declined, hung up, missed.
  //
  // Realtime is the fast path. It is also polled, because a phone that
  // switches network or sleeps for a moment drops the websocket and the
  // UPDATE event is then lost forever.
  useEffect(() => {
    const handle = (next: string) => {
      if (leftRef.current) return
      setStatus(next)
      if (next === 'declined') {
        leave(`${otherUser.name} declined the call`)
      } else if (next === 'missed') {
        leave(isCaller ? 'No answer' : undefined)
      } else if (next === 'ended') {
        leave('Call ended')
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

    const check = async () => {
      if (leftRef.current || document.hidden) return
      const { data } = await supabase.from('calls').select('status').eq('id', callId).maybeSingle()
      if (data) handle(data.status)
    }
    const poll = setInterval(check, 3_000)
    document.addEventListener('visibilitychange', check)

    return () => {
      clearInterval(poll)
      document.removeEventListener('visibilitychange', check)
      supabase.removeChannel(channel)
    }
  }, [supabase, callId, isCaller, otherUser.name, leave])

  // Caller gives up after RING_TIMEOUT_MS of nobody answering.
  useEffect(() => {
    if (!isCaller) return
    const timer = setTimeout(() => {
      if (statusRef.current === 'ringing') void hangUp('No answer', { onlyIfUnanswered: true })
    }, RING_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [isCaller, hangUp])

  // Closing the tab or swiping the app away ends the call instead of leaving
  // the other person talking to nobody. sendBeacon survives the page dying.
  useEffect(() => {
    const onPageHide = () => {
      if (leftRef.current) return
      leftRef.current = true
      beaconCallStatus(callId, isCaller && statusRef.current === 'ringing' ? 'missed' : 'ended')
    }
    window.addEventListener('pagehide', onPageHide)
    return () => window.removeEventListener('pagehide', onPageHide)
  }, [callId, isCaller])

  // Leaving this screen inside the app (back button, bottom of a history
  // stack) also ends the call. Deferred and mount-counted so React's
  // development-only double mount doesn't end every call instantly.
  useEffect(() => {
    mountedCalls.set(callId, (mountedCalls.get(callId) ?? 0) + 1)
    return () => {
      mountedCalls.set(callId, (mountedCalls.get(callId) ?? 1) - 1)
      setTimeout(() => {
        if ((mountedCalls.get(callId) ?? 0) > 0 || leftRef.current) return
        leftRef.current = true
        beaconCallStatus(callId, isCaller && statusRef.current === 'ringing' ? 'missed' : 'ended')
      }, 300)
    }
  }, [callId, isCaller])

  const onDisconnected = useCallback(
    async (reason?: DisconnectReason) => {
      if (leftRef.current || reason === DisconnectReason.CLIENT_INITIATED) return
      if (!connectedRef.current) {
        setError('Could not connect to the call server')
        return
      }
      if (reason === DisconnectReason.DUPLICATE_IDENTITY) {
        leave('You joined this call on another device')
        return
      }
      // Before offering "Rejoin", make sure the call still exists.
      const { data } = await supabase.from('calls').select('status').eq('id', callId).maybeSingle()
      if (!data || !['ringing', 'accepted'].includes(data.status)) {
        leave('Call ended')
        return
      }
      setDropped(true)
    },
    [supabase, callId, leave],
  )

  const rejoin = () => {
    connectedRef.current = false
    setDropped(false)
    setAttempt((a) => a + 1)
  }

  if (error || dropped) {
    return (
      <FullScreen>
        <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
          <CallAvatar user={otherUser} size="md" />
          <div className="space-y-2">
            <WifiOff className="mx-auto h-6 w-6 text-white/70" />
            <p className="max-w-sm text-white/80">
              {error ? friendlyError(error) : 'Your connection dropped.'}
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => hangUp()}>
              Leave
            </Button>
            <Button onClick={rejoin} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              {error ? 'Retry' : 'Rejoin'}
            </Button>
          </div>
        </div>
      </FullScreen>
    )
  }

  if (!connection) {
    return (
      <FullScreen>
        <div className="flex flex-1 flex-col items-center justify-center gap-6">
          <CallAvatar user={otherUser} size="lg" />
          <div className="flex items-center gap-2 text-white/70">
            <Loader2 className="h-4 w-4 animate-spin" />
            Connecting…
          </div>
        </div>
      </FullScreen>
    )
  }

  return (
    <LiveKitRoom
      key={attempt}
      token={connection.token}
      serverUrl={connection.serverUrl}
      connect
      options={ROOM_OPTIONS}
      video={kind === 'video'}
      audio
      onConnected={() => {
        connectedRef.current = true
      }}
      onDisconnected={onDisconnected}
      onError={(e: Error) => setError(e.message)}
      onMediaDeviceFailure={() =>
        toast.error(
          kind === 'video'
            ? 'Couldn’t start your camera or microphone. Another app may be using it.'
            : 'Couldn’t start your microphone. Another app may be using it.',
        )
      }
      className="contents"
    >
      <CallStage
        kind={kind}
        otherUser={otherUser}
        status={status}
        isCaller={isCaller}
        onHangUp={() => hangUp()}
        onRemoteGone={() => hangUp('Call ended')}
      />
      <RoomAudioRenderer />
    </LiveKitRoom>
  )
}

function FullScreen({ children, className }: { children: React.ReactNode; className?: string }) {
  // fixed + 100dvh: covers the app chrome on every screen size, and unlike
  // h-screen (100vh) it doesn't hide the controls under a phone's URL bar.
  return (
    <div className={cn('fixed inset-0 z-50 flex h-[100dvh] flex-col overflow-hidden bg-neutral-950 text-white', className)}>
      {children}
    </div>
  )
}

function CallAvatar({ user, size }: { user: OtherUser; size: 'md' | 'lg' }) {
  const photo = user.photos?.[0]
  return (
    <Avatar className={cn(size === 'lg' ? 'h-32 w-32' : 'h-24 w-24', 'border-4 border-white/20 shadow-2xl')}>
      {photo && <AvatarImage src={photo} alt="" />}
      <AvatarFallback className="love-gradient text-primary-foreground text-4xl">{user.name?.[0]}</AvatarFallback>
    </Avatar>
  )
}

/**
 * Everything inside the connected room. Split out because these hooks must
 * run inside <LiveKitRoom>, which provides the room context.
 */
function CallStage({
  kind,
  otherUser,
  status,
  isCaller,
  onHangUp,
  onRemoteGone,
}: {
  kind: 'audio' | 'video'
  otherUser: OtherUser
  status: string
  isCaller: boolean
  onHangUp: () => void
  onRemoteGone: () => void
}) {
  const room = useRoomContext()
  const connectionState = useConnectionState()
  const remotes = useRemoteParticipants()
  const remote = remotes[0]
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant()
  const { quality: myQuality } = useConnectionQualityIndicator({ participant: localParticipant })
  const { mergedProps: startAudioProps, canPlayAudio } = useStartAudio({ room, props: {} })

  const cameraTracks = useTracks([Track.Source.Camera], { onlySubscribed: true })
  const localCam = cameraTracks.find((t) => t.participant.isLocal)
  const remoteCam = cameraTracks.find((t) => !t.participant.isLocal)
  const remoteCamOn = !!remoteCam && !remoteCam.publication.isMuted

  const [connectedAt, setConnectedAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [swapped, setSwapped] = useState(false)
  const [facing, setFacing] = useState<'user' | 'environment'>('user')
  const [canFlip, setCanFlip] = useState(false)

  // Call timer starts when the other person actually arrives.
  useEffect(() => {
    if (remote && connectedAt === null) setConnectedAt(Date.now())
  }, [remote, connectedAt])

  useEffect(() => {
    if (connectedAt === null) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [connectedAt])

  // If the other person vanishes mid-call (their app was killed, their phone
  // died) and doesn't come back, end the call rather than sit here forever.
  // LiveKit already rides out short blips on both sides before this fires.
  // Held in a ref: the parent passes a new function every render, and the
  // timer below must not restart each time the call clock ticks.
  const onRemoteGoneRef = useRef(onRemoteGone)
  useEffect(() => {
    onRemoteGoneRef.current = onRemoteGone
  })
  useEffect(() => {
    if (connectedAt === null || remote) return
    const t = setTimeout(() => onRemoteGoneRef.current(), REMOTE_GRACE_MS)
    return () => clearTimeout(t)
  }, [connectedAt, remote])

  // Only offer "flip camera" on devices that have more than one camera.
  useEffect(() => {
    if (kind !== 'video') return
    navigator.mediaDevices
      ?.enumerateDevices()
      .then((devices) => setCanFlip(devices.filter((d) => d.kind === 'videoinput').length > 1))
      .catch(() => {})
  }, [kind, isCameraEnabled])

  const flipCamera = async () => {
    const track = localParticipant.getTrackPublication(Track.Source.Camera)?.track as LocalVideoTrack | undefined
    if (!track) return
    const next = facing === 'user' ? 'environment' : 'user'
    try {
      await track.restartTrack({ facingMode: next, resolution: VideoPresets.h720.resolution })
      setFacing(next)
    } catch {
      toast.error('Couldn’t switch camera')
    }
  }

  const reconnecting =
    connectionState === ConnectionState.Reconnecting || connectionState === ConnectionState.SignalReconnecting

  const statusText = remote
    ? formatDuration(((connectedAt ? now - connectedAt : 0)) / 1000)
    : status === 'ringing'
      ? isCaller
        ? 'Ringing…'
        : 'Connecting…'
      : `Waiting for ${otherUser.name}…`

  const showVideo = kind === 'video'
  const bigIsLocal = showVideo && (swapped ? true : !remote)
  const bigTrack = bigIsLocal ? localCam : remoteCam
  const bigHasVideo = bigIsLocal ? isCameraEnabled && !!localCam : remoteCamOn
  const smallTrack = bigIsLocal ? remoteCam : localCam
  const smallHasVideo = bigIsLocal ? remoteCamOn : isCameraEnabled && !!localCam
  const mirror = (isLocal: boolean) => isLocal && facing === 'user'

  return (
    <FullScreen>
      {/* Main area */}
      <div className="relative flex-1">
        {showVideo && bigTrack && bigHasVideo ? (
          <VideoTrack
            trackRef={bigTrack}
            className={cn(
              'absolute inset-0 h-full w-full bg-black',
              // Fill the screen on phones; never crop someone's face on a laptop.
              'object-cover md:object-contain',
            )}
            style={mirror(bigIsLocal) ? { transform: 'scaleX(-1)' } : undefined}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            {otherUser.photos?.[0] && (
              <img
                src={otherUser.photos[0]}
                alt=""
                aria-hidden
                className="absolute inset-0 h-full w-full scale-110 object-cover opacity-30 blur-2xl"
              />
            )}
            <div className="relative flex flex-col items-center gap-4">
              <CallAvatar user={otherUser} size="lg" />
              {showVideo && remote && !remoteCamOn && (
                <p className="flex items-center gap-1.5 text-sm text-white/70">
                  <VideoOff className="h-4 w-4" /> Camera off
                </p>
              )}
            </div>
          </div>
        )}

        {/* Top bar: who, how long, how good the line is */}
        <div
          className="absolute inset-x-0 top-0 flex flex-col items-center gap-1 bg-gradient-to-b from-black/70 to-transparent px-4 pb-8 text-center"
          style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top))' }}
        >
          <h1 className="text-xl font-semibold drop-shadow">{otherUser.name}</h1>
          <p className="text-sm text-white/80 tabular-nums">{statusText}</p>
          {reconnecting && (
            <p className="mt-1 flex items-center gap-1.5 rounded-full bg-amber-500/90 px-3 py-1 text-xs font-medium text-black">
              <Loader2 className="h-3 w-3 animate-spin" /> Reconnecting…
            </p>
          )}
          {!reconnecting && myQuality === ConnectionQuality.Poor && (
            <p className="mt-1 rounded-full bg-black/60 px-3 py-1 text-xs text-white/90">Your connection is weak</p>
          )}
          {!reconnecting && remote && <RemoteQualityNote participant={remote} name={otherUser.name} />}
        </div>

        {/* Picture-in-picture: tap to swap */}
        {showVideo && remote && (
          <button
            type="button"
            onClick={() => setSwapped((s) => !s)}
            aria-label="Swap videos"
            className="absolute right-3 top-24 h-40 w-28 overflow-hidden rounded-2xl border border-white/20 bg-neutral-800 shadow-2xl md:h-36 md:w-56"
          >
            {smallTrack && smallHasVideo ? (
              <VideoTrack
                trackRef={smallTrack}
                className="h-full w-full object-cover"
                style={mirror(!bigIsLocal) ? { transform: 'scaleX(-1)' } : undefined}
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center">
                <VideoOff className="h-6 w-6 text-white/60" />
              </span>
            )}
          </button>
        )}

        {/* Mobile browsers block audio until a tap; surface a button if so. */}
        {!canPlayAudio && (
          <div className="absolute inset-x-0 bottom-4 flex justify-center">
            <button
              {...startAudioProps}
              style={undefined}
              className="flex items-center gap-2 rounded-full bg-white px-5 py-3 font-medium text-black shadow-xl"
            >
              <Volume2 className="h-5 w-5" /> Tap to turn on sound
            </button>
          </div>
        )}
      </div>

      {/* Controls */}
      <div
        className="flex items-center justify-center gap-5 bg-black/80 px-6 pt-4"
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
      >
        <ControlButton
          label={isMicrophoneEnabled ? 'Mute' : 'Unmute'}
          active={!isMicrophoneEnabled}
          onClick={() => void localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)}
        >
          {isMicrophoneEnabled ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
        </ControlButton>

        {showVideo && (
          <ControlButton
            label={isCameraEnabled ? 'Turn camera off' : 'Turn camera on'}
            active={!isCameraEnabled}
            onClick={() => void localParticipant.setCameraEnabled(!isCameraEnabled)}
          >
            {isCameraEnabled ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
          </ControlButton>
        )}

        {showVideo && canFlip && isCameraEnabled && (
          <ControlButton label="Switch camera" onClick={flipCamera}>
            <SwitchCamera className="h-6 w-6" />
          </ControlButton>
        )}

        <button
          type="button"
          onClick={onHangUp}
          aria-label="End call"
          className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition-transform hover:bg-red-700 active:scale-90"
        >
          <PhoneOff className="h-7 w-7" />
        </button>
      </div>
    </FullScreen>
  )
}

function RemoteQualityNote({ participant, name }: { participant: Participant; name: string }) {
  const { quality } = useConnectionQualityIndicator({ participant })
  if (quality !== ConnectionQuality.Poor && quality !== ConnectionQuality.Lost) return null
  return (
    <p className="mt-1 rounded-full bg-black/60 px-3 py-1 text-xs text-white/90">
      {name}’s connection is weak
    </p>
  )
}

function ControlButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string
  active?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        'flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform active:scale-90',
        active ? 'bg-white text-black' : 'bg-white/15 text-white hover:bg-white/25',
      )}
    >
      {children}
    </button>
  )
}
