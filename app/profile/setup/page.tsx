'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, Camera, Plus, X, Loader2, Instagram, Music } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

const SUGGESTED_INTERESTS = [
  'Travel', 'Music', 'Movies', 'Cooking', 'Fitness', 'Art', 'Reading', 'Gaming',
  'Photography', 'Dancing', 'Hiking', 'Yoga', 'Coffee', 'Wine', 'Beach', 'Dogs',
  'Cats', 'Sports', 'Tech', 'Fashion', 'Food', 'Netflix', 'Concerts', 'Nature'
]

export default function ProfileSetupPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [formData, setFormData] = useState({
    bio: '',
    location: '',
    occupation: '',
    instagramUrl: '',
    spotifyUrl: '',
  })
  const [interests, setInterests] = useState<string[]>([])
  const [photos, setPhotos] = useState<string[]>([])

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

<<<<<<< HEAD
    const newPhotos: string[] = []

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload only images')
=======
    const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

    for (const file of Array.from(files)) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error(`${file.name}: please upload a JPEG, PNG, WebP, or GIF image`)
        continue
      }

      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name}: image must be under 5MB`)
>>>>>>> 2335d4b (version 2.0)
        continue
      }

      const fileExt = file.name.split('.').pop()
<<<<<<< HEAD
      const fileName = `${user.id}/${Date.now()}.${fileExt}`

      const { error: uploadError, data } = await supabase.storage
=======
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`

      const { error: uploadError } = await supabase.storage
>>>>>>> 2335d4b (version 2.0)
        .from('profile-photos')
        .upload(fileName, file)

      if (uploadError) {
<<<<<<< HEAD
        // If bucket doesn't exist, use URL directly
        const reader = new FileReader()
        reader.onload = (e) => {
          if (e.target?.result) {
            newPhotos.push(e.target.result as string)
            setPhotos(prev => [...prev, e.target!.result as string])
          }
        }
        reader.readAsDataURL(file)
      } else {
        const { data: { publicUrl } } = supabase.storage
          .from('profile-photos')
          .getPublicUrl(fileName)
        newPhotos.push(publicUrl)
        setPhotos(prev => [...prev, publicUrl])
      }
=======
        // Do NOT fall back to embedding the raw image as a base64 data URL —
        // that used to bypass size limits entirely and would bloat every
        // profile row with megabytes of inline image data. Surface the real
        // problem instead (e.g. the "profile-photos" storage bucket hasn't
        // been created yet in this Supabase project).
        toast.error(`Failed to upload ${file.name}: ${uploadError.message}`)
        continue
      }

      const { data: { publicUrl } } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(fileName)
      setPhotos(prev => [...prev, publicUrl])
>>>>>>> 2335d4b (version 2.0)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (photos.length === 0) {
      toast.error('Please add at least one photo')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      toast.error('Please sign in first')
      setLoading(false)
      return
    }

    const metadata = user.user_metadata
    
    const { error } = await supabase.from('profiles').insert({
      id: user.id,
      name: metadata.name || 'User',
      age: metadata.age || 18,
      gender: metadata.gender || 'other',
      interested_in: metadata.interested_in || 'everyone',
      bio: formData.bio || null,
      location: formData.location || null,
      occupation: formData.occupation || null,
      interests: interests.length > 0 ? interests : null,
      photos: photos,
      instagram_url: formData.instagramUrl || null,
      spotify_url: formData.spotifyUrl || null,
      is_bot: false,
    })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    toast.success('Profile created! Let\'s find your match!')
    router.push('/discover')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8 animate-slide-up">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Heart className="h-8 w-8 text-primary fill-primary animate-heartbeat" />
            <span className="text-2xl font-serif font-bold love-gradient-text">Spark</span>
          </div>
          <h1 className="text-3xl font-serif font-bold mb-2">Complete Your Profile</h1>
          <p className="text-muted-foreground">Show off who you are and what makes you unique</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Photos */}
          <Card className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-primary" />
                Your Photos
              </CardTitle>
              <CardDescription>Add up to 6 photos. Your first photo is your main profile picture.</CardDescription>
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
                        <span className="text-xs">Add Photo</span>
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
          <Card className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <CardHeader>
              <CardTitle>About You</CardTitle>
              <CardDescription>Let others know what makes you special</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  placeholder="Write something interesting about yourself..."
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  className="min-h-[120px]"
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
          <Card className="animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <CardHeader>
              <CardTitle>Interests</CardTitle>
              <CardDescription>Select up to 10 interests to help find better matches</CardDescription>
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

          {/* Social Links */}
          <Card className="animate-slide-up" style={{ animationDelay: '0.4s' }}>
            <CardHeader>
              <CardTitle>Social Links</CardTitle>
              <CardDescription>Connect your social profiles (optional)</CardDescription>
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

          <Button 
            type="submit" 
            className="w-full love-gradient text-primary-foreground border-0 py-6 text-lg"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Creating profile...
              </>
            ) : (
              <>
                <Heart className="mr-2 h-5 w-5" />
                Start Finding Matches
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
