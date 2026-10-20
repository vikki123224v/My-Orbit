import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import {
  User,
  AtSign,
  FileText,
  Image,
  Save,
  CheckCircle,
  AlertCircle,
  Loader2,
  Trash2,
  AlertTriangle,
} from 'lucide-react'

export const ProfilePage: React.FC = () => {
  const { user, profile, refreshProfile, signOut } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [bio, setBio] = useState('')
  const [saving, setSaving] = useState(false)
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Account deletion dialog state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '')
      setUsername(profile.username || '')
      setAvatarUrl(profile.avatar_url || '')
      setBio(profile.bio || '')
    } else if (user) {
      setDisplayName(user.user_metadata?.display_name || user.email?.split('@')[0] || '')
      setUsername(user.user_metadata?.username || '')
    }
  }, [profile, user])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setStatusMsg(null)

    if (!isSupabaseConfigured) {
      setStatusMsg({
        type: 'error',
        text: 'Supabase credentials are not connected. Update .env to persist profile updates.',
      })
      return
    }

    const cleanUsername = username.trim().toLowerCase()
    if (!/^[a-z0-9_]{3,20}$/.test(cleanUsername)) {
      setStatusMsg({
        type: 'error',
        text: 'Username must be 3-20 characters with letters, numbers, and underscores only.',
      })
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          display_name: displayName.trim(),
          username: cleanUsername,
          avatar_url: avatarUrl.trim() || null,
          bio: bio.trim() || null,
          updated_at: new Date().toISOString(),
        })

      if (error) {
        setStatusMsg({ type: 'error', text: error.message })
      } else {
        await refreshProfile()
        setStatusMsg({ type: 'success', text: 'Profile updated successfully!' })
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to save profile.' })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return
    setDeleting(true)
    try {
      // Clean up user records through RPC or standard deletion
      if (user && isSupabaseConfigured) {
        // Delete current location and permissions first
        await supabase.from('current_locations').delete().eq('owner_id', user.id)
        await supabase.from('location_sharing_permissions').delete().eq('owner_id', user.id)
        await supabase.from('profiles').delete().eq('id', user.id)
      }
      await signOut()
    } catch (err) {
      console.error('Account deletion error:', err)
    } finally {
      setDeleting(false)
      setShowDeleteModal(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 px-1 sm:px-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Profile Settings</h1>
          <p className="text-xs sm:text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Manage your public identity and profile details visible to friends.
          </p>
        </div>
        {/* Mobile Sign Out Button */}
        <button
          onClick={signOut}
          className="md:hidden px-3 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs font-semibold hover:bg-rose-500/20 active:scale-95 transition"
        >
          Sign Out
        </button>
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-xl border text-sm flex items-start gap-3 ${
            statusMsg.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle className="w-5 h-5 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Main Profile Form */}
      <form onSubmit={handleSaveProfile} className="glass-panel p-6 sm:p-8 rounded-2xl space-y-6">
        {/* Avatar preview */}
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-500 p-0.5 shadow-xl shadow-violet-500/15">
            <div className="w-full h-full bg-[#111827] rounded-2xl flex items-center justify-center overflow-hidden">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-full h-full object-cover"
                  onError={() => setAvatarUrl('')}
                />
              ) : (
                <span className="text-2xl font-bold text-violet-300">
                  {(displayName || user?.email || 'O')[0].toUpperCase()}
                </span>
              )}
            </div>
          </div>
          <div>
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{displayName || 'Your Profile'}</h3>
            <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>@{username || 'handle'}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{user?.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5 uppercase tracking-wider">
              Display Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Janifer Kate"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5 uppercase tracking-wider">
              Username Handle
            </label>
            <div className="relative">
              <AtSign className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="janifer_k"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1.5 uppercase tracking-wider">
            Avatar Image URL
          </label>
          <div className="relative">
            <Image className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
            <input
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://images.unsplash.com/photo-..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1.5 uppercase tracking-wider">
            Bio / Status
          </label>
          <div className="relative">
            <FileText className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Exploring the city, into cycling and coffee..."
              className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition resize-none"
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold text-sm shadow-lg shadow-violet-600/25 hover:shadow-violet-600/40 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 transition flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Profile</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Danger Zone: Account Deletion */}
      <div className="p-6 rounded-2xl border border-rose-500/20 bg-rose-500/5 space-y-4">
        <div className="flex items-center gap-3 text-rose-400">
          <AlertTriangle className="w-5 h-5" />
          <h3 className="font-semibold text-base text-rose-300">Danger Zone</h3>
        </div>
        <p className="text-xs text-gray-400 leading-relaxed">
          Deleting your account permanently clears your profile, accepted friendships, friend requests, and all associated location tracking records. This action cannot be reversed.
        </p>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="px-4 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-semibold transition inline-flex items-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          Delete Account
        </button>
      </div>

      {/* Deletion Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full p-6 rounded-2xl border border-rose-500/30 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              Confirm Account Deletion
            </h3>
            <p className="text-xs text-gray-300 leading-relaxed">
              To confirm that you want to permanently delete your Orbit account and all location data, please type <strong className="text-rose-400">DELETE</strong> in the box below:
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              className="w-full px-4 py-2.5 bg-black/50 border border-rose-500/40 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
            />
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeleteConfirmText('')
                }}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-medium transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteConfirmText !== 'DELETE' || deleting}
                onClick={handleDeleteAccount}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white text-xs font-semibold transition flex items-center gap-1.5"
              >
                {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
