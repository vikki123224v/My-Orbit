import React from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Users, ShieldCheck } from 'lucide-react'

export const DashboardPlaceholder: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-2xl mx-auto space-y-6">
      <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-violet-600/20 to-cyan-500/20 border border-violet-500/30 flex items-center justify-center text-violet-400 shadow-xl shadow-violet-500/10 animate-pulse">
        <MapPin className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight text-white">
          Phase B Initialized
        </h2>
        <p className="text-sm text-gray-400 leading-relaxed">
          The Orbit application shell, dark theme architecture, authentication state machine, and profile settings are now active.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left">
        <Link
          to="/friends"
          className="glass-panel p-4 rounded-xl border border-white/5 hover:border-violet-500/30 transition group flex items-start gap-3"
        >
          <div className="p-2 rounded-lg bg-violet-500/10 text-violet-400 group-hover:scale-105 transition">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">Friend Directory</h4>
            <p className="text-xs text-gray-400 mt-0.5">Search handles and manage mutual connections.</p>
          </div>
        </Link>

        <Link
          to="/privacy"
          className="glass-panel p-4 rounded-xl border border-white/5 hover:border-violet-500/30 transition group flex items-start gap-3"
        >
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 group-hover:scale-105 transition">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">Location Privacy</h4>
            <p className="text-xs text-gray-400 mt-0.5">Control friend-by-friend permissions and Morphed Presence.</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
