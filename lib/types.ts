export interface Profile {
  id: string
  name: string
  age: number
  gender: 'male' | 'female' | 'non-binary' | 'other'
  interested_in: 'male' | 'female' | 'everyone'
  bio: string | null
  location: string | null
  occupation: string | null
  interests: string[] | null
  photos: string[] | null
  instagram_url: string | null
  spotify_url: string | null
  is_bot: boolean
  created_at: string
  updated_at: string
}

export interface Swipe {
  id: string
  swiper_id: string
  swiped_id: string
  direction: 'left' | 'right' | 'super'
  created_at: string
}

export interface Match {
  id: string
  user1_id: string
  user2_id: string
  matched_at: string
  profile?: Profile
}

export interface Message {
  id: string
  match_id: string
  sender_id: string
  content: string
  read: boolean
  created_at: string
}

export interface Follower {
  id: string
  follower_id: string
  following_id: string
  created_at: string
  profile?: Profile
}

export interface FriendRequest {
  id: string
  sender_id: string
  receiver_id: string
  status: 'pending' | 'accepted' | 'rejected'
  created_at: string
  updated_at: string
  sender?: Profile
  receiver?: Profile
}

export interface MatchWithProfile extends Match {
  profile: Profile
  lastMessage?: Message
  unreadCount?: number
}
