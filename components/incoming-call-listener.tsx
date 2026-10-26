'use client'

import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Phone, PhoneOff, Video } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/client'
import { SW_INCOMING_CALL_EVENT } from '@/components/push-registrar'

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

/** Shape returned by the get_incoming_call() RPC in database/008. */
interface IncomingCallRpcRow {
  id: string
  match_id: string
  caller_id: string
  kind: 'audio' | 'video'
  caller_name: string | null
  caller_photo: string | null
}

/** Only used by the fallback path when database/008 hasn't been run. */
const RING_WINDOW_MS = 60_000

/** How often the polling fallback asks the database "is anyone calling me?". */
const POLL_MS = 3_000

/**
 * Mounted once in the app layout. Rings when someone calls this user.
 *
 * Four independent paths feed the same handler, because each one alone has
 * a way of failing on real phones:
 *
 *  1. Supabase Realtime INSERT on `calls` — instant, while the websocket is up.
 *  2. A 3s poll of get_incoming_call() — works when realtime doesn't. Mobile
 *     browsers drop websockets whenever you switch apps or networks, and a
 *     missed INSERT event is missed forever.
 *  3. An immediate re-check whenever the tab becomes visible, regains focus
 *     or comes back online — so returning to the app rings at once.
 *  4. A message from the service worker when a push arrives (public/sw.js).
 *
 * When Spark is closed or hidden, none of that can run; the push
 * notification from the service worker is what rings the phone then.
 *
 * Staleness ("is this call too old to ring?") is decided by the database
 * clock inside get_incoming_call(). It used to be the callee's own clock, so
 * a device running a minute fast silently ignored every call.
 */
