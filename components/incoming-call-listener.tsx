'use client'

import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Phone, PhoneOff, Video } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'

interface IncomingCall {
  id: string
  match_id: string
  caller_id: string
  kind: 'audio' | 'video'
  callerName: string
  callerPhoto: string | null
}

interface CallRow {
  id: string
  match_id: string
  caller_id: string
  kind: 'audio' | 'video'
  status: string
}

/**
 * A call that started more than this long ago is stale — the caller's own 45s
 * timeout has already fired. Stops an old row from ringing on a page load.
 */
const RING_WINDOW_MS = 60_000

/** How often the polling fallback asks the database "is anyone calling me?". */
const POLL_MS = 3_000

/**
 * Mounted once in the app layout. Rings when a `calls` row appears with this
 * user as the callee.
 *
 * Two independent paths feed the same handler:
 *
 *  1. Supabase Realtime INSERT on `calls` — instant, but only when the
 *     websocket is actually up and `calls` is in the `supabase_realtime`
 *     publication (see database/005).
 *  2. A 3s poll of the same query — slower, but it works when realtime does
 *     not. This is not belt-and-braces paranoia: mobile browsers suspend
 *     websockets whenever you switch apps, lock the screen, or move between
 *     wifi and mobile data, and a missed INSERT event is missed forever.
 *     Phone-to-phone calling is silently dead without it.
 *
 * We also re-check the moment the tab becomes visible again or the network
 * comes back, so returning to the app rings immediately rather than after the
 * next poll tick.
 *
 * Note: this only rings while the app is open. Ringing a closed app needs Web
 * Push — a separate, much bigger feature.
 */
