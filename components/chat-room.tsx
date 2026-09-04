'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Profile, Message } from '@/lib/types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Send, Heart } from 'lucide-react'
import { CallButtons } from '@/components/call-buttons'
import { ReportMenu } from '@/components/report-menu'
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

/**
 * The three-dot "typing..." bubble.
 *
 * Bot replies are already delayed 1-3s to feel human, but until now that
 * delay was indistinguishable from the app having dropped the message. The
 * indicator turns dead time into anticipation.
 */
function TypingBubble({ photo, name }: { photo: string; name?: string }) {
  return (
    <div className="flex items-end gap-2 justify-start animate-message-in-left">
      <div className="w-8">
        <Avatar className="w-8 h-8">
          <AvatarImage src={photo} alt="" />
          <AvatarFallback className="text-xs">{name?.[0]}</AvatarFallback>
        </Avatar>
      </div>
      <div className="message-received px-4 py-3" aria-label={`${name ?? 'They'} is typing`}>
        <span className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-current animate-typing-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </span>
      </div>
    </div>
  )
}

export function ChatRoom({ matchId, currentUserId, otherUser, initialMessages }: ChatRoomProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [botTyping, setBotTyping] = useState(false)
  // Messages present on first render shouldn't fly in one by one - only
  // things that arrive while you're watching should animate.
  const initialCount = useRef(initialMessages.length)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, botTyping])

  useEffect(() => {
    const supabase = createClient()

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
          // De-duplicate by message id rather than by sender.
          //
          // The old version skipped anything sent by the current user, which
          // broke two real cases: the same account open in a second tab never
          // saw its own messages appear, and a message that was inserted but
          // whose optimistic append failed was lost until a refresh. Checking
          // the id handles both, and still prevents the double-append that the
          // sender-check was there to avoid.
          if (newMsg.sender_id !== currentUserId) setBotTyping(false)
          setMessages((prev) =>
            prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg],
          )
        },
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
      // RLS also refuses inserts between blocked users, so give a message that
      // covers that case instead of a bare "failed".
      toast.error('Message not sent. You may have been blocked, or the connection dropped.')
      setSending(false)
      return
    }

    setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data]))
    setNewMessage('')
    setSending(false)

    // If chatting with a bot, ask the server to send a simulated reply.
    // This goes through /api/bot-reply rather than inserting directly,
    // because RLS (correctly) blocks a signed-in client from inserting a
    // message with someone else's sender_id — only a verified server route
    // is allowed to do that, and only for confirmed bot matches.
    if (otherUser.is_bot) {
      setBotTyping(true)
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
        } finally {
          // Always clear it: a stuck "typing..." that never resolves is worse
          // than no indicator at all.
          setBotTyping(false)
        }
      }, 1000 + Math.random() * 2000)
    }
  }

  const photo = otherUser.photos?.[0] || '/placeholder-user.jpg'

  return (
    <div className="flex flex-col h-[100dvh] md:h-[calc(100dvh-5rem)] bg-background">
      {/* Header */}
      <header className="sticky top-0 md:top-20 z-40 bg-background/95 backdrop-blur-md border-b p-4 flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/matches">
            <ArrowLeft className="h-5 w-5 transition-transform hover:-translate-x-0.5" />
          </Link>
        </Button>

        <Link
          href={`/profile/${otherUser.id}`}
          className="flex items-center gap-3 flex-1 min-w-0 rounded-lg transition-colors hover:bg-secondary/60 press"
        >
          <Avatar className="transition-transform duration-200 hover:scale-105">
            <AvatarImage src={photo} alt="" />
            <AvatarFallback className="love-gradient text-primary-foreground">
              {otherUser.name?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h1 className="font-semibold truncate">{otherUser.name}</h1>
            <p className="text-xs text-muted-foreground truncate">
              {botTyping ? 'typing…' : otherUser.location || 'Nearby'}
            </p>
          </div>
        </Link>

        <CallButtons
          matchId={matchId}
          currentUserId={currentUserId}
          otherUserId={otherUser.id}
          disabled={otherUser.is_bot}
        />

        <ReportMenu reportedId={otherUser.id} reportedName={otherUser.name} matchId={matchId} />
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar scroll-smooth">
        {messages.length === 0 && (
          <div className="text-center py-12 animate-fade-in">
            <div className="w-20 h-20 rounded-full love-gradient flex items-center justify-center mx-auto mb-4 animate-float">
              <Heart className="h-10 w-10 text-primary-foreground fill-primary-foreground animate-heartbeat" />
            </div>
            <h2 className="text-xl font-serif font-bold mb-2">You matched with {otherUser.name}!</h2>
            <p className="text-muted-foreground">Say something nice to break the ice.</p>
          </div>
        )}

        {messages.map((message, index) => {
          const isOwn = message.sender_id === currentUserId
          const showAvatar =
            !isOwn && (index === 0 || messages[index - 1]?.sender_id !== message.sender_id)
          // History fades up as one block; anything that lands after you
          // opened the room springs in from its own side of the thread.
          const isHistory = index < initialCount.current

          return (
            <div
              key={message.id}
              className={cn(
                'flex items-end gap-2',
                isOwn ? 'justify-end' : 'justify-start',
                isHistory
                  ? 'animate-slide-up'
                  : isOwn
                    ? 'animate-message-in-right'
                    : 'animate-message-in-left',
              )}
              style={
                // Cap the cascade: a 200-message history would otherwise take
                // four seconds to finish arriving.
                isHistory ? { animationDelay: `${Math.min(index, 12) * 0.02}s` } : undefined
              }
            >
              {!isOwn && (
                <div className="w-8">
                  {showAvatar && (
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={photo} alt="" />
                      <AvatarFallback className="text-xs">{otherUser.name?.[0]}</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              )}
              <div
                className={cn(
                  'max-w-[70%] px-4 py-2 transition-transform duration-200 hover:scale-[1.02]',
                  isOwn ? 'message-sent' : 'message-received',
                )}
              >
                <p className="break-words">{message.content}</p>
                <span
                  className={cn(
                    'text-[10px] block mt-1',
                    isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground',
                  )}
                >
                  {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                </span>
              </div>
            </div>
          )
        })}

        {botTyping && <TypingBubble photo={photo} name={otherUser.name} />}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="p-4 border-t bg-background">
        <div className="flex items-center gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 transition-shadow duration-200 focus-visible:shadow-md"
            maxLength={2000}
            disabled={sending}
          />
          <Button
            type="submit"
            size="icon"
            className={cn(
              'love-gradient text-primary-foreground border-0 shrink-0 group',
              // Only invite the tap once there's something to send.
              'transition-all duration-200',
              newMessage.trim() && !sending && 'scale-105 shadow-lg',
            )}
            disabled={!newMessage.trim() || sending}
          >
            <Send
              className={cn(
                'h-5 w-5 transition-transform duration-200',
                'group-hover:translate-x-0.5 group-hover:-translate-y-0.5',
                sending && 'animate-pulse',
              )}
            />
          </Button>
        </div>
      </form>
    </div>
  )
}
