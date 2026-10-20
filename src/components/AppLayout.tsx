import React from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  Compass,
  Users,
  ShieldCheck,
  User,
  LogOut,
  Radio,
  Sun,
  Moon,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { SupabaseSetupNotice } from './SupabaseSetupNotice'

interface AppLayoutProps {
  children: React.ReactNode
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { user, profile, signOut, isConfigured } = useAuth()
  const { isDark, toggleTheme } = useTheme()
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
    <div
      className="min-h-screen text-gray-100 flex flex-col selection:bg-violet-600/30 selection:text-violet-300"
      style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
    >
      {!isConfigured && <SupabaseSetupNotice />}

      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar Navigation */}
        <aside
          className="hidden md:flex flex-col w-64 border-r p-4 justify-between shrink-0 transition-colors duration-300"
          style={{ backgroundColor: 'var(--sidebar-bg)', borderRightColor: 'var(--sidebar-border)' }}
        >
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
                <h1 className="font-bold text-lg tracking-tight bg-gradient-to-r from-violet-500 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                  Orbit
                </h1>
                <p className="text-[11px] -mt-0.5 font-medium tracking-wide" style={{ color: 'var(--text-muted)' }}>
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
                          ? 'bg-violet-600/15 text-violet-500 border border-violet-500/25 shadow-sm'
                          : 'hover:bg-violet-500/5'
                      }`
                    }
                    style={({ isActive }) => ({
                      color: isActive ? undefined : 'var(--text-secondary)',
                    })}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.name}</span>
                  </NavLink>
                )
              })}
            </nav>
          </div>

          {/* Bottom user profile card */}
          <div className="pt-4 space-y-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition hover:bg-violet-500/5"
              style={{ color: 'var(--text-secondary)' }}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-violet-500" />
                  <span>Dark Mode</span>
                </>
              )}
            </button>

            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-700 flex items-center justify-center font-semibold text-sm text-white shrink-0 border border-white/10 overflow-hidden">
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
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                    {profile?.display_name || user?.email?.split('@')[0] || 'Orbit Explorer'}
                  </p>
                  <p className="text-xs truncate font-mono" style={{ color: 'var(--text-muted)' }}>
                    @{profile?.username || 'orbit_user'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                title="Sign out"
                className="p-1.5 rounded-lg transition hover:text-rose-400 hover:bg-rose-500/5"
                style={{ color: 'var(--text-muted)' }}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* Main Workspace Area */}
        <main
          className={`flex-1 flex flex-col overflow-y-auto ${isMapRoute ? 'p-0' : 'p-4 sm:p-6 lg:p-8'}`}
          style={{ backgroundColor: 'var(--bg-primary)' }}
        >
          {children}
        </main>
      </div>

      {/* Mobile Top Header (with Logo, User Avatar, and Theme Toggle) */}
      <header
        className="md:hidden sticky top-0 z-40 border-b px-4 py-2.5 flex items-center justify-between backdrop-blur-xl safe-top"
        style={{
          backgroundColor: 'var(--nav-bg)',
          borderBottomColor: 'var(--sidebar-border)',
        }}
      >
        <div
          onClick={() => navigate('/app')}
          className="flex items-center gap-2.5 cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-600 to-cyan-500 flex items-center justify-center shadow-md">
            <Radio className="w-4 h-4 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="font-bold text-base tracking-tight bg-gradient-to-r from-violet-500 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              Orbit
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Theme Switcher Button */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl transition hover:bg-violet-500/10 active:scale-95"
            style={{ color: 'var(--text-secondary)' }}
            title={isDark ? 'Switch to Light' : 'Switch to Dark'}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-violet-500" />}
          </button>

          {/* User Avatar linking to profile */}
          <button
            onClick={() => navigate('/profile')}
            className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-700 flex items-center justify-center font-semibold text-xs text-white border border-white/10 overflow-hidden active:scale-95 transition"
            title="Profile"
          >
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{(profile?.display_name || user?.email || 'U')[0].toUpperCase()}</span>
            )}
          </button>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (iOS / Android Safe) */}
      <nav
        className="md:hidden sticky bottom-0 z-50 border-t px-2 py-1.5 flex items-center justify-around backdrop-blur-xl safe-bottom shadow-2xl"
        style={{
          backgroundColor: 'var(--nav-bg)',
          borderTopColor: 'var(--sidebar-border)',
        }}
      >
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-[11px] font-medium transition active:scale-95 ${
                  isActive
                    ? 'text-violet-500 font-semibold'
                    : 'hover:text-violet-400'
                }`
              }
              style={({ isActive }) => ({
                color: isActive ? undefined : 'var(--text-muted)',
              })}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="truncate">{item.name.replace('Location ', '')}</span>
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}
