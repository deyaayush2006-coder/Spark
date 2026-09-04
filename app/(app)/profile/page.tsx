import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/supabase/auth'
import { ProfileView } from '@/components/profile-view'

export default async function ProfilePage() {
  const supabase = await createClient()
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Four independent reads, previously awaited one after another: the page
  // couldn't paint until all four round trips had finished in sequence.
  const [
    { data: profile },
    { count: followersCount },
    { count: followingCount },
    { count: matchesCount },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, name, age, gender, interested_in, bio, location, occupation, interests, photos, instagram_url, spotify_url, is_verified, is_bot, created_at, updated_at')
      .eq('id', user.id)
      .single(),
    supabase
      .from('followers')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', user.id),
    supabase
      .from('followers')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', user.id),
    supabase
      .from('matches')
      .select('*', { count: 'exact', head: true })
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`),
  ])

  if (!profile) {
    redirect('/profile/setup')
  }

  return (
    <div className="min-h-screen bg-background">
      <ProfileView 
        profile={profile} 
        isOwnProfile={true}
        stats={{
          followers: followersCount || 0,
          following: followingCount || 0,
          matches: matchesCount || 0,
        }}
      />
    </div>
  )
}
