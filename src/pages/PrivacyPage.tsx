import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { privacyService } from '../services/privacyService'
import type { FriendPermissionItem } from '../services/privacyService'
import {
  ShieldCheck,
  Eye,
  EyeOff,
  Radio,
  AlertCircle,
  Loader2,
  Users,
  CheckCircle2,
  Info,
} from 'lucide-react'

export const PrivacyPage: React.FC = () => {
  const { user, isConfigured } = useAuth()

  const [sharingEnabled, setSharingEnabled] = useState(false)
  const [morphedPresence, setMorphedPresence] = useState(false)
  const [friendsPerms, setFriendsPerms] = useState<FriendPermissionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const loadSettings = async () => {
    if (!user || !isConfigured) return
    setLoading(true)
    try {
      const [sharing, morphed, perms] = await Promise.all([
        privacyService.getSharingState(user.id),
        privacyService.getMorphedPresence(user.id),
        privacyService.getFriendPermissions(user.id),
      ])
      setSharingEnabled(sharing)
      setMorphedPresence(morphed)
      setFriendsPerms(perms)
    } catch (err: any) {
      console.error('Failed to load privacy settings:', err)
      setStatusMessage({ type: 'error', text: err.message || 'Failed to load privacy data.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSettings()
  }, [user, isConfigured])

  // Master sharing toggle
  const handleToggleMasterSharing = async () => {
    if (!user) return
    const nextState = !sharingEnabled
    setSharingEnabled(nextState)
    setStatusMessage(null)
    try {
      await privacyService.setSharingState(user.id, nextState)
      setStatusMessage({
        type: 'success',
        text: nextState
          ? 'Live location sharing activated for permitted friends.'
          : 'Location sharing halted. Exact coordinates have been purged.',
      })
    } catch (err: any) {
      setSharingEnabled(!nextState)
      setStatusMessage({ type: 'error', text: err.message || 'Failed to update sharing state.' })
    }
  }

  // Morphed presence toggle
  const handleToggleMorphed = async () => {
    if (!user) return
    const nextState = !morphedPresence
    setMorphedPresence(nextState)
    setStatusMessage(null)
    try {
      await privacyService.setMorphedPresence(user.id, nextState)
      setStatusMessage({
        type: 'success',
        text: nextState
          ? 'Morphed Presence activated: exact coordinates will NOT be transmitted to friends.'
          : 'Standard precision sharing restored.',
      })
    } catch (err: any) {
      setMorphedPresence(!nextState)
      setStatusMessage({ type: 'error', text: err.message || 'Failed to update Morphed Presence.' })
    }
  }

  // Individual friend toggle
  const handleToggleFriend = async (friendId: string, currentGranted: boolean) => {
    if (!user) return
    setUpdatingId(friendId)
    const nextGranted = !currentGranted
    try {
      await privacyService.toggleFriendPermission(user.id, friendId, nextGranted)
      setFriendsPerms((prev) =>
        prev.map((f) =>
          f.friend_id === friendId ? { ...f, permission_granted: nextGranted } : f
        )
      )
      setStatusMessage({
        type: 'success',
        text: nextGranted
          ? 'Permission granted to friend.'
          : 'Permission revoked. Friend can no longer view your location.',
      })
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to update friend permission.' })
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
          <ShieldCheck className="w-7 h-7 text-cyan-400" />
          Location Privacy Center
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Every location access is explicit, directional, and under your command.
        </p>
      </div>

      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl border text-sm flex items-start gap-2.5 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
          }`}
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* 1. Master Sharing Switch */}
      <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border transition ${
                sharingEnabled
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 shadow-lg shadow-emerald-500/20'
                  : 'bg-white/5 border-white/10 text-gray-400'
              }`}
            >
              <Radio className={`w-6 h-6 ${sharingEnabled ? 'animate-pulse' : ''}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-white text-base">
                  Master Location Sharing
                </h3>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    sharingEnabled
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-gray-800 text-gray-400 border border-gray-700'
                  }`}
                >
                  {sharingEnabled ? 'ACTIVE' : 'OFF (SECURE)'}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1 max-w-lg leading-relaxed">
                When turned OFF, browser geolocation stops immediately and previously recorded exact coordinates are purged from the database.
              </p>
            </div>
          </div>

          {/* Toggle Switch */}
          <button
            onClick={handleToggleMasterSharing}
            type="button"
            className={`w-14 h-8 rounded-full transition p-1 cursor-pointer relative shrink-0 ${
              sharingEnabled ? 'bg-violet-600' : 'bg-gray-700'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full bg-white transition transform ${
                sharingEnabled ? 'translate-x-6' : 'translate-x-0'
              } shadow-md`}
            />
          </button>
        </div>
      </div>

      {/* 2. Morphed Presence Mode */}
      <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border transition ${
                morphedPresence
                  ? 'bg-violet-500/15 border-violet-500/30 text-violet-400 shadow-lg shadow-violet-500/20'
                  : 'bg-white/5 border-white/10 text-gray-400'
              }`}
            >
              {morphedPresence ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-white text-base">
                  Morphed Presence (Privacy Mode)
                </h3>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    morphedPresence
                      ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                      : 'bg-gray-800 text-gray-400 border border-gray-700'
                  }`}
                >
                  {morphedPresence ? 'ENABLED' : 'DISABLED'}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1 max-w-lg leading-relaxed">
                When enabled, PostgreSQL automatically masks your coordinates to <code className="text-violet-300 font-mono">NULL</code>. Friends see a stylized purple orbital marker with a question mark indicating you are out, with <strong>zero exact coordinate exposure</strong>.
              </p>
            </div>
          </div>

          {/* Toggle Switch */}
          <button
            onClick={handleToggleMorphed}
            type="button"
            className={`w-14 h-8 rounded-full transition p-1 cursor-pointer relative shrink-0 ${
              morphedPresence ? 'bg-violet-600' : 'bg-gray-700'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full bg-white transition transform ${
                morphedPresence ? 'translate-x-6' : 'translate-x-0'
              } shadow-md`}
            />
          </button>
        </div>

        <div className="p-3 bg-violet-950/20 border border-violet-500/20 rounded-xl flex items-start gap-2.5 text-xs text-violet-300">
          <Info className="w-4 h-4 shrink-0 text-violet-400 mt-0.5" />
          <span>
            <strong>Zero-Leak Guarantee:</strong> Unlike visual blur overlays in client code, Morphed Presence is enforced at the database layer inside the PostgreSQL RPC. Unpermitted coordinates never leave the server.
          </span>
        </div>
      </div>

      {/* 3. Friend-by-Friend Permission Matrix */}
      <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-white text-base flex items-center gap-2">
              <Users className="w-5 h-5 text-violet-400" />
              Directional Friend Permissions
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Select specifically which accepted friends are permitted to receive your location updates.
            </p>
          </div>
          <span className="text-xs font-mono text-gray-400 bg-white/5 px-2.5 py-1 rounded-lg">
            {friendsPerms.filter((f) => f.permission_granted).length} of {friendsPerms.length} permitted
          </span>
        </div>

        {loading ? (
          <div className="py-8 flex justify-center items-center gap-2 text-xs text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
            <span>Loading permissions...</span>
          </div>
        ) : friendsPerms.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-500">
            No accepted friends found. Add friends in the Friends tab to grant location permissions.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {friendsPerms.map((friend) => (
              <div
                key={friend.friend_id}
                className="py-3.5 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center font-bold text-violet-300 shrink-0">
                    {friend.display_name[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      {friend.display_name}
                    </p>
                    <p className="text-xs text-gray-400 font-mono truncate">
                      @{friend.username}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {friend.permission_received && (
                        <span className="text-[10px] text-cyan-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Shares with you
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`text-xs font-medium ${
                      friend.permission_granted ? 'text-violet-400' : 'text-gray-500'
                    }`}
                  >
                    {friend.permission_granted ? 'Can View' : 'Blocked'}
                  </span>
                  <button
                    onClick={() => handleToggleFriend(friend.friend_id, friend.permission_granted)}
                    disabled={updatingId === friend.friend_id}
                    type="button"
                    className={`w-12 h-6 rounded-full transition p-0.5 cursor-pointer relative shrink-0 ${
                      friend.permission_granted ? 'bg-violet-600' : 'bg-gray-700'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white transition transform ${
                        friend.permission_granted ? 'translate-x-6' : 'translate-x-0'
                      } shadow-md`}
                    />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
