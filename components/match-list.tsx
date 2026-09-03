'use client'

import Link from 'next/link'
import { MatchWithProfile } from '@/lib/types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Heart, MessageCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface MatchListProps {
  matches: MatchWithProfile[]
  currentUserId: string
}

export function MatchList({ matches, currentUserId }: MatchListProps) {
  if (matches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center animate-fade-in">
        <div className="w-24 h-24 rounded-full love-gradient flex items-center justify-center mb-6 animate-float">
          <MessageCircle className="h-12 w-12 text-primary-foreground" />
        </div>
        <h2 className="text-2xl font-serif font-bold mb-2">No matches yet</h2>
        <p className="text-muted-foreground max-w-sm">
          Keep swiping to find your perfect match! When you both like each other, you can start chatting here.
        </p>
        <Link 
          href="/discover"
          className="mt-6 px-6 py-3 love-gradient text-primary-foreground rounded-full font-medium"
        >
          <Heart className="inline-block mr-2 h-5 w-5" />
          Start Swiping
        </Link>
      </div>
    )
  }

  // Separate new matches (no messages) from conversations
  const newMatches = matches.filter(m => !m.lastMessage)
  const conversations = matches.filter(m => m.lastMessage)

  return (
    <div className="p-4">
      {/* New Matches */}
      {newMatches.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            New Matches
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {newMatches.map((match, index) => (
              <Link
                key={match.id}
                href={`/matches/${match.id}`}
                className="flex flex-col items-center gap-2 animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="relative">
                  <Avatar className="w-20 h-20 border-2 border-primary">
                    <AvatarImage src={match.profile?.photos?.[0]} />
                    <AvatarFallback className="love-gradient text-primary-foreground text-2xl">
                      {match.profile?.name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <Heart className="h-3 w-3 text-primary-foreground fill-primary-foreground" />
                  </div>
                </div>
                <span className="text-sm font-medium">{match.profile?.name?.split(' ')[0]}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Conversations */}
      {conversations.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Messages
          </h2>
          <div className="space-y-2">
            {conversations.map((match, index) => (
              <Link
                key={match.id}
                href={`/matches/${match.id}`}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary transition-colors animate-slide-up"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="relative">
                  <Avatar className="w-14 h-14">
                    <AvatarImage src={match.profile?.photos?.[0]} />
                    <AvatarFallback className="love-gradient text-primary-foreground">
                      {match.profile?.name?.[0]}
                    </AvatarFallback>
                  </Avatar>
<<<<<<< HEAD
                  {match.unreadCount > 0 && (
=======
                  {(match.unreadCount ?? 0) > 0 && (
>>>>>>> 2335d4b (version 2.0)
                    <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center love-gradient border-0">
                      {match.unreadCount}
                    </Badge>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold truncate">{match.profile?.name}</h3>
                    {match.lastMessage && (
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(match.lastMessage.created_at), { addSuffix: false })}
                      </span>
                    )}
                  </div>
                  {match.lastMessage && (
<<<<<<< HEAD
                    <p className={`text-sm truncate ${match.unreadCount > 0 ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
=======
                    <p className={`text-sm truncate ${(match.unreadCount ?? 0) > 0 ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
>>>>>>> 2335d4b (version 2.0)
                      {match.lastMessage.sender_id === currentUserId ? 'You: ' : ''}
                      {match.lastMessage.content}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
