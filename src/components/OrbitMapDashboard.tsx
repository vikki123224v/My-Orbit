import React, { useState, useMemo } from 'react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap,
} from 'react-leaflet'
import { useAuth } from '../context/AuthContext'
import { useLocationTracker } from '../hooks/useLocationTracker'
import { useAuthorizedLocations } from '../hooks/useAuthorizedLocations'
import { createUserMarkerIcon } from '../components/MapMarkers'
import { formatDistance, formatLastUpdated } from '../utils/geoUtils'
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

export const OrbitMapDashboard: React.FC = () => {
  const { user } = useAuth()
  const tracker = useLocationTracker(user?.id ?? null)
  const { locations, loading, refreshLocations } = useAuthorizedLocations(tracker.coords)

  // Distance Range Filter: 1, 5, 10, 25, or 'all' (default is 5 km)
  const [rangeKm, setRangeKm] = useState<number | 'all'>(5)
  const [selectedFriend, setSelectedFriend] = useState<AuthorizedFriendLocation | null>(null)
  const [searchFriendText, setSearchFriendText] = useState('')
  const [mapCenter, setMapCenter] = useState<[number, number]>([13.3409, 74.7421]) // Default coordinate center
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
      // Username/display filter
      const matchesSearch =
        f.display_name.toLowerCase().includes(searchFriendText.toLowerCase()) ||
        f.username.toLowerCase().includes(searchFriendText.toLowerCase())

      if (!matchesSearch) return false

      // Distance filter
      if (rangeKm === 'all') return true
      if (f.distance_meters === undefined) return true // Show Morphed Presence or uncalculated
      return f.distance_meters <= rangeKm * 1000
    })
  }, [locations, rangeKm, searchFriendText])

  const handleStartSharingClick = () => {
    if (!tracker.isTracking) {
      setShowPermissionPrompt(true)
    } else {
      tracker.stopTracking()
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

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] md:h-screen flex flex-col overflow-hidden bg-[#090d16]">
      {/* Top Floating Control Bar */}
      <div className="absolute top-4 left-4 right-4 z-[1000] flex flex-col sm:flex-row gap-3 pointer-events-none">
        {/* Search Friends Searchbar */}
        <div className="pointer-events-auto flex-1 max-w-md glass-panel rounded-2xl p-1.5 flex items-center gap-2 shadow-2xl border border-white/10">
          <div className="pl-3 text-gray-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchFriendText}
            onChange={(e) => setSearchFriendText(e.target.value)}
            placeholder="Search nearby friends..."
            className="w-full bg-transparent text-sm text-white placeholder-gray-400 focus:outline-none"
          />
          {searchFriendText && (
            <button
              onClick={() => setSearchFriendText('')}
              className="pr-3 text-xs text-gray-400 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>

        {/* Quick Location Action Controls */}
        <div className="pointer-events-auto flex items-center gap-2 self-start sm:self-auto">
          {/* Recenter Button */}
          <button
            onClick={handleRecenterSelf}
            disabled={!tracker.coords}
            title="Recenter to my location"
            className="p-3 rounded-2xl glass-panel border border-white/10 text-gray-300 hover:text-white hover:border-violet-500/30 disabled:opacity-40 transition shadow-xl"
          >
            <Crosshair className="w-4 h-4 text-cyan-400" />
          </button>

          {/* Refresh Action */}
          <button
            onClick={() => refreshLocations()}
            title="Refresh map coordinates"
            className="p-3 rounded-2xl glass-panel border border-white/10 text-gray-300 hover:text-white hover:border-violet-500/30 transition shadow-xl"
          >
            <RefreshCw className={`w-4 h-4 text-violet-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Floating Status & Range Control Card (Left Side) */}
      <div className="absolute top-20 left-4 z-[1000] w-80 max-w-[calc(100vw-2rem)] glass-panel rounded-2xl p-5 border border-white/10 shadow-2xl space-y-4">
        {/* Location Sharing Master Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-white block">
              Location Sharing
            </span>
            <span className="text-[11px] text-gray-400">
              {tracker.isTracking ? 'Broadcasting to permitted friends' : 'Sharing is OFF (Protected)'}
            </span>
          </div>

          <button
            onClick={handleStartSharingClick}
            type="button"
            className={`w-12 h-6 rounded-full transition p-0.5 relative shrink-0 ${
              tracker.isTracking ? 'bg-emerald-500' : 'bg-gray-700'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition transform ${
                tracker.isTracking ? 'translate-x-6' : 'translate-x-0'
              } shadow-md`}
            />
          </button>
        </div>

        {/* Range Segmented Selector */}
        <div className="space-y-2 pt-2 border-t border-white/5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-300 font-medium flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-violet-400" />
              Radius Range:
            </span>
            <span className="font-bold text-violet-400">
              {rangeKm === 'all' ? 'All Distance' : `${rangeKm} km`}
            </span>
          </div>

          <div className="grid grid-cols-5 gap-1 bg-black/40 p-1 rounded-xl text-xs font-semibold">
            {[1, 5, 10, 25, 'all'].map((val) => (
              <button
                key={val}
                onClick={() => setRangeKm(val as number | 'all')}
                className={`py-1.5 rounded-lg transition ${
                  rangeKm === val
                    ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {val === 'all' ? 'All' : `${val}k`}
              </button>
            ))}
          </div>
        </div>

        {tracker.error && (
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <span>{tracker.error}</span>
          </div>
        )}
      </div>

      {/* Main Interactive Map Canvas */}
      <div className="flex-1 w-full h-full">
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          zoomControl={false}
          className="w-full h-full"
        >
          <MapViewController center={mapCenter} zoom={mapZoom} />

          {/* CartoDB Dark Matter OpenStreetMap Tiles */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png"
            maxZoom={19}
            subdomains="abcd"
          />

          {/* User Self Marker & Range Circles */}
          {tracker.coords && (
            <>
              {/* Range Perimeter Circle */}
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

              {/* Accuracy Inner Bubble */}
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

              {/* Self Marker */}
              <Marker
                position={[tracker.coords.latitude, tracker.coords.longitude]}
                icon={createUserMarkerIcon(null, 'You', true)}
              >
                <Popup>
                  <div className="p-3 text-left space-y-1">
                    <p className="font-bold text-white text-sm">Your Location</p>
                    <p className="text-xs text-cyan-400 font-semibold">Broadcasting Live</p>
                    <p className="text-[11px] text-gray-400">
                      Accuracy: ~{Math.round(tracker.coords.accuracy || 10)} meters
                    </p>
                  </div>
                </Popup>
              </Marker>
            </>
          )}

          {/* Authorized Friend Markers */}
          {filteredFriends.map((friend) => {
            if (friend.morphed_presence) {
              // Morphed Presence: friend is active, but coordinates are shielded
              return null
            }

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
                  <div className="p-3 text-left space-y-2 min-w-[200px]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-violet-600/30 flex items-center justify-center font-bold text-xs text-violet-300">
                        {friend.display_name[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-white text-sm truncate">
                          {friend.display_name}
                        </p>
                        <p className="text-[11px] text-gray-400 font-mono truncate">
                          @{friend.username}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                      <span className="text-violet-400 font-semibold">
                        {formatDistance(friend.distance_meters ? friend.distance_meters / 1000 : null)}
                      </span>
                      <span className="text-gray-400 text-[11px]">
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

      {/* Bottom Horizontal Nearby Friends Carousel Drawer */}
      <div className="absolute bottom-4 left-4 right-4 z-[1000] pointer-events-none">
        <div className="pointer-events-auto max-w-4xl mx-auto glass-panel p-4 rounded-3xl border border-white/10 shadow-2xl space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-violet-400" />
                Nearby Friends ({filteredFriends.length})
              </span>
            </div>
            <span className="text-xs text-gray-400">
              Showing within {rangeKm === 'all' ? 'any distance' : `${rangeKm} km`}
            </span>
          </div>

          {filteredFriends.length === 0 ? (
            <div className="py-4 text-center text-xs text-gray-400">
              No authorized friends sharing live in this radius.
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
              {filteredFriends.map((item) => (
                <div
                  key={item.friend_id}
                  onClick={() => handleFocusFriend(item)}
                  className={`min-w-[200px] p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                    selectedFriend?.friend_id === item.friend_id
                      ? 'bg-violet-600/20 border-violet-500/50 shadow-lg shadow-violet-600/20'
                      : 'bg-[#111827]/80 hover:bg-[#1a233a] border-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center font-bold text-violet-300 shrink-0">
                      {item.display_name[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">
                        {item.display_name}
                      </p>
                      <p className="text-[10px] text-gray-400 font-mono truncate">
                        @{item.username}
                      </p>
                      <p className="text-[10px] text-violet-400 font-semibold mt-0.5">
                        {item.morphed_presence
                          ? 'Morphed Presence'
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
                      className="p-2 rounded-xl bg-violet-600/30 hover:bg-violet-600 text-violet-200 hover:text-white transition"
                      title="Focus on map"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Location Permission Explanation Modal */}
      {showPermissionPrompt && (
        <div className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full p-6 rounded-3xl border border-violet-500/30 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 mx-auto">
              <Compass className="w-6 h-6 animate-pulse" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-white">Enable Location Sharing</h3>
              <p className="text-xs text-gray-300 leading-relaxed">
                Orbit needs access to your browser location to display your position and calculate distance to nearby friends.
              </p>
            </div>

            <div className="p-3 bg-black/40 rounded-xl border border-white/5 text-xs text-gray-400 space-y-1.5">
              <p className="flex items-center gap-1.5 text-gray-300 font-semibold">
                <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
                Our Strict Privacy Guarantee:
              </p>
              <ul className="list-disc pl-4 space-y-1 text-[11px]">
                <li>Only accepted friends with explicit permission can see coordinates.</li>
                <li>You can stop sharing or revoke friends at any time.</li>
                <li>Closing this app or turning off sharing clears your coordinates immediately.</li>
              </ul>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowPermissionPrompt(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold transition"
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
