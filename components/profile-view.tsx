'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Profile } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Settings, 
  LogOut, 
  Edit, 
  MapPin, 
  Briefcase, 
  Instagram, 
  Music,
  Heart,
  Users,
  UserPlus,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface ProfileViewProps {
  profile: Profile
  isOwnProfile: boolean
  stats?: {
    followers: number
    following: number
    matches: number
  }
}

export function ProfileView({ profile, isOwnProfile, stats }: ProfileViewProps) {
  const router = useRouter()
  const [photoIndex, setPhotoIndex] = useState(0)
  const photos = profile.photos || ['https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400']

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('Logged out successfully')
    router.push('/')
    router.refresh()
  }

  const nextPhoto = () => setPhotoIndex(prev => (prev + 1) % photos.length)
  const prevPhoto = () => setPhotoIndex(prev => (prev - 1 + photos.length) % photos.length)

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b p-4 flex items-center justify-between">
        <h1 className="text-2xl font-serif font-bold love-gradient-text">Profile</h1>
        {isOwnProfile && (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/profile/edit">
                <Edit className="h-5 w-5" />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        )}
      </header>

      {/* Photo */}
      <div className="relative aspect-square max-h-[50vh]">
        <img
          src={photos[photoIndex]}
          alt={profile.name}
          className="w-full h-full object-cover"
        />
        
        {photos.length > 1 && (
          <>
            <div className="absolute top-4 inset-x-4 flex gap-1">
              {photos.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'h-1 flex-1 rounded-full transition-colors',
                    i === photoIndex ? 'bg-white' : 'bg-white/40'
                  )}
                />
              ))}
            </div>
            <button
              onClick={prevPhoto}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-20 flex items-center justify-center"
            >
              <ChevronLeft className="h-8 w-8 text-white drop-shadow-lg" />
            </button>
            <button
              onClick={nextPhoto}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-20 flex items-center justify-center"
            >
              <ChevronRight className="h-8 w-8 text-white drop-shadow-lg" />
            </button>
          </>
        )}

        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-6">
          <h2 className="text-3xl font-serif font-bold text-white">
            {profile.name}, {profile.age}
          </h2>
          <div className="flex items-center gap-4 text-white/80 mt-1">
            {profile.occupation && (
              <span className="flex items-center gap-1">
                <Briefcase className="h-4 w-4" />
                {profile.occupation}
              </span>
            )}
            {profile.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {profile.location}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-4 p-4 border-b">
          <Link href="/matches" className="text-center">
            <div className="text-2xl font-serif font-bold love-gradient-text">{stats.matches}</div>
            <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
              <Heart className="h-4 w-4" />
              Matches
            </div>
          </Link>
          <Link href="/social" className="text-center">
            <div className="text-2xl font-serif font-bold">{stats.followers}</div>
            <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
              <Users className="h-4 w-4" />
              Followers
            </div>
          </Link>
          <Link href="/social" className="text-center">
            <div className="text-2xl font-serif font-bold">{stats.following}</div>
            <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
              <UserPlus className="h-4 w-4" />
              Following
            </div>
          </Link>
        </div>
      )}

      {/* Bio */}
      <div className="p-4 space-y-4">
        {profile.bio && (
          <Card className="animate-slide-up">
            <CardContent className="pt-4">
              <h3 className="font-serif font-semibold mb-2">About</h3>
              <p className="text-muted-foreground leading-relaxed bio-text">
                {profile.bio}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Interests */}
        {profile.interests && profile.interests.length > 0 && (
          <Card className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <CardContent className="pt-4">
              <h3 className="font-serif font-semibold mb-3">Interests</h3>
              <div className="flex flex-wrap gap-2">
                {profile.interests.map((interest) => (
                  <Badge 
                    key={interest} 
                    variant="secondary"
                    className="px-3 py-1 hover:bg-primary hover:text-primary-foreground transition-colors cursor-default"
                  >
                    {interest}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Social Links */}
        {(profile.instagram_url || profile.spotify_url) && (
          <Card className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <CardContent className="pt-4">
              <h3 className="font-serif font-semibold mb-3">Social</h3>
              <div className="flex gap-3">
                {profile.instagram_url && (
                  <a
                    href={profile.instagram_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 text-white hover:opacity-90 transition-opacity"
                  >
                    <Instagram className="h-5 w-5" />
                    Instagram
                  </a>
                )}
                {profile.spotify_url && (
                  <a
                    href={profile.spotify_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#1DB954] text-white hover:opacity-90 transition-opacity"
                  >
                    <Music className="h-5 w-5" />
                    Spotify
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
