import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { AuthorizedFriendLocation } from '../types/database'
import { calculateDistanceKm } from '../utils/geoUtils'

export function useAuthorizedLocations(userCoords: { latitude: number; longitude: number } | null) {
  const [locations, setLocations] = useState<AuthorizedFriendLocation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const channelRef = useRef<any>(null)

  const fetchLocations = useCallback(async () => {
    if (!isSupabaseConfigured) return
    try {
      const { data, error: rpcError } = await supabase.rpc('get_authorized_friend_locations')
      if (rpcError) {
        console.error('Error in get_authorized_friend_locations:', rpcError)
        setError(rpcError.message)
        return
      }

      const list: AuthorizedFriendLocation[] = (data || []).map((item: any) => {
        let dist: number | undefined = undefined
        if (
          userCoords &&
          item.latitude !== null &&
          item.longitude !== null
        ) {
          dist = calculateDistanceKm(
            userCoords.latitude,
            userCoords.longitude,
            item.latitude,
            item.longitude
          )
        }

        return {
          friend_id: item.friend_id,
          username: item.username,
          display_name: item.display_name,
          avatar_url: item.avatar_url,
          latitude: item.latitude,
          longitude: item.longitude,
          accuracy_meters: item.accuracy_meters,
          last_updated: item.last_updated,
          sharing_enabled: item.sharing_enabled,
          morphed_presence: item.morphed_presence,
          distance_meters: dist !== undefined ? Math.round(dist * 1000) : undefined,
        }
      })

      setLocations(list)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch friend locations.')
    } finally {
      setLoading(false)
    }
  }, [userCoords])

  useEffect(() => {
    fetchLocations()

    // Setup Supabase Realtime listener on current_locations table
    if (isSupabaseConfigured) {
      channelRef.current = supabase
        .channel('orbit-location-updates')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'current_locations' },
          () => {
            // Re-fetch authorized locations to apply RLS / RPC verification safely
            fetchLocations()
          }
        )
        .subscribe()
    }

    // Refresh every 30 seconds to update relative times and check staleness
    const interval = setInterval(() => {
      fetchLocations()
    }, 30000)

    return () => {
      clearInterval(interval)
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [fetchLocations])

  return {
    locations,
    loading,
    error,
    refreshLocations: fetchLocations,
  }
}
