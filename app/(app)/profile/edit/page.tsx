'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Camera, Plus, X, Loader2, Instagram, Music, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Profile } from '@/lib/types'

const SUGGESTED_INTERESTS = [
  'Travel', 'Music', 'Movies', 'Cooking', 'Fitness', 'Art', 'Reading', 'Gaming',
  'Photography', 'Dancing', 'Hiking', 'Yoga', 'Coffee', 'Wine', 'Beach', 'Dogs',
  'Cats', 'Sports', 'Tech', 'Fashion', 'Food', 'Netflix', 'Concerts', 'Nature'
]

export default function EditProfilePage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [formData, setFormData] = useState({
    bio: '',
    location: '',
    occupation: '',
    instagramUrl: '',
    spotifyUrl: '',
  })
  const [interests, setInterests] = useState<string[]>([])
  const [photos, setPhotos] = useState<string[]>([])

  useEffect(() => {
    const loadProfile = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/auth/login')
        return
      }

      const { data } = await supabase
        .from('profiles')
        .select('id, name, age, gender, interested_in, bio, location, occupation, interests, photos, instagram_url, spotify_url, is_verified, is_bot, created_at, updated_at')
        .eq('id', user.id)
        .single()

      if (data) {
        setProfile(data)
        setFormData({
          bio: data.bio || '',
          location: data.location || '',
          occupation: data.occupation || '',
          instagramUrl: data.instagram_url || '',
          spotifyUrl: data.spotify_url || '',
        })
        setInterests(data.interests || [])
        setPhotos(data.photos || [])
      }
      setLoading(false)
    }

    loadProfile()
  }, [router])

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploadingPhoto(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      toast.error('Please sign in first')
      setUploadingPhoto(false)
      return
    }

    const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

    for (const file of Array.from(files)) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error(`${file.name}: please upload a JPEG, PNG, WebP, or GIF image`)
        continue
      }

      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name}: image must be under 5MB`)
        continue
      }

      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`

      // Upload to Supabase Storage rather than embedding a base64 data URL —
      // storing raw image bytes directly in the profiles row had no size
      // limit and would bloat the database with megabytes per photo.
      const { error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(fileName, file)

      if (uploadError) {
        toast.error(`Failed to upload ${file.name}: ${uploadError.message}`)
        continue
      }

      const { data: { publicUrl } } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(fileName)
      setPhotos(prev => [...prev, publicUrl])
    }

    setUploadingPhoto(false)
  }

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index))
  }

  const toggleInterest = (interest: string) => {
    setInterests(prev => 
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : prev.length < 10 
          ? [...prev, interest]
          : prev
    )
  }

  const handleSave = async () => {
    if (!profile) return
    
    if (photos.length === 0) {
      toast.error('Please add at least one photo')
      return
    }

    setSaving(true)
    const supabase = createClient()

    const { error } = await supabase
      .from('profiles')
      .update({
        bio: formData.bio || null,
        location: formData.location || null,
        occupation: formData.occupation || null,
        interests: interests.length > 0 ? interests : null,
        photos: photos,
        instagram_url: formData.instagramUrl || null,
        spotify_url: formData.spotifyUrl || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id)

    if (error) {
      toast.error(error.message)
      setSaving(false)
      return
    }

    toast.success('Profile updated!')
    router.push('/profile')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 md:top-20 z-40 bg-background/95 backdrop-blur-md border-b p-4 flex items-center justify-between">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/profile">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="text-xl font-serif font-bold">Edit Profile</h1>
        <Button
          size="sm"
          className="love-gradient text-primary-foreground border-0"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Save className="h-4 w-4 mr-1" />
              Save
            </>
          )}
        </Button>
      </header>

      <div className="p-4 space-y-6">
        {/* Photos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Camera className="h-5 w-5 text-primary" />
              Photos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {photos.map((photo, index) => (
                <div key={index} className="relative aspect-square rounded-xl overflow-hidden group">
                  <img src={photo} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  {index === 0 && (
                    <span className="absolute bottom-2 left-2 text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full">
                      Main
                    </span>
                  )}
                </div>
              ))}
              {photos.length < 6 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary"
                >
                  {uploadingPhoto ? (
                    <Loader2 className="h-8 w-8 animate-spin" />
                  ) : (
                    <>
                      <Plus className="h-8 w-8" />
                      <span className="text-xs">Add</span>
                    </>
                  )}
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoUpload}
              className="hidden"
            />
          </CardContent>
        </Card>

        {/* Bio */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">About</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                placeholder="Write something about yourself..."
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                className="min-h-[100px]"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">{formData.bio.length}/500</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="City, Country"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="occupation">Occupation</Label>
                <Input
                  id="occupation"
                  placeholder="What do you do?"
                  value={formData.occupation}
                  onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Interests */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Interests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_INTERESTS.map((interest) => (
                <Badge
                  key={interest}
                  variant={interests.includes(interest) ? 'default' : 'outline'}
                  className={`cursor-pointer transition-all ${
                    interests.includes(interest) 
                      ? 'love-gradient text-primary-foreground border-0' 
                      : 'hover:bg-primary/10'
                  }`}
                  onClick={() => toggleInterest(interest)}
                >
                  {interest}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">{interests.length}/10 selected</p>
          </CardContent>
        </Card>

        {/* Social */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Social Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="instagram" className="flex items-center gap-2">
                <Instagram className="h-4 w-4" />
                Instagram
              </Label>
              <Input
                id="instagram"
                placeholder="https://instagram.com/yourusername"
                value={formData.instagramUrl}
                onChange={(e) => setFormData({ ...formData, instagramUrl: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="spotify" className="flex items-center gap-2">
                <Music className="h-4 w-4" />
                Spotify
              </Label>
              <Input
                id="spotify"
                placeholder="https://open.spotify.com/user/yourid"
                value={formData.spotifyUrl}
                onChange={(e) => setFormData({ ...formData, spotifyUrl: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
