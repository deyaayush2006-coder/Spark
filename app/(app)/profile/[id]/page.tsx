import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfileView } from '@/components/profile-view'

export default async function ViewProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
<<<<<<< HEAD
    .select('*')
=======
    .select('id, name, age, gender, interested_in, bio, location, occupation, interests, photos, instagram_url, spotify_url, is_verified, is_bot, created_at, updated_at')
>>>>>>> 2335d4b (version 2.0)
    .eq('id', id)
    .single()

  if (!profile) {
    notFound()
  }

  // Get followers count
  const { count: followersCount } = await supabase
    .from('followers')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', id)

  // Get following count
  const { count: followingCount } = await supabase
    .from('followers')
    .select('*', { count: 'exact', head: true })
    .eq('follower_id', id)

  return (
    <div className="min-h-screen bg-background">
      <ProfileView 
        profile={profile} 
        isOwnProfile={user?.id === id}
        stats={{
          followers: followersCount || 0,
          following: followingCount || 0,
          matches: 0,
        }}
      />
    </div>
  )
}
