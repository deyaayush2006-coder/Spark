import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ChatRoom } from '@/components/chat-room'

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Get the match
  const { data: match } = await supabase
    .from('matches')
    .select(`
      *,
<<<<<<< HEAD
      user1:profiles!matches_user1_id_fkey(*),
      user2:profiles!matches_user2_id_fkey(*)
=======
      user1:profiles!matches_user1_id_fkey(id, name, age, gender, interested_in, bio, location, occupation, interests, photos, instagram_url, spotify_url, is_verified, is_bot, created_at, updated_at),
      user2:profiles!matches_user2_id_fkey(id, name, age, gender, interested_in, bio, location, occupation, interests, photos, instagram_url, spotify_url, is_verified, is_bot, created_at, updated_at)
>>>>>>> 2335d4b (version 2.0)
    `)
    .eq('id', id)
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    .single()

  if (!match) {
    notFound()
  }

  const otherUser = match.user1_id === user.id ? match.user2 : match.user1

  // Get messages
  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('match_id', id)
    .order('created_at', { ascending: true })

  // Mark unread messages as read
  await supabase
    .from('messages')
    .update({ read: true })
    .eq('match_id', id)
    .neq('sender_id', user.id)
    .eq('read', false)

  return (
    <ChatRoom
      matchId={id}
      currentUserId={user.id}
      otherUser={otherUser}
      initialMessages={messages || []}
    />
  )
}
