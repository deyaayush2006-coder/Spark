import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CallRoom } from '@/components/call-room'

export default async function CallPage({
  params,
}: {
  params: Promise<{ id: string; callId: string }>
}) {
  const { id: matchId, callId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // RLS restricts this select to calls the signed-in user is part of, so a
  // guessed callId from someone else's call simply returns nothing.
  const { data: call } = await supabase
    .from('calls')
    .select('id, match_id, caller_id, callee_id, kind, status, answered_at')
    .eq('id', callId)
    .eq('match_id', matchId)
    .single()

  if (!call) notFound()

  const isCaller = call.caller_id === user.id
  let status = call.status as string

  // The callee only ever lands here by answering — from the in-app ring
  // screen, or from "Answer" on a lock-screen notification, which has no
  // other way to mark the call accepted. So arriving here IS answering.
  // The transition rules in database/008 ignore this if the call already
  // ended or was answered on another device.
  if (!isCaller && status === 'ringing') {
    const { data: updated } = await supabase
      .from('calls')
      .update({ status: 'accepted' })
      .eq('id', call.id)
      .select('status')
      .maybeSingle()
    if (updated) status = updated.status
  }

  const otherUserId = isCaller ? call.callee_id : call.caller_id

  const { data: otherUser } = await supabase
    .from('profiles')
    .select('id, name, photos')
    .eq('id', otherUserId)
    .single()

  if (!otherUser) notFound()

  return (
    <CallRoom
      callId={call.id}
      matchId={matchId}
      kind={call.kind as 'audio' | 'video'}
      otherUser={otherUser}
      isCaller={isCaller}
      initialStatus={status}
    />
  )
}
