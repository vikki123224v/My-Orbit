import React, { useState, useMemo } from 'react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap,
} from 'react-leaflet'
import { useLocationTracker } from '../hooks/useLocationTracker'
import { useAuthorizedLocations } from '../hooks/useAuthorizedLocations'
import { createUserMarkerIcon } from '../components/MapMarkers'
import { formatDistance, formatLastUpdated } from '../utils/geoUtils'
import { useTheme } from '../context/ThemeContext'
import type { AuthorizedFriendLocation } from '../types/database'
import {
  Sliders,
  Crosshair,
  RefreshCw,
  Search,
  Users,
  Navigation,
  ShieldAlert,
  Compass,
  AlertTriangle,
  Radio,
  WifiOff,
} from 'lucide-react'

// Recenter Map Helper Component
function MapViewController({
  center,
  zoom,
}: {
  center: [number, number]
  zoom: number
}) {
  const map = useMap()
  React.useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.2 })
  }, [center, zoom, map])
  return null
}

// Map tile configs
// Uses OpenStreetMap tiles (100% free, no API key required, reliable worldwide)
// In dark mode, .map-tiles-dark CSS filter transforms tiles into a sleek dark theme
const OSM_TILE = {
  url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 19,
}

// Fallback CARTO tiles if user configures VITE_CARTO_API_KEY in .env
const cartoKey = import.meta.env.VITE_CARTO_API_KEY
const CARTO_DARK_TILE = {
  url: cartoKey
    ? `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${cartoKey}`
    : OSM_TILE.url,
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  maxZoom: 19,
}

const CARTO_LIGHT_TILE = {
  url: cartoKey
    ? `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?key=${cartoKey}`
    : OSM_TILE.url,
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  maxZoom: 19,
}

