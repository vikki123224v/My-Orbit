import { supabase, isSupabaseConfigured } from '../lib/supabase'

export interface FriendPermissionItem {
  friend_id: string
  username: string
  display_name: string
  avatar_url: string | null
  permission_granted: boolean // Did the current user grant permission to this friend?
  permission_received: boolean // Did this friend grant permission to current user?
}

export const privacyService = {
  // Get master location sharing switch state for current user
  async getSharingState(userId: string): Promise<boolean> {
    if (!isConfigured(userId)) return false

    const { data, error } = await supabase
      .from('current_locations')
      .select('sharing_enabled')
      .eq('owner_id', userId)
      .single()

    if (error) {
      console.error('Error fetching sharing state:', error)
      return false
    }
    return Boolean(data?.sharing_enabled)
  },

  // Toggle master location sharing switch
  // When turned OFF: immediately wipes coordinates and marks sharing_enabled = false
  async setSharingState(userId: string, enabled: boolean): Promise<void> {
    if (!isConfigured(userId)) return

    if (!enabled) {
      // Instant kill-switch: clear exact coordinates
      const { error } = await supabase
        .from('current_locations')
        .update({
          sharing_enabled: false,
          latitude: null,
          longitude: null,
          accuracy_meters: null,
          updated_at: new Date().toISOString(),
        })
        .eq('owner_id', userId)

      if (error) throw error
    } else {
      const { error } = await supabase
        .from('current_locations')
        .update({
          sharing_enabled: true,
          updated_at: new Date().toISOString(),
        })
        .eq('owner_id', userId)

      if (error) throw error
    }
  },

  // Get Morphed Presence privacy setting
  async getMorphedPresence(userId: string): Promise<boolean> {
    if (!isConfigured(userId)) return false

    const { data, error } = await supabase
      .from('presence_preferences')
      .select('morphed_presence_enabled')
      .eq('owner_id', userId)
      .single()

    if (error) return false
    return Boolean(data?.morphed_presence_enabled)
  },

  // Set Morphed Presence privacy mode
  async setMorphedPresence(userId: string, enabled: boolean): Promise<void> {
    if (!isConfigured(userId)) return

    // First try UPDATE (row should exist from trigger on sign-up)
    const { data: existing } = await supabase
      .from('presence_preferences')
      .select('owner_id')
      .eq('owner_id', userId)
      .single()

    if (existing) {
      const { error } = await supabase
        .from('presence_preferences')
        .update({
          morphed_presence_enabled: enabled,
          updated_at: new Date().toISOString(),
        })
        .eq('owner_id', userId)
      if (error) throw error
    } else {
      // Row missing (e.g. Google OAuth user before trigger ran) — insert
      const { error } = await supabase
        .from('presence_preferences')
        .insert({
          owner_id: userId,
          morphed_presence_enabled: enabled,
          updated_at: new Date().toISOString(),
        })
      if (error) throw error
    }
  },

  // Fetch friend-by-friend permissions list
  async getFriendPermissions(userId: string): Promise<FriendPermissionItem[]> {
    if (!isConfigured(userId)) return []

    // 1. Fetch all friendships
    const { data: friendships, error: fErr } = await supabase
      .from('friendships')
      .select('user_a_id, user_b_id')
      .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)

    if (fErr || !friendships || friendships.length === 0) return []

    const friendIds = friendships.map((f) =>
      f.user_a_id === userId ? f.user_b_id : f.user_a_id
    )

    // 2. Fetch profiles of friends
    const { data: profiles, error: pErr } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .in('id', friendIds)

    if (pErr || !profiles) return []

    // 3. Fetch permissions granted by current user (owner_id = userId)
    const { data: grantedPerms } = await supabase
      .from('location_sharing_permissions')
      .select('viewer_id, enabled')
      .eq('owner_id', userId)
      .in('viewer_id', friendIds)

    // 4. Fetch permissions received by current user (viewer_id = userId)
    const { data: receivedPerms } = await supabase
      .from('location_sharing_permissions')
      .select('owner_id, enabled')
      .eq('viewer_id', userId)
      .in('owner_id', friendIds)

    const grantedMap = new Map((grantedPerms || []).map((p) => [p.viewer_id, p.enabled]))
    const receivedMap = new Map((receivedPerms || []).map((p) => [p.owner_id, p.enabled]))

    return profiles.map((prof) => ({
      friend_id: prof.id,
      username: prof.username,
      display_name: prof.display_name,
      avatar_url: prof.avatar_url,
      permission_granted: Boolean(grantedMap.get(prof.id)),
      permission_received: Boolean(receivedMap.get(prof.id)),
    }))
  },

  // Explicit friend-by-friend permission toggle (Directional: owner -> viewer)
  async toggleFriendPermission(ownerId: string, viewerId: string, enable: boolean): Promise<void> {
    if (!isConfigured(ownerId)) return

    const { error } = await supabase
      .from('location_sharing_permissions')
      .upsert({
        owner_id: ownerId,
        viewer_id: viewerId,
        enabled: enable,
        updated_at: new Date().toISOString(),
      })

    if (error) throw error
  },
}

function isConfigured(id: string) {
  return Boolean(id && isSupabaseConfigured)
}
