'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Profile, Message } from '@/lib/types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Send, Heart } from 'lucide-react'
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
    // Subscribe to realtime messages
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
          if (newMsg.sender_id !== currentUserId) {
            setMessages(prev => [...prev, newMsg])
          }
        }
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
      toast.error('Failed to send message')
      setSending(false)
      return
    }

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
        }
      }, 1000 + Math.random() * 2000)
    }
  }

  const photo = otherUser.photos?.[0] || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400'

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b p-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/matches">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <Link href={`/profile/${otherUser.id}`} className="flex items-center gap-3 flex-1">
          <Avatar>
            <AvatarImage src={photo} />
            <AvatarFallback className="love-gradient text-primary-foreground">
              {otherUser.name?.[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="font-semibold">{otherUser.name}</h1>
            <p className="text-xs text-muted-foreground">
              {otherUser.location || 'Nearby'}
            </p>
          </div>
        </Link>
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
          const showAvatar = !isOwn && (index === 0 || messages[index - 1]?.sender_id !== message.sender_id)
          
          return (
            <div
              key={message.id}
              className={cn(
                'flex items-end gap-2 animate-slide-up',
                isOwn ? 'justify-end' : 'justify-start'
              )}
              style={{ animationDelay: `${index * 0.02}s` }}
            >
              {!isOwn && (
                <div className="w-8">
                  {showAvatar && (
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={photo} />
                      <AvatarFallback className="text-xs">{otherUser.name?.[0]}</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              )}
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
