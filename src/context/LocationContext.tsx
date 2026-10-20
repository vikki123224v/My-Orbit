import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
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

interface LocationContextType extends GeolocationState {
  startTracking: () => void
  stopTracking: () => Promise<void>
}

const LocationContext = createContext<LocationContextType>({
  coords: null,
  isTracking: false,
  error: null,
  permissionStatus: 'unknown',
  startTracking: () => {},
  stopTracking: async () => {},
})

export const LocationProvider: React.FC<{ userId: string | null; children: React.ReactNode }> = ({
  userId,
  children,
}) => {
  const [coords, setCoords] = useState<{
    latitude: number
    longitude: number
    accuracy: number | null
  } | null>(null)
  const [isTracking, setIsTracking] = useState<boolean>(() => {
    return localStorage.getItem('orbit_sharing_active') === 'true'
  })
  const [error, setError] = useState<string | null>(null)
  const [permissionStatus, setPermissionStatus] = useState<'prompt' | 'granted' | 'denied' | 'unknown'>('unknown')

  const watchIdRef = useRef<number | null>(null)
  const lastWriteTimeRef = useRef<number>(0)
  const lastCoordsRef = useRef<{ lat: number; lng: number } | null>(null)

  // Query browser permissions if supported
  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: 'geolocation' as PermissionName })
        .then((result) => {
          setPermissionStatus(result.state as any)
          result.onchange = () => {
            setPermissionStatus(result.state as any)
          }
        })
        .catch(() => {
          setPermissionStatus('unknown')
        })
    }
  }, [])

  // Throttled database update (minimum 10 seconds between writes, or > 15 meters delta)
  const syncLocationToSupabase = useCallback(
    async (lat: number, lng: number, accuracy: number | null) => {
      if (!userId || !isSupabaseConfigured) return

      const now = Date.now()
      const timeSinceLastWrite = now - lastWriteTimeRef.current

      // Throttle: write at most once every 10 seconds unless coordinates moved significantly
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
      setError('Geolocation is not supported by your browser.')
      return
    }

    setIsTracking(true)
    setError(null)
    localStorage.setItem('orbit_sharing_active', 'true')

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords
        setCoords({ latitude, longitude, accuracy })
        setError(null)
        setPermissionStatus('granted')

        syncLocationToSupabase(latitude, longitude, accuracy)
      },
      (geoError) => {
        let msg = 'Failed to retrieve location.'
        if (geoError.code === geoError.PERMISSION_DENIED) {
          msg = 'Location permission was denied in your browser settings.'
          setPermissionStatus('denied')
        } else if (geoError.code === geoError.POSITION_UNAVAILABLE) {
          msg = 'Location information is currently unavailable.'
        } else if (geoError.code === geoError.TIMEOUT) {
          msg = 'Location request timed out.'
        }
        setError(msg)
        setIsTracking(false)
        localStorage.removeItem('orbit_sharing_active')
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

    setIsTracking(false)
    setCoords(null)
    localStorage.removeItem('orbit_sharing_active')

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

  // Auto-resume tracking across route changes if sharing was left active in this session
  useEffect(() => {
    if (userId && isTracking && watchIdRef.current === null) {
      startTracking()
    }
  }, [userId, isTracking, startTracking])

  // When tab is closed or user logs out, stop watcher
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Browser closing
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  return (
    <LocationContext.Provider
      value={{
        coords,
        isTracking,
        error,
        permissionStatus,
        startTracking,
        stopTracking,
      }}
    >
      {children}
    </LocationContext.Provider>
  )
}

export const useLocationTracker = () => useContext(LocationContext)
