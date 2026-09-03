'use client'

import { useEffect, useState, useRef } from 'react'
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

/**
 * Mounted once in the app layout. Subscribes to INSERTs on `calls` where the
 * signed-in user is the callee — a new 'ringing' row IS the incoming call
 * notification, so no separate signalling server is needed.
 *
 * Note: this only rings while the app is open in a tab. Ringing a closed app
 * needs Web Push (see the roadmap) — that's a separate, much bigger feature.
 */
export function IncomingCallListener({ currentUserId }: { currentUserId: string }) {
  const router = useRouter()
  const [call, setCall] = useState<IncomingCall | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const supabase = createClient()

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
        async (payload) => {
          const row = payload.new as {
            id: string
            match_id: string
            caller_id: string
            kind: 'audio' | 'video'
            status: string
          }
          if (row.status !== 'ringing') return

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
            setCall((current) => (current?.id === row.id ? null : current))
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUserId])

  // Ringtone. Browsers block autoplay until the user has interacted with the
  // page, so this is best-effort — the visual modal is the real notification.
  useEffect(() => {
    if (!call) {
      audioRef.current?.pause()
      return
    }
    audioRef.current?.play().catch(() => {})
  }, [call])

  const accept = async () => {
    if (!call) return
    const supabase = createClient()
    await supabase.from('calls').update({ status: 'accepted' }).eq('id', call.id)
    const target = `/matches/${call.match_id}/call/${call.id}`
    setCall(null)
    router.push(target)
  }

  const decline = async () => {
    if (!call) return
    const supabase = createClient()
    await supabase.from('calls').update({ status: 'declined' }).eq('id', call.id)
    setCall(null)
  }

  return (
    <>
      {/* Swap in your own file at public/ringtone.mp3 if you want a real one. */}
      <audio ref={audioRef} src="/ringtone.mp3" loop preload="none" />

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