export function IncomingCallListener({ currentUserId }: { currentUserId: string }) {
  const router = useRouter()
  const [call, setCall] = useState<IncomingCall | null>(null)
  const ringtone = useRingtone()

  // One client for the lifetime of the component.
  const supabase = useMemo(() => createClient(), [])

  // Calls already shown, answered, declined, or seen finish. Without this the
  // poll would re-open a screen the user just dismissed.
  const handledRef = useRef<Set<string>>(new Set())
  const callRef = useRef<IncomingCall | null>(null)
  const rpcMissingRef = useRef(false)

  useEffect(() => {
    callRef.current = call
  }, [call])

  const show = useCallback((next: IncomingCall) => {
    if (handledRef.current.has(next.id) || callRef.current) return
    handledRef.current.add(next.id)
    callRef.current = next
    setCall(next)
    if (document.hidden) void showLocalNotification(next)
  }, [])

  /** Realtime gives us a bare row; look up who is calling. */
  const ringFromRow = useCallback(
    async (row: CallRow) => {
      if (row.status !== 'ringing') return
      if (handledRef.current.has(row.id) || callRef.current) return

      const { data: caller } = await supabase
        .from('profiles')
        .select('name, photos')
        .eq('id', row.caller_id)
        .maybeSingle()

      show({
        id: row.id,
        match_id: row.match_id,
        caller_id: row.caller_id,
        kind: row.kind,
        callerName: caller?.name ?? 'Someone',
        callerPhoto: caller?.photos?.[0] ?? null,
      })
    },
    [supabase, show],
  )

  const sync = useCallback(async () => {
    const active = callRef.current

    if (active) {
      // Already ringing: the only thing worth checking is whether the caller
      // gave up, so we can close the screen.
      const { data } = await supabase.from('calls').select('status').eq('id', active.id).maybeSingle()
      if (data && data.status !== 'ringing') setCall(null)
      return
    }

    if (!rpcMissingRef.current) {
      const { data, error } = await supabase.rpc('get_incoming_call')
      if (!error) {
        const row = (data as IncomingCallRpcRow[] | null)?.[0]
        if (row) {
          show({
            id: row.id,
            match_id: row.match_id,
            caller_id: row.caller_id,
            kind: row.kind,
            callerName: row.caller_name ?? 'Someone',
            callerPhoto: row.caller_photo ?? null,
          })
        }
        return
      }
      // PGRST202: function not found. Keep calls working on a database that
      // hasn't had 008 applied, using the older client-clock query.
      if (error.code === 'PGRST202' || error.code === '42883') {
        rpcMissingRef.current = true
        console.warn(
          '[calls] get_incoming_call() is missing — run database/008_reliable_calls_and_push.sql. ' +
            'Falling back to a query that trusts this device’s clock.',
        )
      } else {
        console.warn('[calls] could not check for incoming calls:', error.message)
        return
      }
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
    if (row) void ringFromRow(row)
  }, [supabase, currentUserId, show, ringFromRow])

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
        (payload) => void ringFromRow(payload.new as CallRow),
      )
      // If the caller hangs up before we answer, dismiss the screen.
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
          // An INSERT that landed during the websocket handshake produced no
          // event; ask directly.
          void sync()
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
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
    window.addEventListener('pageshow', onWake)
    window.addEventListener(SW_INCOMING_CALL_EVENT, onWake)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onWake)
      window.removeEventListener('focus', onWake)
      window.removeEventListener('online', onWake)
      window.removeEventListener('pageshow', onWake)
      window.removeEventListener(SW_INCOMING_CALL_EVENT, onWake)
      supabase.removeChannel(channel)
    }
  }, [supabase, currentUserId, ringFromRow, sync])

  // Ring, vibrate, and flash the tab title while a call is waiting.
  useEffect(() => {
    if (!call) {
      ringtone.stop()
      return
    }
    ringtone.start()

    const original = document.title
    const alert = `📞 ${call.callerName} is calling…`
    let flip = false
    const titleTimer = setInterval(() => {
      flip = !flip
      document.title = flip ? alert : original
    }, 1000)

    return () => {
      ringtone.stop()
      clearInterval(titleTimer)
      document.title = original
      void closeLocalNotification(call.id)
    }
  }, [call, ringtone])

  const accept = async () => {
    if (!call) return
    const target = `/matches/${call.match_id}/call/${call.id}`
    setCall(null)
    // The call page also marks the call accepted for the callee, so even if
    // this update is slow or fails, opening the page answers the call.
    await supabase.from('calls').update({ status: 'accepted' }).eq('id', call.id)
    router.push(target)
  }

  const decline = async () => {
    if (!call) return
    const id = call.id
    setCall(null)
    await supabase.from('calls').update({ status: 'declined' }).eq('id', id)
  }

  if (!call) return null

  const Icon = call.kind === 'video' ? Video : Phone

  // A full-screen takeover rather than a dialog. The old Radix dialog
  // declined the call on any tap outside it or on Escape — on a phone, a
  // stray touch while pulling it out of your pocket hung up on the caller.
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="incoming-call-title"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-between overflow-hidden bg-black text-white animate-fade-in"
      style={{ paddingTop: 'max(3rem, env(safe-area-inset-top))', paddingBottom: 'max(3rem, env(safe-area-inset-bottom))' }}
    >
      {call.callerPhoto && (
        <img
          src={call.callerPhoto}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover opacity-40 blur-2xl scale-110"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/70" aria-hidden />

      <div className="relative flex flex-col items-center gap-5 px-6 pt-10 text-center">
        <p className="flex items-center gap-2 text-sm uppercase tracking-widest text-white/70">
          <Icon className="h-4 w-4" />
          Incoming {call.kind === 'video' ? 'video' : 'voice'} call
        </p>
        <div className="relative">
          <span className="absolute inset-0 rounded-full border-4 border-white/40 animate-pulse-ring" aria-hidden />
          <Avatar className="h-32 w-32 border-4 border-white/80 shadow-2xl">
            {call.callerPhoto && <AvatarImage src={call.callerPhoto} alt="" />}
            <AvatarFallback className="love-gradient text-primary-foreground text-4xl">
              {call.callerName[0]}
            </AvatarFallback>
          </Avatar>
        </div>
        <h2 id="incoming-call-title" className="text-3xl font-serif font-bold">
          {call.callerName}
        </h2>
      </div>

      <div className="relative flex w-full max-w-xs items-center justify-between px-6">
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={decline}
            aria-label="Decline"
            className="flex items-center justify-center rounded-full bg-red-600 shadow-lg transition-transform active:scale-90 hover:bg-red-700"
            style={{ width: 72, height: 72 }}
          >
            <PhoneOff className="h-8 w-8" />
          </button>
          <span className="text-sm text-white/80">Decline</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={accept}
            aria-label="Accept"
            autoFocus
            className="flex items-center justify-center rounded-full bg-green-600 shadow-lg transition-transform active:scale-90 hover:bg-green-700 animate-heartbeat"
            style={{ width: 72, height: 72 }}
          >
            <Icon className="h-8 w-8" />
          </button>
          <span className="text-sm text-white/80">Accept</span>
        </div>
      </div>
    </div>
  )
}

