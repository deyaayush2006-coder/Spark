'use client'

import { useState } from 'react'
import { Profile, Follower, FriendRequest } from '@/lib/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { UserPlus, UserMinus, Check, X, Users, Heart, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import Link from 'next/link'

interface SocialTabsProps {
  followers: (Follower & { profile: Profile })[]
  following: (Follower & { profile: Profile })[]
  friendRequests: (FriendRequest & { sender: Profile })[]
  sentRequests: (FriendRequest & { receiver: Profile })[]
  discoverProfiles: Profile[]
  currentUserId: string
}

export function SocialTabs({ 
  followers, 
  following, 
  friendRequests: initialRequests, 
  sentRequests: initialSent,
  discoverProfiles: initialDiscover,
  currentUserId 
}: SocialTabsProps) {
  const [friendRequests, setFriendRequests] = useState(initialRequests)
  const [sentRequests, setSentRequests] = useState(initialSent)
  const [discoverProfiles, setDiscoverProfiles] = useState(initialDiscover)
  const [followingList, setFollowingList] = useState(following)

  const handleFollow = async (profileId: string) => {
    const supabase = createClient()
    
    const { error } = await supabase.from('followers').insert({
      follower_id: currentUserId,
      following_id: profileId,
    })

    if (error) {
      toast.error('Failed to follow')
      return
    }

    toast.success('Following!')
    setDiscoverProfiles(prev => prev.filter(p => p.id !== profileId))
  }

  const handleUnfollow = async (followId: string, profileId: string) => {
    const supabase = createClient()
    
    const { error } = await supabase.from('followers').delete().eq('id', followId)

    if (error) {
      toast.error('Failed to unfollow')
      return
    }

    toast.success('Unfollowed')
    setFollowingList(prev => prev.filter(f => f.id !== followId))
  }

  const handleFriendRequest = async (requestId: string, action: 'accepted' | 'rejected') => {
    const supabase = createClient()
    
    const { error } = await supabase
      .from('friend_requests')
      .update({ status: action })
      .eq('id', requestId)

    if (error) {
      toast.error('Failed to update request')
      return
    }

    toast.success(action === 'accepted' ? 'Friend request accepted!' : 'Request declined')
    setFriendRequests(prev => prev.filter(r => r.id !== requestId))
  }

  const handleSendFriendRequest = async (receiverId: string) => {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('friend_requests')
      .insert({
        sender_id: currentUserId,
        receiver_id: receiverId,
      })
<<<<<<< HEAD
      .select('*, receiver:profiles!friend_requests_receiver_id_fkey(*)')
=======
      .select('*, receiver:profiles!friend_requests_receiver_id_fkey(id, name, age, gender, interested_in, bio, location, occupation, interests, photos, instagram_url, spotify_url, is_verified, is_bot, created_at, updated_at)')
>>>>>>> 2335d4b (version 2.0)
      .single()

    if (error) {
      toast.error('Failed to send request')
      return
    }

    toast.success('Friend request sent!')
    setSentRequests(prev => [...prev, data])
  }

  return (
    <Tabs defaultValue="discover" className="p-4">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="discover">
          <Search className="h-4 w-4 md:mr-2" />
          <span className="hidden md:inline">Discover</span>
        </TabsTrigger>
        <TabsTrigger value="requests" className="relative">
          <Heart className="h-4 w-4 md:mr-2" />
          <span className="hidden md:inline">Requests</span>
          {friendRequests.length > 0 && (
            <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center love-gradient border-0">
              {friendRequests.length}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="following">
          <UserPlus className="h-4 w-4 md:mr-2" />
          <span className="hidden md:inline">Following</span>
        </TabsTrigger>
        <TabsTrigger value="followers">
          <Users className="h-4 w-4 md:mr-2" />
          <span className="hidden md:inline">Followers</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="discover" className="mt-4 space-y-3">
        {discoverProfiles.length === 0 ? (
          <EmptyState 
            icon={<Search className="h-12 w-12" />}
            title="No one to discover"
            description="Check back later for new people"
          />
        ) : (
          discoverProfiles.map((profile, index) => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              delay={index * 0.05}
              actions={
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSendFriendRequest(profile.id)}
                  >
                    <Heart className="h-4 w-4 mr-1" />
                    Request
                  </Button>
                  <Button
                    size="sm"
                    className="love-gradient text-primary-foreground border-0"
                    onClick={() => handleFollow(profile.id)}
                  >
                    <UserPlus className="h-4 w-4 mr-1" />
                    Follow
                  </Button>
                </div>
              }
            />
          ))
        )}
      </TabsContent>

      <TabsContent value="requests" className="mt-4 space-y-3">
        {friendRequests.length === 0 ? (
          <EmptyState 
            icon={<Heart className="h-12 w-12" />}
            title="No pending requests"
            description="Friend requests will appear here"
          />
        ) : (
          friendRequests.map((request, index) => (
            <ProfileCard
              key={request.id}
              profile={request.sender}
              delay={index * 0.05}
              actions={
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="love-gradient text-primary-foreground border-0"
                    onClick={() => handleFriendRequest(request.id, 'accepted')}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleFriendRequest(request.id, 'rejected')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              }
            />
          ))
        )}

        {sentRequests.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Sent Requests
            </h3>
            {sentRequests.map((request, index) => (
              <ProfileCard
                key={request.id}
                profile={request.receiver}
                delay={index * 0.05}
                actions={
                  <Badge variant="secondary">Pending</Badge>
                }
              />
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="following" className="mt-4 space-y-3">
        {followingList.length === 0 ? (
          <EmptyState 
            icon={<UserPlus className="h-12 w-12" />}
            title="Not following anyone"
            description="Discover and follow people you like"
          />
        ) : (
          followingList.map((follow, index) => (
            <ProfileCard
              key={follow.id}
              profile={follow.profile}
              delay={index * 0.05}
              actions={
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleUnfollow(follow.id, follow.profile.id)}
                >
                  <UserMinus className="h-4 w-4 mr-1" />
                  Unfollow
                </Button>
              }
            />
          ))
        )}
      </TabsContent>

      <TabsContent value="followers" className="mt-4 space-y-3">
        {followers.length === 0 ? (
          <EmptyState 
            icon={<Users className="h-12 w-12" />}
            title="No followers yet"
            description="People who follow you will appear here"
          />
        ) : (
          followers.map((follower, index) => (
            <ProfileCard
              key={follower.id}
              profile={follower.profile}
              delay={index * 0.05}
              actions={
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleFollow(follower.profile.id)}
                  disabled={followingList.some(f => f.following_id === follower.profile.id)}
                >
                  {followingList.some(f => f.following_id === follower.profile.id) 
                    ? 'Following' 
                    : 'Follow Back'}
                </Button>
              }
            />
          ))
        )}
      </TabsContent>
    </Tabs>
  )
}

function ProfileCard({ 
  profile, 
  actions, 
  delay = 0 
}: { 
  profile: Profile
  actions: React.ReactNode
  delay?: number 
}) {
  const photo = profile.photos?.[0] || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400'
  
  return (
    <div 
      className="flex items-center gap-3 p-3 rounded-xl bg-card border animate-slide-up"
      style={{ animationDelay: `${delay}s` }}
    >
      <Link href={`/profile/${profile.id}`}>
        <Avatar className="w-14 h-14">
          <AvatarImage src={photo} />
          <AvatarFallback className="love-gradient text-primary-foreground">
            {profile.name?.[0]}
          </AvatarFallback>
        </Avatar>
      </Link>
      <div className="flex-1 min-w-0">
        <Link href={`/profile/${profile.id}`}>
          <h3 className="font-semibold truncate hover:text-primary transition-colors">
            {profile.name}
          </h3>
        </Link>
        <p className="text-sm text-muted-foreground truncate">
          {profile.occupation || profile.location || `${profile.age} years old`}
        </p>
      </div>
      {actions}
    </div>
  )
}

function EmptyState({ 
  icon, 
  title, 
  description 
}: { 
  icon: React.ReactNode
  title: string
  description: string 
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center animate-fade-in">
      <div className="w-24 h-24 rounded-full love-gradient flex items-center justify-center mb-6 text-primary-foreground animate-float">
        {icon}
      </div>
      <h2 className="text-xl font-serif font-bold mb-2">{title}</h2>
      <p className="text-muted-foreground">{description}</p>
    </div>
  )
}
