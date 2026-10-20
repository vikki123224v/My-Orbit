import React from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  Compass,
  Users,
  ShieldCheck,
  User,
  LogOut,
  Radio,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { SupabaseSetupNotice } from './SupabaseSetupNotice'

interface AppLayoutProps {
  children: React.ReactNode
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { user, profile, signOut, isConfigured } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const navItems = [
    { name: 'Live Orbit', path: '/app', icon: Compass },
    { name: 'Friends', path: '/friends', icon: Users },
    { name: 'Location Privacy', path: '/privacy', icon: ShieldCheck },
    { name: 'Profile', path: '/profile', icon: User },
  ]

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const isMapRoute = location.pathname === '/app'

  return (
    <div className="min-h-screen bg-[#090d16] text-gray-100 flex flex-col selection:bg-violet-600/30 selection:text-violet-300">
      {!isConfigured && <SupabaseSetupNotice />}

      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar Navigation */}
        <aside className="hidden md:flex flex-col w-64 bg-[#0d121f] border-r border-white/5 p-4 justify-between shrink-0">
          <div className="space-y-6">
            {/* Brand Logo */}
            <div
              onClick={() => navigate('/app')}
              className="flex items-center gap-3 px-2 cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/25 group-hover:scale-105 transition">
                <Radio className="w-5 h-5 text-white animate-pulse" />
              </div>
              <div>
                <h1 className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-gray-100 to-gray-400 bg-clip-text text-transparent">
                  Orbit
                </h1>
                <p className="text-[11px] text-gray-400 -mt-0.5 font-medium tracking-wide">
                  FIND YOUR PEOPLE
                </p>
              </div>
            </div>

            {/* Navigation links */}
            <nav className="space-y-1.5 pt-2">
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition duration-150 ${
                        isActive
                          ? 'bg-violet-600/15 text-violet-400 border border-violet-500/25 shadow-sm'
                          : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.name}</span>
                  </NavLink>
                )
              })}
            </nav>
          </div>

          {/* Bottom user profile card */}
          <div className="pt-4 border-t border-white/5 space-y-3">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-700 flex items-center justify-center font-semibold text-sm text-white shrink-0 border border-white/10">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.display_name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span>
                      {(profile?.display_name || user?.email || 'U')[0].toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate text-gray-200">
                    {profile?.display_name || user?.email?.split('@')[0] || 'Orbit Explorer'}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    @{profile?.username || 'orbit_user'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                title="Sign out"
                className="p-1.5 text-gray-400 hover:text-rose-400 rounded-lg hover:bg-white/[0.04] transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* Main Workspace Area */}
        <main className={`flex-1 flex flex-col overflow-y-auto ${isMapRoute ? 'p-0' : 'p-4 sm:p-6 lg:p-8'}`}>
          {children}
        </main>
      </div>

      {/* Mobile Floating Bottom Navigation */}
      <nav className="md:hidden sticky bottom-0 z-50 bg-[#0d121f]/95 backdrop-blur-xl border-t border-white/10 px-4 py-2 flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-xs font-medium transition ${
                  isActive
                    ? 'text-violet-400 font-semibold'
                    : 'text-gray-400 hover:text-gray-200'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span>{item.name}</span>
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}
