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
  // ADDED: the column exists in the schema and every profile query already
  // selects it, but it was missing from this interface — so TypeScript
  // silently thought `profile.is_verified` was an error anywhere you tried
  // to use it.
  is_verified: boolean
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
  is_active: boolean
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

export type CallKind = 'audio' | 'video'
export type CallStatus = 'ringing' | 'accepted' | 'declined' | 'ended' | 'missed'

export interface Call {
  id: string
  match_id: string
  caller_id: string
  callee_id: string
  kind: CallKind
  status: CallStatus
  room_name: string
  created_at: string
  answered_at: string | null
  ended_at: string | null
}

export interface Block {
  id: string
  blocker_id: string
  blocked_id: string
  created_at: string
}

export type ReportReason =
  | 'harassment'
  | 'inappropriate_photos'
  | 'spam_or_scam'
  | 'fake_profile'
  | 'underage'
  | 'other'

export interface Report {
  id: string
  reporter_id: string
  reported_id: string
  match_id: string | null
  reason: ReportReason
  details: string | null
  status: 'open' | 'reviewing' | 'actioned' | 'dismissed'
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
