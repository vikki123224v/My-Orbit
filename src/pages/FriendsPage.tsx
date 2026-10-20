import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { friendshipService } from '../services/friendshipService'
import type { FriendWithProfile } from '../services/friendshipService'
import type { Profile, FriendRequest } from '../types/database'
import {
  Users,
  UserPlus,
  Search,
  Check,
  X,
  UserMinus,
  Clock,
  Send,
  AlertCircle,
  Loader2,
  AlertTriangle,
} from 'lucide-react'

export const FriendsPage: React.FC = () => {
  const { user, isConfigured } = useAuth()
  const [activeTab, setActiveTab] = useState<'all' | 'requests' | 'search'>('all')

  // Data states
  const [friends, setFriends] = useState<FriendWithProfile[]>([])
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([])
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([])
  const [searchResults, setSearchResults] = useState<Profile[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  // Loading & status states
  const [loading, setLoading] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Friend removal modal state
  const [friendToRemove, setFriendToRemove] = useState<Profile | null>(null)
  const [removing, setRemoving] = useState(false)

  const loadData = async () => {
    if (!user || !isConfigured) return
    setLoading(true)
    try {
      const [friendsList, incoming, outgoing] = await Promise.all([
        friendshipService.getFriends(user.id),
        friendshipService.getIncomingRequests(user.id),
        friendshipService.getOutgoingRequests(user.id),
      ])
      setFriends(friendsList)
      setIncomingRequests(incoming)
      setOutgoingRequests(outgoing)
    } catch (err: any) {
      console.error('Failed to load friend data:', err)
      setStatusMessage({ type: 'error', text: err.message || 'Could not fetch friends.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [user, isConfigured])

  // Handle Search
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !searchQuery.trim()) return
    setSearchLoading(true)
    setStatusMessage(null)
    try {
      const results = await friendshipService.searchUsers(searchQuery, user.id)
      setSearchResults(results)
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'User search failed.' })
    } finally {
      setSearchLoading(false)
    }
  }

  // Handle Send Request
  const handleSendRequest = async (targetId: string) => {
    if (!user) return
    try {
      await friendshipService.sendFriendRequest(user.id, targetId)
      setStatusMessage({ type: 'success', text: 'Friend request sent successfully!' })
      await loadData()
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to send request.' })
    }
  }

  // Handle Accept
  const handleAcceptRequest = async (requestId: string) => {
    try {
      await friendshipService.acceptRequest(requestId)
      setStatusMessage({ type: 'success', text: 'Friend request accepted!' })
      await loadData()
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to accept request.' })
    }
  }

  // Handle Reject
  const handleRejectRequest = async (requestId: string) => {
    try {
      await friendshipService.rejectRequest(requestId)
      setStatusMessage({ type: 'success', text: 'Friend request rejected.' })
      await loadData()
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to reject request.' })
    }
  }

  // Handle Cancel Outgoing
  const handleCancelOutgoing = async (requestId: string) => {
    try {
      await friendshipService.cancelOutgoingRequest(requestId)
      setStatusMessage({ type: 'success', text: 'Friend request cancelled.' })
      await loadData()
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to cancel request.' })
    }
  }

  // Confirm friend removal
  const handleConfirmRemove = async () => {
    if (!friendToRemove) return
    setRemoving(true)
    try {
      await friendshipService.removeFriend(friendToRemove.id)
      setStatusMessage({ type: 'success', text: `Removed ${friendToRemove.display_name} from friends.` })
      setFriendToRemove(null)
      await loadData()
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to remove friend.' })
    } finally {
      setRemoving(false)
    }
  }

  // Helper to test if a user is already a friend or has pending request
  const isFriend = (profileId: string) => friends.some((f) => f.friend.id === profileId)
  const hasOutgoingRequest = (profileId: string) =>
    outgoingRequests.some((r) => r.receiver_id === profileId)
  const hasIncomingRequest = (profileId: string) =>
    incomingRequests.some((r) => r.sender_id === profileId)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Users className="w-7 h-7 text-violet-400" />
            Friends & Connections
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Search usernames, handle friend requests, and maintain your trusted inner circle.
          </p>
        </div>

        {/* Action Tabs */}
        <div className="flex bg-[#111827] p-1 rounded-xl border border-white/5 text-xs font-semibold">
          <button
            onClick={() => {
              setActiveTab('all')
              setStatusMessage(null)
            }}
            className={`px-3.5 py-2 rounded-lg transition ${
              activeTab === 'all'
                ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            All Friends ({friends.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('requests')
              setStatusMessage(null)
            }}
            className={`px-3.5 py-2 rounded-lg transition relative ${
              activeTab === 'requests'
                ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Requests ({incomingRequests.length + outgoingRequests.length})
            {incomingRequests.length > 0 && (
              <span className="ml-1.5 w-2 h-2 rounded-full bg-cyan-400 inline-block animate-ping" />
            )}
          </button>
          <button
            onClick={() => {
              setActiveTab('search')
              setStatusMessage(null)
            }}
            className={`px-3.5 py-2 rounded-lg transition ${
              activeTab === 'search'
                ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Find People
          </button>
        </div>
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

      {/* TAB 1: ALL FRIENDS */}
      {activeTab === 'all' && (
        <div className="space-y-4">
          {loading ? (
            <div className="glass-panel p-12 text-center rounded-2xl flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-7 h-7 text-violet-400 animate-spin" />
              <p className="text-xs text-gray-400">Loading friend connections...</p>
            </div>
          ) : friends.length === 0 ? (
            <div className="glass-panel p-12 text-center rounded-2xl border border-white/5 space-y-3">
              <div className="w-12 h-12 rounded-full bg-violet-600/10 border border-violet-500/20 text-violet-400 flex items-center justify-center mx-auto">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-white">No friends yet</h3>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                Search for other Orbit users by their unique username handle to connect and share your locations securely.
              </p>
              <button
                onClick={() => setActiveTab('search')}
                className="mt-2 px-4 py-2 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-violet-300 text-xs font-semibold rounded-xl transition"
              >
                Find Orbit Users
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {friends.map((item) => (
                <div
                  key={item.friendship_id}
                  className="glass-panel p-4 rounded-2xl border border-white/5 hover:border-violet-500/30 transition group flex flex-col justify-between space-y-4"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-violet-600 to-cyan-500 p-0.5 shrink-0 shadow-md">
                      <div className="w-full h-full bg-[#111827] rounded-full flex items-center justify-center overflow-hidden">
                        {item.friend.avatar_url ? (
                          <img
                            src={item.friend.avatar_url}
                            alt={item.friend.display_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="font-bold text-sm text-violet-300">
                            {item.friend.display_name[0].toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-semibold text-white text-sm truncate">
                        {item.friend.display_name}
                      </h4>
                      <p className="text-xs text-gray-400 font-mono truncate">
                        @{item.friend.username}
                      </p>
                      {item.friend.bio && (
                        <p className="text-[11px] text-gray-400 line-clamp-2 mt-1">
                          {item.friend.bio}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[10px] text-gray-400">
                      Connected {new Date(item.created_at).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => setFriendToRemove(item.friend)}
                      title="Remove friend"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: REQUESTS (INCOMING & OUTGOING) */}
      {activeTab === 'requests' && (
        <div className="space-y-6">
          {/* Incoming Requests */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-cyan-400" />
              Incoming Requests ({incomingRequests.length})
            </h3>
            {incomingRequests.length === 0 ? (
              <p className="text-xs text-gray-500 italic pl-1">No incoming friend requests.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {incomingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="glass-panel p-4 rounded-xl border border-white/5 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        {req.sender?.display_name || 'Orbit User'}
                      </p>
                      <p className="text-xs text-gray-400 font-mono truncate">
                        @{req.sender?.username || 'user'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleAcceptRequest(req.id)}
                        className="p-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition shadow-md shadow-violet-600/20"
                        title="Accept"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRejectRequest(req.id)}
                        className="p-2 rounded-xl bg-white/5 hover:bg-rose-600/20 text-gray-400 hover:text-rose-400 text-xs font-semibold transition"
                        title="Reject"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Outgoing Requests */}
          <div className="space-y-3 pt-4 border-t border-white/5">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-violet-400" />
              Pending Outgoing Requests ({outgoingRequests.length})
            </h3>
            {outgoingRequests.length === 0 ? (
              <p className="text-xs text-gray-500 italic pl-1">No pending outgoing requests.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {outgoingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="glass-panel p-4 rounded-xl border border-white/5 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        {req.receiver?.display_name || 'Orbit User'}
                      </p>
                      <p className="text-xs text-gray-400 font-mono truncate">
                        @{req.receiver?.username || 'user'}
                      </p>
                      <span className="text-[10px] text-amber-400/80 inline-block mt-0.5">
                        Awaiting approval
                      </span>
                    </div>
                    <button
                      onClick={() => handleCancelOutgoing(req.id)}
                      className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-gray-200 text-xs font-medium transition"
                    >
                      Cancel
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: FIND PEOPLE */}
      {activeTab === 'search' && (
        <div className="space-y-6">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by username handle (e.g. alex, janifer)..."
                className="w-full pl-10 pr-4 py-2.5 bg-[#111827] border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition"
              />
            </div>
            <button
              type="submit"
              disabled={searchLoading || !searchQuery.trim()}
              className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-semibold text-sm transition shadow-lg shadow-violet-600/20 flex items-center gap-2"
            >
              {searchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>Search</span>
            </button>
          </form>

          {searchResults.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {searchResults.map((person) => {
                const alreadyFriend = isFriend(person.id)
                const alreadySent = hasOutgoingRequest(person.id)
                const alreadyReceived = hasIncomingRequest(person.id)

                return (
                  <div
                    key={person.id}
                    className="glass-panel p-4 rounded-xl border border-white/5 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center font-bold text-violet-300 shrink-0">
                        {person.display_name[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">
                          {person.display_name}
                        </p>
                        <p className="text-xs text-gray-400 font-mono truncate">
                          @{person.username}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {alreadyFriend ? (
                        <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-semibold">
                          Friend
                        </span>
                      ) : alreadySent ? (
                        <span className="px-3 py-1 bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded-lg text-xs font-semibold">
                          Requested
                        </span>
                      ) : alreadyReceived ? (
                        <button
                          onClick={() => setActiveTab('requests')}
                          className="px-3 py-1 bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 rounded-lg text-xs font-semibold hover:bg-cyan-500/20 transition"
                        >
                          Respond
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSendRequest(person.id)}
                          className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-md shadow-violet-600/20"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Connect</span>
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Remove Confirmation Modal */}
      {friendToRemove && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full p-6 rounded-2xl border border-rose-500/30 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              Remove Friend Connection
            </h3>
            <p className="text-xs text-gray-300 leading-relaxed">
              Are you sure you want to remove <strong className="text-white">{friendToRemove.display_name}</strong> (@{friendToRemove.username}) from your friends? This will immediately revoke any shared location permissions between both accounts.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setFriendToRemove(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-medium transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={removing}
                onClick={handleConfirmRemove}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition flex items-center gap-1.5"
              >
                {removing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Confirm Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