export const OrbitMapDashboard: React.FC = () => {
  const tracker = useLocationTracker()
  const { locations, loading, refreshLocations } = useAuthorizedLocations(tracker.coords)
  const { isDark } = useTheme()

  const [rangeKm, setRangeKm] = useState<number | 'all'>(5)
  const [selectedFriend, setSelectedFriend] = useState<AuthorizedFriendLocation | null>(null)
  const [searchFriendText, setSearchFriendText] = useState('')
  const [mapCenter, setMapCenter] = useState<[number, number]>([13.3409, 74.7421])
  const [mapZoom, setMapZoom] = useState<number>(14)
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false)

  // Sync map center to user's position when tracking becomes active
  React.useEffect(() => {
    if (tracker.coords) {
      setMapCenter([tracker.coords.latitude, tracker.coords.longitude])
    }
  }, [tracker.coords])

  // Filter friends based on range and search text
  const filteredFriends = useMemo(() => {
    return locations.filter((f) => {
      const matchesSearch =
        f.display_name.toLowerCase().includes(searchFriendText.toLowerCase()) ||
        f.username.toLowerCase().includes(searchFriendText.toLowerCase())

      if (!matchesSearch) return false
      if (rangeKm === 'all') return true
      if (f.distance_meters === undefined) return true
      return f.distance_meters <= rangeKm * 1000
    })
  }, [locations, rangeKm, searchFriendText])

  // Toggle location sharing: show consent dialog if OFF, stop if ON
  const handleShareToggle = () => {
    if (tracker.isTracking) {
      tracker.stopTracking()
    } else {
      setShowPermissionPrompt(true)
    }
  }

  const handleConfirmStartSharing = () => {
    setShowPermissionPrompt(false)
    tracker.startTracking()
  }

  const handleFocusFriend = (friend: AuthorizedFriendLocation) => {
    setSelectedFriend(friend)
    if (friend.latitude !== null && friend.longitude !== null) {
      setMapCenter([friend.latitude, friend.longitude])
      setMapZoom(16)
    }
  }

  const handleRecenterSelf = () => {
    if (tracker.coords) {
      setMapCenter([tracker.coords.latitude, tracker.coords.longitude])
      setMapZoom(15)
    }
  }

  const [isControlsOpen, setIsControlsOpen] = useState(false)

  // If CARTO key is provided, use CARTO tiles. Otherwise, use OSM with dark filter in dark mode.
  const tile = cartoKey ? (isDark ? CARTO_DARK_TILE : CARTO_LIGHT_TILE) : OSM_TILE
  const tileClassName = !cartoKey && isDark ? 'map-tiles-dark' : undefined

  return (
    <div
      className="relative w-full h-[calc(100dvh-7.5rem)] md:h-screen flex flex-col overflow-hidden"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {/* Top Floating Control Bar */}
      <div className="absolute top-3 left-3 right-3 sm:top-4 sm:left-4 sm:right-4 z-[1000] flex gap-2 pointer-events-none safe-left safe-right">
        {/* Search Bar */}
        <div className="pointer-events-auto flex-1 max-w-md glass-panel rounded-2xl p-1.5 flex items-center gap-2 shadow-2xl">
          <div className="pl-2.5" style={{ color: 'var(--text-muted)' }}>
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchFriendText}
            onChange={(e) => setSearchFriendText(e.target.value)}
            placeholder="Search nearby friends..."
            className="w-full bg-transparent text-sm focus:outline-none"
            style={{ color: 'var(--text-primary)' }}
          />
          {searchFriendText && (
            <button
              onClick={() => setSearchFriendText('')}
              className="pr-2.5 text-xs hover:text-white transition"
              style={{ color: 'var(--text-muted)' }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Quick Action Buttons */}
        <div className="pointer-events-auto flex items-center gap-1.5 shrink-0">
          {/* Mobile toggle for filter/radar panel */}
          <button
            onClick={() => setIsControlsOpen((prev) => !prev)}
            className={`sm:hidden p-2.5 rounded-2xl glass-panel transition shadow-xl ${
              isControlsOpen ? 'border-violet-500 bg-violet-600/20 text-violet-400' : 'text-gray-300'
            }`}
            title="Radar & Radius Filters"
          >
            <Sliders className="w-4 h-4" />
          </button>

          <button
            onClick={handleRecenterSelf}
            disabled={!tracker.coords}
            title="Recenter to my location"
            className="p-2.5 sm:p-3 rounded-2xl glass-panel hover:border-violet-500/30 disabled:opacity-40 transition shadow-xl active:scale-95"
          >
            <Crosshair className="w-4 h-4 text-cyan-400" />
          </button>

          <button
            onClick={() => refreshLocations()}
            title="Refresh map coordinates"
            className="p-2.5 sm:p-3 rounded-2xl glass-panel hover:border-violet-500/30 transition shadow-xl active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 text-violet-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Floating Control Card (Left Side Desktop, Drawer on Mobile) */}
      <div
        className={`absolute top-16 left-3 sm:top-20 sm:left-4 z-[1000] w-72 max-w-[calc(100vw-1.5rem)] glass-panel rounded-2xl p-4 shadow-2xl space-y-4 transition-all duration-300 ${
          isControlsOpen ? 'block animate-fade-in' : 'hidden sm:block'
        }`}
      >
        {/* Location Sharing Toggle */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition ${
                tracker.isTracking
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-white/5 text-gray-500'
              }`}
            >
              {tracker.isTracking ? (
                <Radio className="w-4 h-4 animate-pulse" />
              ) : (
                <WifiOff className="w-4 h-4" />
              )}
            </div>
            <div className="min-w-0">
              <span className="text-xs font-semibold block" style={{ color: 'var(--text-primary)' }}>
                Location Sharing
              </span>
              <span className="text-[11px] truncate block" style={{ color: 'var(--text-muted)' }}>
                {tracker.isTracking ? 'Broadcasting live' : 'OFF — Protected'}
              </span>
            </div>
          </div>

          <button
            onClick={handleShareToggle}
            type="button"
            role="switch"
            aria-checked={tracker.isTracking}
            className={`w-11 h-6 rounded-full transition-colors p-0.5 relative shrink-0 toggle-track ${
              tracker.isTracking ? 'bg-emerald-500' : 'bg-gray-600'
            }`}
          >
            <div
              className="w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200"
              style={{ transform: tracker.isTracking ? 'translateX(20px)' : 'translateX(0)' }}
            />
          </button>
        </div>

        {/* Range Selector */}
        <div className="space-y-2 pt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
              <Sliders className="w-3.5 h-3.5 text-violet-400" />
              Radius:
            </span>
            <span className="font-bold text-violet-400">
              {rangeKm === 'all' ? 'All' : `${rangeKm} km`}
            </span>
          </div>

          <div className="grid grid-cols-5 gap-1 bg-black/20 p-1 rounded-xl text-xs font-semibold">
            {[1, 5, 10, 25, 'all'].map((val) => (
              <button
                key={val}
                onClick={() => {
                  setRangeKm(val as number | 'all')
                }}
                className={`py-1.5 rounded-lg transition active:scale-95 ${
                  rangeKm === val
                    ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                    : 'hover:text-white'
                }`}
                style={{ color: rangeKm === val ? undefined : 'var(--text-muted)' }}
              >
                {val === 'all' ? 'All' : `${val}k`}
              </button>
            ))}
          </div>
        </div>

        {/* Friends count indicator */}
        {locations.length > 0 && (
          <div className="flex items-center justify-between text-xs pt-1" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <span className="flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
              <Users className="w-3.5 h-3.5 text-violet-400" />
              Visible Friends
            </span>
            <span className="font-bold text-violet-400">{filteredFriends.length}</span>
          </div>
        )}

        {/* Error Display */}
        {tracker.error && (
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <span>{tracker.error}</span>
          </div>
        )}
      </div>

      {/* Main Interactive Map */}
      <div className="flex-1 w-full h-full">
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          zoomControl={false}
          className="w-full h-full"
        >
          <MapViewController center={mapCenter} zoom={mapZoom} />

          {/* Interactive Map Tiles — OpenStreetMap default (free, no API key required) */}
          <TileLayer
            attribution={tile.attribution}
            url={tile.url}
            maxZoom={tile.maxZoom}
            className={tileClassName}
            subdomains={cartoKey ? 'abcd' : 'abc'}
          />

          {/* Self Marker & Range Circles */}
          {tracker.coords && (
            <>
              {rangeKm !== 'all' && (
                <Circle
                  center={[tracker.coords.latitude, tracker.coords.longitude]}
                  radius={rangeKm * 1000}
                  pathOptions={{
                    color: '#8b5cf6',
                    fillColor: '#8b5cf6',
                    fillOpacity: 0.05,
                    weight: 1.5,
                    dashArray: '4, 8',
                  }}
                />
              )}

              {tracker.coords.accuracy && (
                <Circle
                  center={[tracker.coords.latitude, tracker.coords.longitude]}
                  radius={Math.min(tracker.coords.accuracy, 200)}
                  pathOptions={{
                    color: '#06b6d4',
                    fillColor: '#06b6d4',
                    fillOpacity: 0.15,
                    weight: 1,
                  }}
                />
              )}

              <Marker
                position={[tracker.coords.latitude, tracker.coords.longitude]}
                icon={createUserMarkerIcon(null, 'You', true)}
              >
                <Popup>
                  <div className="p-3 text-left space-y-1" style={{ color: 'var(--popup-text)' }}>
                    <p className="font-bold text-sm">Your Location</p>
                    <p className="text-xs text-cyan-400 font-semibold">Broadcasting Live</p>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      Accuracy: ~{Math.round(tracker.coords.accuracy || 10)} meters
                    </p>
                  </div>
                </Popup>
              </Marker>
            </>
          )}

          {/* Authorized Friend Markers */}
          {filteredFriends.map((friend) => {
            if (friend.morphed_presence) return null
            if (friend.latitude === null || friend.longitude === null) return null

            return (
              <Marker
                key={friend.friend_id}
                position={[friend.latitude, friend.longitude]}
                icon={createUserMarkerIcon(friend.avatar_url, friend.display_name, false)}
                eventHandlers={{
                  click: () => setSelectedFriend(friend),
                }}
              >
                <Popup>
                  <div className="p-3 text-left space-y-2 min-w-[200px]" style={{ color: 'var(--popup-text)' }}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-violet-600/30 flex items-center justify-center font-bold text-xs text-violet-300 overflow-hidden shrink-0">
                        {friend.avatar_url ? (
                          <img src={friend.avatar_url} alt={friend.display_name} className="w-full h-full object-cover" />
                        ) : (
                          friend.display_name[0].toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm truncate">{friend.display_name}</p>
                        <p className="text-[11px] font-mono truncate" style={{ color: 'var(--text-muted)' }}>
                          @{friend.username}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between text-xs" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                      <span className="text-violet-400 font-semibold">
                        {formatDistance(friend.distance_meters ? friend.distance_meters / 1000 : null)}
                      </span>
                      <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        {formatLastUpdated(friend.last_updated)}
                      </span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            )
          })}
        </MapContainer>
      </div>

      {/* Bottom Nearby Friends Drawer (Mobile bottom sheet / Desktop bottom panel) */}
      <div className="absolute bottom-2 left-2 right-2 sm:bottom-4 sm:left-4 sm:right-4 z-[1000] pointer-events-none safe-bottom safe-left safe-right">
        <div className="pointer-events-auto max-w-4xl mx-auto glass-panel p-3 sm:p-4 rounded-2xl sm:rounded-3xl shadow-2xl space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <span className="font-bold text-xs sm:text-sm flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-violet-400" />
              Nearby Friends ({filteredFriends.length})
            </span>
            <span className="text-[11px] sm:text-xs" style={{ color: 'var(--text-muted)' }}>
              {rangeKm === 'all' ? 'Any distance' : `Within ${rangeKm} km`}
            </span>
          </div>

          {filteredFriends.length === 0 ? (
            <div className="py-2.5 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
              {locations.length === 0
                ? 'No friends sharing location. Grant permissions in Privacy settings.'
                : 'No authorized friends visible in this radius.'}
            </div>
          ) : (
            <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none snap-x touch-pan-x">
              {filteredFriends.map((item) => (
                <div
                  key={item.friend_id}
                  onClick={() => handleFocusFriend(item)}
                  className={`min-w-[170px] sm:min-w-[190px] p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border transition cursor-pointer flex items-center justify-between gap-2.5 snap-start shrink-0 active:scale-95 ${
                    selectedFriend?.friend_id === item.friend_id
                      ? 'bg-violet-600/20 border-violet-500/50 shadow-lg shadow-violet-600/20'
                      : 'hover:border-violet-500/20'
                  }`}
                  style={{
                    backgroundColor: selectedFriend?.friend_id === item.friend_id ? undefined : 'var(--bg-card-solid)',
                    borderColor: selectedFriend?.friend_id === item.friend_id ? undefined : 'var(--border-subtle)',
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center font-bold text-xs sm:text-sm text-violet-300 shrink-0 overflow-hidden">
                      {item.avatar_url ? (
                        <img src={item.avatar_url} alt={item.display_name} className="w-full h-full object-cover rounded-full" />
                      ) : (
                        item.display_name[0].toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                        {item.display_name}
                      </p>
                      <p className="text-[10px] font-mono truncate" style={{ color: 'var(--text-muted)' }}>
                        @{item.username}
                      </p>
                      <p className="text-[10px] text-violet-400 font-semibold">
                        {item.morphed_presence
                          ? 'Morphed'
                          : formatDistance(item.distance_meters ? item.distance_meters / 1000 : null)}
                      </p>
                    </div>
                  </div>

                  {!item.morphed_presence && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleFocusFriend(item)
                      }}
                      className="p-1.5 sm:p-2 rounded-xl bg-violet-600/30 hover:bg-violet-600 text-violet-200 hover:text-white transition shrink-0 active:scale-90"
                      title="Focus on map"
                    >
                      <Navigation className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Location Permission Consent Modal */}
      {showPermissionPrompt && (
        <div className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full p-6 rounded-3xl border border-violet-500/30 shadow-2xl space-y-4 animate-fade-in">
            <div className="w-12 h-12 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 mx-auto pulse-ring">
              <Compass className="w-6 h-6 animate-pulse" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Enable Location Sharing</h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Orbit needs browser location access to display your position and calculate distance to nearby friends.
              </p>
            </div>

            <div className="p-3 rounded-xl border text-xs space-y-1.5" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)' }}>
              <p className="flex items-center gap-1.5 font-semibold" style={{ color: 'var(--text-primary)' }}>
                <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
                Privacy Guarantee:
              </p>
              <ul className="list-disc pl-4 space-y-1 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                <li>Only accepted friends with explicit permission can see coordinates.</li>
                <li>You can stop sharing or revoke friends at any time.</li>
                <li>Turning off sharing purges your coordinates immediately.</li>
              </ul>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowPermissionPrompt(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold transition"
                style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmStartSharing}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-semibold shadow-lg shadow-violet-600/30 hover:scale-[1.02] active:scale-[0.98] transition"
              >
                Allow & Share
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
