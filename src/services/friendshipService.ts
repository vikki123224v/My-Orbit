import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { Profile, FriendRequest } from '../types/database'

export interface FriendWithProfile {
  friendship_id: string
  friend: Profile
  created_at: string
}

export const friendshipService = {
  // Search public profiles by exact or partial username (excluding self)
  async searchUsers(query: string, currentUserId: string): Promise<Profile[]> {
    if (!isSupabaseConfigured || !query.trim()) return []

    const cleanQuery = query.trim().toLowerCase()
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', currentUserId)
      .ilike('username', `%${cleanQuery}%`)
      .limit(20)

    if (error) {
      console.error('Error searching users:', error)
      throw error
    }
    return (data || []) as Profile[]
  },

  // Fetch all accepted friendships for the current user
  async getFriends(currentUserId: string): Promise<FriendWithProfile[]> {
    if (!isSupabaseConfigured) return []

    const { data, error } = await supabase
      .from('friendships')
      .select(`
        id,
        user_a_id,
        user_b_id,
        created_at
      `)
      .or(`user_a_id.eq.${currentUserId},user_b_id.eq.${currentUserId}`)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching friendships:', error)
      throw error
    }

    if (!data || data.length === 0) return []

    // Collect IDs of the other user in each friendship
    const friendIds = data.map((f) =>
      f.user_a_id === currentUserId ? f.user_b_id : f.user_a_id
    )

    // Fetch friend profiles
    const { data: profiles, error: profileErr } = await supabase
      .from('profiles')
      .select('*')
      .in('id', friendIds)

    if (profileErr) throw profileErr

    const profileMap = new Map((profiles || []).map((p) => [p.id, p as Profile]))

    return data
      .map((f) => {
        const otherId = f.user_a_id === currentUserId ? f.user_b_id : f.user_a_id
        const friendProfile = profileMap.get(otherId)
        if (!friendProfile) return null
        return {
          friendship_id: f.id,
          friend: friendProfile,
          created_at: f.created_at,
        }
      })
      .filter(Boolean) as FriendWithProfile[]
  },

  // Fetch incoming friend requests
  async getIncomingRequests(currentUserId: string): Promise<FriendRequest[]> {
    if (!isSupabaseConfigured) return []

    const { data, error } = await supabase
      .from('friend_requests')
      .select(`
        id,
        sender_id,
        receiver_id,
        status,
        created_at,
        updated_at,
        sender:profiles!friend_requests_sender_id_fkey(*)
      `)
      .eq('receiver_id', currentUserId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching incoming requests:', error)
      throw error
    }
    return (data || []) as unknown as FriendRequest[]
  },

  // Fetch outgoing pending friend requests
  async getOutgoingRequests(currentUserId: string): Promise<FriendRequest[]> {
    if (!isSupabaseConfigured) return []

    const { data, error } = await supabase
      .from('friend_requests')
      .select(`
        id,
        sender_id,
        receiver_id,
        status,
        created_at,
        updated_at,
        receiver:profiles!friend_requests_receiver_id_fkey(*)
      `)
      .eq('sender_id', currentUserId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching outgoing requests:', error)
      throw error
    }
    return (data || []) as unknown as FriendRequest[]
  },

  // Send a new friend request
  async sendFriendRequest(senderId: string, receiverId: string): Promise<void> {
    if (!isSupabaseConfigured) return
    if (senderId === receiverId) {
      throw new Error('You cannot send a friend request to yourself.')
    }

    const { error } = await supabase.from('friend_requests').insert({
      sender_id: senderId,
      receiver_id: receiverId,
      status: 'pending',
    })

    if (error) {
      if (error.code === '23505') {
        throw new Error('A friend request between you and this user is already pending.')
      }
      throw error
    }
  },

  // Accept incoming friend request via RPC
  async acceptRequest(requestId: string): Promise<void> {
    if (!isSupabaseConfigured) return

    const { error } = await supabase.rpc('accept_friend_request', {
      p_request_id: requestId,
    })

    if (error) {
      console.error('RPC error accepting request:', error)
      throw error
    }
  },

  // Reject incoming friend request
  async rejectRequest(requestId: string): Promise<void> {
    if (!isSupabaseConfigured) return

    const { error } = await supabase
      .from('friend_requests')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', requestId)

    if (error) throw error
  },

  // Cancel outgoing request
  async cancelOutgoingRequest(requestId: string): Promise<void> {
    if (!isSupabaseConfigured) return

    const { error } = await supabase
      .from('friend_requests')
      .delete()
      .eq('id', requestId)

    if (error) throw error
  },

  // Remove existing friend via RPC
  async removeFriend(friendId: string): Promise<void> {
    if (!isSupabaseConfigured) return

    const { error } = await supabase.rpc('remove_friendship', {
      p_friend_id: friendId,
    })

    if (error) {
      console.error('RPC error removing friendship:', error)
      throw error
    }
  },
}
