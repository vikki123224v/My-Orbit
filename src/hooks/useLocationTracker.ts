import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

interface GeolocationState {
  coords: {
    latitude: number
    longitude: number
    accuracy: number | null
  } | null
  isTracking: boolean
  error: string | null
  permissionStatus: 'prompt' | 'granted' | 'denied' | 'unknown'
}

export function useLocationTracker(userId: string | null) {
  const [state, setState] = useState<GeolocationState>({
    coords: null,
    isTracking: false,
    error: null,
    permissionStatus: 'unknown',
  })

  const watchIdRef = useRef<number | null>(null)
  const lastWriteTimeRef = useRef<number>(0)
  const lastCoordsRef = useRef<{ lat: number; lng: number } | null>(null)

  // Query browser permissions if supported
  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: 'geolocation' as PermissionName })
        .then((result) => {
          setState((prev) => ({ ...prev, permissionStatus: result.state }))
          result.onchange = () => {
            setState((prev) => ({ ...prev, permissionStatus: result.state }))
          }
        })
        .catch(() => {
          setState((prev) => ({ ...prev, permissionStatus: 'unknown' }))
        })
    }
  }, [])

  // Throttled database update (minimum 10 seconds between writes, or > 15 meters delta)
  const syncLocationToSupabase = useCallback(
    async (lat: number, lng: number, accuracy: number | null) => {
      if (!userId || !isSupabaseConfigured) return

      const now = Date.now()
      const timeSinceLastWrite = now - lastWriteTimeRef.current

      // Throttle: write at most once every 10 seconds
      if (timeSinceLastWrite < 10000 && lastCoordsRef.current) {
        return
      }

      lastWriteTimeRef.current = now
      lastCoordsRef.current = { lat, lng }

      try {
        await supabase
          .from('current_locations')
          .upsert({
            owner_id: userId,
            latitude: lat,
            longitude: lng,
            accuracy_meters: accuracy,
            sharing_enabled: true,
            updated_at: new Date().toISOString(),
          })
      } catch (err) {
        console.error('Failed to sync location coordinates:', err)
      }
    },
    [userId]
  )

  // Start watching position
  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        error: 'Geolocation is not supported by your browser.',
      }))
      return
    }

    setState((prev) => ({ ...prev, isTracking: true, error: null }))

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords
        setState((prev) => ({
          ...prev,
          coords: { latitude, longitude, accuracy },
          error: null,
          permissionStatus: 'granted',
        }))

        syncLocationToSupabase(latitude, longitude, accuracy)
      },
      (geoError) => {
        let msg = 'Failed to retrieve location.'
        if (geoError.code === geoError.PERMISSION_DENIED) {
          msg = 'Location permission was denied in your browser settings.'
          setState((prev) => ({ ...prev, permissionStatus: 'denied' }))
        } else if (geoError.code === geoError.POSITION_UNAVAILABLE) {
          msg = 'Location information is currently unavailable.'
        } else if (geoError.code === geoError.TIMEOUT) {
          msg = 'Location request timed out.'
        }
        setState((prev) => ({ ...prev, error: msg, isTracking: false }))
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      }
    )
  }, [syncLocationToSupabase])

  // Stop watching position & purge coordinates
  const stopTracking = useCallback(async () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }

    setState((prev) => ({ ...prev, isTracking: false, coords: null }))

    if (userId && isSupabaseConfigured) {
      try {
        await supabase
          .from('current_locations')
          .update({
            sharing_enabled: false,
            latitude: null,
            longitude: null,
            accuracy_meters: null,
            updated_at: new Date().toISOString(),
          })
          .eq('owner_id', userId)
      } catch (err) {
        console.error('Error clearing location upon stop:', err)
      }
    }
  }, [userId])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [])

  return {
    ...state,
    startTracking,
    stopTracking,
  }
}
