'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Profile, Message } from '@/lib/types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Send, Heart } from 'lucide-react'
<<<<<<< HEAD
=======
import { CallButtons } from '@/components/call-buttons'
import { ReportMenu } from '@/components/report-menu'
>>>>>>> 2335d4b (version 2.0)
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

interface ChatRoomProps {
  matchId: string
  currentUserId: string
  otherUser: Profile
  initialMessages: Message[]
}

<<<<<<< HEAD
// Bot responses for testing
const BOT_RESPONSES = [
  "Hey! How's your day going?",
  "That's so interesting! Tell me more about yourself.",
  "I love that! We should definitely meet up sometime.",
  "You seem like such a fun person!",
  "Haha, you're making me smile!",
  "What do you like to do for fun?",
  "I've been thinking about trying something new lately. Any suggestions?",
  "That's really cool! I've always wanted to try that.",
  "You have great taste!",
  "I feel like we have a lot in common!",
]

=======
>>>>>>> 2335d4b (version 2.0)
export function ChatRoom({ matchId, currentUserId, otherUser, initialMessages }: ChatRoomProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
<<<<<<< HEAD
    // Subscribe to realtime messages
    const supabase = createClient()
    
=======
    const supabase = createClient()

>>>>>>> 2335d4b (version 2.0)
    const channel = supabase
      .channel(`messages:${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message
<<<<<<< HEAD
          if (newMsg.sender_id !== currentUserId) {
            setMessages(prev => [...prev, newMsg])
          }
        }
=======
          // De-duplicate by message id rather than by sender.
          //
          // The old version skipped anything sent by the current user, which
          // broke two real cases: the same account open in a second tab never
          // saw its own messages appear, and a message that was inserted but
          // whose optimistic append failed was lost until a refresh. Checking
          // the id handles both, and still prevents the double-append that the
          // sender-check was there to avoid.
          setMessages((prev) =>
            prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg],
          )
        },
>>>>>>> 2335d4b (version 2.0)
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [matchId, currentUserId])

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || sending) return

    setSending(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('messages')
      .insert({
        match_id: matchId,
        sender_id: currentUserId,
        content: newMessage.trim(),
      })
      .select()
      .single()

    if (error) {
<<<<<<< HEAD
      toast.error('Failed to send message')
=======
      // RLS also refuses inserts between blocked users, so give a message that
      // covers that case instead of a bare "failed".
      toast.error('Message not sent. You may have been blocked, or the connection dropped.')
>>>>>>> 2335d4b (version 2.0)
      setSending(false)
      return
    }

<<<<<<< HEAD
    setMessages(prev => [...prev, data])
    setNewMessage('')
    setSending(false)

    // If chatting with a bot, simulate a response
    if (otherUser.is_bot) {
      setTimeout(async () => {
        const botResponse = BOT_RESPONSES[Math.floor(Math.random() * BOT_RESPONSES.length)]
        
        const { data: botMessage } = await supabase
          .from('messages')
          .insert({
            match_id: matchId,
            sender_id: otherUser.id,
            content: botResponse,
          })
          .select()
          .single()

        if (botMessage) {
          setMessages(prev => [...prev, botMessage])
=======
    setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data]))
    setNewMessage('')
    setSending(false)

    // If chatting with a bot, ask the server to send a simulated reply.
    // This goes through /api/bot-reply rather than inserting directly,
    // because RLS (correctly) blocks a signed-in client from inserting a
    // message with someone else's sender_id — only a verified server route
    // is allowed to do that, and only for confirmed bot matches.
    if (otherUser.is_bot) {
      setTimeout(async () => {
        try {
          const res = await fetch('/api/bot-reply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ matchId }),
          })
          if (res.ok) {
            const { message: botMessage } = await res.json()
            if (botMessage) {
              setMessages((prev) =>
                prev.some((m) => m.id === botMessage.id) ? prev : [...prev, botMessage],
              )
            }
          }
        } catch {
          // Silently ignore — a missed bot reply isn't worth surfacing an error for.
>>>>>>> 2335d4b (version 2.0)
        }
      }, 1000 + Math.random() * 2000)
    }
  }

<<<<<<< HEAD
  const photo = otherUser.photos?.[0] || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400'
=======
  const photo = otherUser.photos?.[0] || '/placeholder-user.jpg'
>>>>>>> 2335d4b (version 2.0)

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
<<<<<<< HEAD
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b p-4 flex items-center gap-3">
=======
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b p-4 flex items-center gap-2">
>>>>>>> 2335d4b (version 2.0)
        <Button variant="ghost" size="icon" asChild>
          <Link href="/matches">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
<<<<<<< HEAD
        <Link href={`/profile/${otherUser.id}`} className="flex items-center gap-3 flex-1">
          <Avatar>
            <AvatarImage src={photo} />
=======

        <Link href={`/profile/${otherUser.id}`} className="flex items-center gap-3 flex-1 min-w-0">
          <Avatar>
            <AvatarImage src={photo} alt="" />
>>>>>>> 2335d4b (version 2.0)
            <AvatarFallback className="love-gradient text-primary-foreground">
              {otherUser.name?.[0]}
            </AvatarFallback>
          </Avatar>
<<<<<<< HEAD
          <div>
            <h1 className="font-semibold">{otherUser.name}</h1>
            <p className="text-xs text-muted-foreground">
=======
          <div className="min-w-0">
            <h1 className="font-semibold truncate">{otherUser.name}</h1>
            <p className="text-xs text-muted-foreground truncate">
>>>>>>> 2335d4b (version 2.0)
              {otherUser.location || 'Nearby'}
            </p>
          </div>
        </Link>
<<<<<<< HEAD
=======

        <CallButtons
          matchId={matchId}
          currentUserId={currentUserId}
          otherUserId={otherUser.id}
          disabled={otherUser.is_bot}
        />

        <ReportMenu reportedId={otherUser.id} reportedName={otherUser.name} matchId={matchId} />
>>>>>>> 2335d4b (version 2.0)
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.length === 0 && (
          <div className="text-center py-12 animate-fade-in">
            <div className="w-20 h-20 rounded-full love-gradient flex items-center justify-center mx-auto mb-4">
              <Heart className="h-10 w-10 text-primary-foreground fill-primary-foreground" />
            </div>
            <h2 className="text-xl font-serif font-bold mb-2">You matched with {otherUser.name}!</h2>
            <p className="text-muted-foreground">Say something nice to break the ice.</p>
          </div>
        )}

        {messages.map((message, index) => {
          const isOwn = message.sender_id === currentUserId
<<<<<<< HEAD
          const showAvatar = !isOwn && (index === 0 || messages[index - 1]?.sender_id !== message.sender_id)
          
=======
          const showAvatar =
            !isOwn && (index === 0 || messages[index - 1]?.sender_id !== message.sender_id)

>>>>>>> 2335d4b (version 2.0)
          return (
            <div
              key={message.id}
              className={cn(
                'flex items-end gap-2 animate-slide-up',
<<<<<<< HEAD
                isOwn ? 'justify-end' : 'justify-start'
=======
                isOwn ? 'justify-end' : 'justify-start',
>>>>>>> 2335d4b (version 2.0)
              )}
              style={{ animationDelay: `${index * 0.02}s` }}
            >
              {!isOwn && (
                <div className="w-8">
                  {showAvatar && (
                    <Avatar className="w-8 h-8">
<<<<<<< HEAD
                      <AvatarImage src={photo} />
=======
                      <AvatarImage src={photo} alt="" />
>>>>>>> 2335d4b (version 2.0)
                      <AvatarFallback className="text-xs">{otherUser.name?.[0]}</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              )}
<<<<<<< HEAD
              <div
                className={cn(
                  'max-w-[70%] px-4 py-2',
                  isOwn ? 'message-sent' : 'message-received'
                )}
              >
                <p>{message.content}</p>
                <span className={cn(
                  'text-[10px] block mt-1',
                  isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                )}>
=======
              <div className={cn('max-w-[70%] px-4 py-2', isOwn ? 'message-sent' : 'message-received')}>
                <p className="break-words">{message.content}</p>
                <span
                  className={cn(
                    'text-[10px] block mt-1',
                    isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground',
                  )}
                >
>>>>>>> 2335d4b (version 2.0)
                  {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                </span>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="p-4 border-t bg-background">
        <div className="flex items-center gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
<<<<<<< HEAD
=======
            maxLength={2000}
>>>>>>> 2335d4b (version 2.0)
            disabled={sending}
          />
          <Button
            type="submit"
            size="icon"
            className="love-gradient text-primary-foreground border-0 shrink-0"
            disabled={!newMessage.trim() || sending}
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </form>
    </div>
  )
}
