export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Profile {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  bio: string | null
  created_at: string
  updated_at: string
}

export type FriendRequestStatus = 'pending' | 'accepted' | 'rejected'

export interface FriendRequest {
  id: string
  sender_id: string
  receiver_id: string
  status: FriendRequestStatus
  created_at: string
  updated_at: string
  sender?: Profile
  receiver?: Profile
}

export interface Friendship {
  id: string
  user_a_id: string
  user_b_id: string
  created_at: string
  friend?: Profile
}

export interface LocationSharingPermission {
  id: string
  owner_id: string
  viewer_id: string
  enabled: boolean
  created_at: string
  updated_at: string
}

export interface CurrentLocation {
  owner_id: string
  latitude: number
  longitude: number
  accuracy_meters: number | null
  updated_at: string
  sharing_enabled: boolean
}

export interface PresencePreferences {
  owner_id: string
  morphed_presence_enabled: boolean
  updated_at: string
}

export interface AuthorizedFriendLocation {
  friend_id: string
  username: string
  display_name: string
  avatar_url: string | null
  latitude: number | null
  longitude: number | null
  accuracy_meters: number | null
  last_updated: string | null
  sharing_enabled: boolean
  morphed_presence: boolean
  distance_meters?: number
}