/**
 * For a tab that is open but hidden (another tab in front, window minimised):
 * the page is still alive and heard the call, so raise a system notification
 * from here. Uses the same tag as the push notification from the service
 * worker, so if both arrive the second replaces the first instead of
 * stacking.
 */
async function showLocalNotification(call: IncomingCall) {
  try {
    if (!('serviceWorker' in navigator) || Notification.permission !== 'granted') return
    const reg = await navigator.serviceWorker.getRegistration()
    await reg?.showNotification(call.callerName, {
      body: `Incoming ${call.kind === 'video' ? 'video' : 'voice'} call on Spark`,
      icon: call.callerPhoto || '/icon-192.png',
      badge: '/badge-96.png',
      tag: `call-${call.id}`,
      requireInteraction: true,
      data: {
        type: 'incoming-call',
        callId: call.id,
        matchId: call.match_id,
        kind: call.kind,
        callerName: call.callerName,
      },
    } as NotificationOptions)
  } catch {
    // Best effort — the in-page screen is still up.
  }
}

async function closeLocalNotification(callId: string) {
  try {
    if (!('serviceWorker' in navigator)) return
    const reg = await navigator.serviceWorker.getRegistration()
    const open = await reg?.getNotifications({ tag: `call-${callId}` })
    open?.forEach((n) => n.close())
  } catch {
    // ignore
  }
}

/**
 * One AudioContext for the whole app, unlocked on the user's first tap.
 *
 * Browsers only let a page make sound after the user has interacted with
 * it. The old code created its AudioContext at the moment the call arrived —
 * long after any tap — so on most phones the ringtone was silently blocked.
 * Creating and resuming it inside the first pointer/key event keeps it
 * allowed for the rest of the session.
 */
let sharedAudioContext: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (sharedAudioContext) return sharedAudioContext
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  sharedAudioContext = new Ctor()
  return sharedAudioContext
}

if (typeof window !== 'undefined') {
  const unlock = () => {
    const ctx = getAudioContext()
    void ctx?.resume().catch(() => {})
    window.removeEventListener('pointerdown', unlock)
    window.removeEventListener('keydown', unlock)
    window.removeEventListener('touchend', unlock)
  }
  window.addEventListener('pointerdown', unlock, { passive: true })
  window.addEventListener('keydown', unlock)
  window.addEventListener('touchend', unlock, { passive: true })
}

/**
 * Generates the classic two-tone ring pattern with the Web Audio API, and
 * vibrates on phones that support it. Synthesised, so there is no asset to
 * ship or 404.
 */
function useRingtone() {
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
      const ctx = sharedAudioContext
      if (!ctx || ctx.state !== 'running') return
      // Two 0.4s tones (440Hz then 480Hz), the North American ring cadence.
      ;[0, 0.45].forEach((offset) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.value = offset === 0 ? 440 : 480
        const t = ctx.currentTime + offset
        // Ramp in and out: a hard start/stop on a sine wave clicks audibly.
        gain.gain.setValueAtTime(0, t)
        gain.gain.linearRampToValueAtTime(0.25, t + 0.03)
        gain.gain.setValueAtTime(0.25, t + 0.37)
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
          const ctx = getAudioContext()
          // resume() works if the page was ever tapped and is harmlessly
          // rejected otherwise; either way burst() still vibrates.
          if (ctx) void ctx.resume().then(burst, burst)
          else burst()
          timerRef.current = setInterval(burst, 3000)
        } catch {
          // No audio available — the screen is still shown.
        }
      },
      stop() {
        // Only cancel a vibration we started: calling vibrate() before the
        // user has tapped the page logs a console error on every load.
        if (!timerRef.current) return
        clearInterval(timerRef.current)
        timerRef.current = null
        buzz(0)
      },
    }
  }, [])
}
