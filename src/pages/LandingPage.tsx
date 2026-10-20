import React from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import {
  EyeOff,
  Radio,
  Sliders,
  Lock,
  ChevronRight,
  Sparkles,
  Sun,
  Moon,
} from 'lucide-react'

export const LandingPage: React.FC = () => {
  const { user, loading } = useAuth()
  const { isDark, toggleTheme } = useTheme()

  // If user is already authenticated, redirect straight to the main app dashboard
  if (!loading && user) {
    return <Navigate to="/app" replace />
  }
  return (
    <div
      className="min-h-screen flex flex-col selection:bg-violet-600/30 selection:text-violet-300 transition-colors duration-300"
      style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
    >
      {/* Top Header */}
      <header
        className="border-b backdrop-blur-md sticky top-0 z-50 safe-top transition-colors duration-300"
        style={{
          backgroundColor: 'var(--nav-bg)',
          borderBottomColor: 'var(--border-color)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Radio className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-violet-500 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                Orbit
              </span>
              <span className="text-[10px] block font-semibold tracking-wider text-violet-400">
                FIND YOUR PEOPLE
              </span>
            </div>
          </div>

          {/* Center / Corner Creator Credit Badge */}
          <div
            className="hidden lg:flex items-center gap-2 px-3.5 py-1 rounded-full text-xs"
            style={{
              backgroundColor: 'var(--bg-hover)',
              border: '1px solid var(--border-color)',
            }}
          >
            <span style={{ color: 'var(--text-muted)' }}>Crafted by</span>
            <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400">
              Vighneshwara (vikki123224v)
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl transition hover:bg-violet-500/10 active:scale-95"
              style={{ color: 'var(--text-secondary)' }}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-violet-500" />}
            </button>

            {user ? (
              <Link
                to="/app"
                className="text-sm font-semibold bg-gradient-to-r from-violet-600 to-cyan-500 text-white px-4 py-2 rounded-xl transition shadow-lg shadow-violet-500/25 flex items-center gap-1.5"
              >
                Go to App
                <ChevronRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm font-medium px-3.5 py-1.5 transition"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="text-sm font-medium bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white px-4 py-2 rounded-xl transition shadow-lg shadow-violet-500/25 flex items-center gap-1.5 active:scale-95"
                >
                  Get Started
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-medium mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Privacy-First Geospatial Friend Discovery</span>
        </div>

        <h1
          className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-4xl"
          style={{ color: 'var(--text-primary)' }}
        >
          Real-world connection,{' '}
          <span className="bg-gradient-to-r from-violet-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent">
            uncompromised privacy.
          </span>
        </h1>

        <p
          className="mt-6 text-lg sm:text-xl max-w-2xl leading-relaxed"
          style={{ color: 'var(--text-secondary)' }}
        >
          Find your friends nearby without ever giving up control. Orbit puts location sharing{' '}
          <strong style={{ color: 'var(--text-primary)' }}>OFF by default</strong>, requires explicit friend-by-friend approval, and lets you mask your exact coordinates with Morphed Presence.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-4 items-center justify-center">
          {user ? (
            <Link
              to="/app"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 text-white font-semibold text-base shadow-xl shadow-violet-600/25 hover:shadow-violet-600/40 hover:scale-[1.02] active:scale-[0.98] transition flex items-center justify-center gap-2"
            >
              Open Live Orbit Map
              <ChevronRight className="w-4 h-4" />
            </Link>
          ) : (
            <>
              <Link
                to="/signup"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 text-white font-semibold text-base shadow-xl shadow-violet-600/25 hover:shadow-violet-600/40 hover:scale-[1.02] active:scale-[0.98] transition flex items-center justify-center gap-2"
              >
                Launch Orbit Map
                <ChevronRight className="w-4 h-4" />
              </Link>
              <Link
                to="/login"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl border font-medium text-base transition flex items-center justify-center hover:opacity-90 active:scale-95"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              >
                Sign In with Email
              </Link>
            </>
          )}
        </div>

        {/* Core Pillars Feature Grid */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 text-left w-full">
          <div className="glass-panel p-6 rounded-2xl space-y-3">
            <div className="w-12 h-12 rounded-xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Strict Zero-Leak Default</h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Friendship does not equal surveillance. No one sees your coordinates until you flip the master switch AND grant that specific friend permission.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl space-y-3">
            <div className="w-12 h-12 rounded-xl bg-cyan-600/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <EyeOff className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Morphed Presence</h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Let friends know you are out and about without exposing your home or exact coordinates. Protected on the database level via Postgres RLS.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Sliders className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Instant Kill Switch</h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Stop sharing with one tap. Browser tracking cancels immediately and existing coordinates are instantly invalidated from the database.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 text-center text-xs text-gray-500 safe-bottom">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>&copy; {new Date().getFullYear()} Orbit — Find Your People. Built with Supabase & OpenStreetMap.</p>
          <div className="flex items-center gap-1.5 text-gray-400">
            <span>Created by</span>
            <a
              href="https://github.com/vikki123224v"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-violet-400 hover:text-violet-300 transition underline underline-offset-4"
            >
              Vighneshwara (@vikki123224v)
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