export function IncomingCallListener({ currentUserId }: { currentUserId: string }) {
  const router = useRouter()
  const [call, setCall] = useState<IncomingCall | null>(null)
  const ringtone = useRingtone()

  // One client for the lifetime of the component. The old code called
  // createClient() in every handler, which opened a fresh realtime connection
  // each time.
  const supabase = useMemo(() => createClient(), [])

  // Calls already shown, answered, declined, or seen finish. Without this the
  // poll would re-open a modal the user just dismissed.
  const handledRef = useRef<Set<string>>(new Set())
  const callRef = useRef<IncomingCall | null>(null)

  useEffect(() => {
    callRef.current = call
  }, [call])

  const ring = useCallback(
    async (row: CallRow) => {
      if (row.status !== 'ringing') return
      if (handledRef.current.has(row.id)) return
      // Already ringing for someone else — don't stack modals.
      if (callRef.current) return
      handledRef.current.add(row.id)

      const { data: caller } = await supabase
        .from('profiles')
        .select('name, photos')
        .eq('id', row.caller_id)
        .single()

      setCall({
        id: row.id,
        match_id: row.match_id,
        caller_id: row.caller_id,
        kind: row.kind,
        callerName: caller?.name ?? 'Someone',
        callerPhoto: caller?.photos?.[0] ?? null,
      })
    },
    [supabase],
  )

  /**
   * Ask the database directly. Runs on mount, on every poll tick, whenever the
   * tab wakes up, and right after the realtime channel subscribes — an INSERT
   * that lands during the websocket handshake produces no event.
   */
  const sync = useCallback(async () => {
    const active = callRef.current

    if (active) {
      // Already ringing: the only thing worth checking is whether the caller
      // gave up, so we can close the modal.
      const { data } = await supabase
        .from('calls')
        .select('status')
        .eq('id', active.id)
        .maybeSingle()
      if (data && data.status !== 'ringing') setCall(null)
      return
    }

    const { data, error } = await supabase
      .from('calls')
      .select('id, match_id, caller_id, kind, status')
      .eq('callee_id', currentUserId)
      .eq('status', 'ringing')
      .gt('created_at', new Date(Date.now() - RING_WINDOW_MS).toISOString())
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) {
      console.warn('[calls] could not check for incoming calls:', error.message)
      return
    }

    const row = data?.[0] as CallRow | undefined
    if (row) void ring(row)
  }, [supabase, currentUserId, ring])

  useEffect(() => {
    void sync()

    const channel = supabase
      .channel(`incoming-calls:${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'calls',
          filter: `callee_id=eq.${currentUserId}`,
        },
        (payload) => void ring(payload.new as CallRow),
      )
      // If the caller hangs up before we answer, dismiss the modal.
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'calls',
          filter: `callee_id=eq.${currentUserId}`,
        },
        (payload) => {
          const row = payload.new as { id: string; status: string }
          if (row.status !== 'ringing') {
            handledRef.current.add(row.id)
            setCall((current) => (current?.id === row.id ? null : current))
          }
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          void sync()
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          // Almost always means `calls` is missing from the supabase_realtime
          // publication — run database/005_calls_blocks_reports.sql. Ringing
          // still works via the poll above, just up to POLL_MS later.
          console.warn(
            `[calls] realtime channel ${status}; falling back to polling. ` +
              'Check that public.calls is in the supabase_realtime publication.',
          )
        }
      })

    const interval = setInterval(() => {
      if (!document.hidden) void sync()
    }, POLL_MS)

    const onWake = () => {
      if (!document.hidden) void sync()
    }
    document.addEventListener('visibilitychange', onWake)
    window.addEventListener('focus', onWake)
    window.addEventListener('online', onWake)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onWake)
      window.removeEventListener('focus', onWake)
      window.removeEventListener('online', onWake)
      supabase.removeChannel(channel)
    }
  }, [supabase, currentUserId, ring, sync])

  // Ringtone. Browsers block audio until the user has interacted with the
  // page, so this is best-effort — the visual modal is the real notification.
  useEffect(() => {
    if (!call) {
      ringtone.stop()
      return
    }
    ringtone.start()
    return () => ringtone.stop()
  }, [call, ringtone])

  const accept = async () => {
    if (!call) return
    await supabase.from('calls').update({ status: 'accepted' }).eq('id', call.id)
    const target = `/matches/${call.match_id}/call/${call.id}`
    setCall(null)
    router.push(target)
  }

  const decline = async () => {
    if (!call) return
    await supabase.from('calls').update({ status: 'declined' }).eq('id', call.id)
    setCall(null)
  }

  return (
    <>

      <Dialog open={!!call} onOpenChange={(open) => !open && decline()}>
        <DialogContent className="sm:max-w-sm text-center">
          <DialogTitle className="sr-only">Incoming call</DialogTitle>
          {call && (
            <div className="flex flex-col items-center gap-6 py-4">
              <Avatar className="w-24 h-24 animate-heartbeat">
                {call.callerPhoto && <AvatarImage src={call.callerPhoto} alt="" />}
                <AvatarFallback className="love-gradient text-primary-foreground text-3xl">
                  {call.callerName[0]}
                </AvatarFallback>
              </Avatar>

              <div>
                <h2 className="text-xl font-serif font-bold">{call.callerName}</h2>
                <p className="text-muted-foreground flex items-center justify-center gap-1.5 text-sm">
                  {call.kind === 'video' ? <Video className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
                  Incoming {call.kind === 'video' ? 'video' : 'voice'} call
                </p>
              </div>

              <div className="flex items-center gap-8">
                <Button
                  size="lg"
                  variant="destructive"
                  className="rounded-full w-14 h-14"
                  onClick={decline}
                  aria-label="Decline"
                >
                  <PhoneOff className="h-5 w-5" />
                </Button>
                <Button
                  size="lg"
                  className="rounded-full w-14 h-14 bg-green-600 hover:bg-green-700 text-white"
                  onClick={accept}
                  aria-label="Accept"
                >
                  {call.kind === 'video' ? <Video className="h-5 w-5" /> : <Phone className="h-5 w-5" />}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

/**
 * Generates the classic two-tone ring pattern with the Web Audio API, and
 * vibrates on phones that support it.
 *
 * The previous version pointed an <audio> tag at /ringtone.mp3, which does not
 * exist in public/ — so every incoming call 404'd and rang silently. Synthesising
 * the tone means there is no asset to ship, no file to 404, and no licensing
 * question about a downloaded ringtone.
 */
function useRingtone() {
  const ctxRef = useRef<AudioContext | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  return useMemo(() => {
    // Mobile Safari has no Vibration API at all, and Chrome on Android needs a
    // prior interaction with the page. Best-effort either way.
    const buzz = (pattern: number | number[]) => {
      try {
        navigator.vibrate?.(pattern)
      } catch {
        // ignore
      }
    }

    const burst = () => {
      buzz([400, 200, 400])
      const ctx = ctxRef.current
      if (!ctx) return
      // Two 0.4s tones (440Hz then 480Hz), the North American ring cadence.
      ;[0, 0.45].forEach((offset) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.value = offset === 0 ? 440 : 480
        const t = ctx.currentTime + offset
        // Ramp in and out: a hard start/stop on a sine wave clicks audibly.
        gain.gain.setValueAtTime(0, t)
        gain.gain.linearRampToValueAtTime(0.18, t + 0.03)
        gain.gain.setValueAtTime(0.18, t + 0.37)
        gain.gain.linearRampToValueAtTime(0, t + 0.4)
        osc.connect(gain).connect(ctx.destination)
        osc.start(t)
        osc.stop(t + 0.42)
      })
    }

    return {
      start() {
        if (timerRef.current) return
        try {
          if (!ctxRef.current) {
            const Ctor =
              window.AudioContext ??
              (window as unknown as { webkitAudioContext?: typeof AudioContext })
                .webkitAudioContext
            if (!Ctor) return
            ctxRef.current = new Ctor()
          }
          // Autoplay policy: suspended until the user has interacted with the
          // page. resume() is a no-op promise rejection we can safely ignore.
          void ctxRef.current.resume().catch(() => {})
          burst()
          timerRef.current = setInterval(burst, 3000)
        } catch {
          // No audio available — the modal is still shown.
        }
      },
      stop() {
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }
        buzz(0)
      },
    }
  }, [])
}
