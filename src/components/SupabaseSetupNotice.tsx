import React from 'react'
import { AlertCircle, Key, ExternalLink } from 'lucide-react'

export const SupabaseSetupNotice: React.FC = () => {
  return (
    <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-b border-amber-500/20 px-4 py-3">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs sm:text-sm">
        <div className="flex items-center gap-2 text-amber-300">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
          <span>
            <strong>Supabase Setup Required:</strong> To enable real-time location sharing, authentication, and friend discovery, connect your Supabase project keys in <code className="bg-black/40 px-1.5 py-0.5 rounded text-amber-200">.env</code>.
          </span>
        </div>
        <a
          href="https://supabase.com/dashboard"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 rounded-md transition font-medium text-xs whitespace-nowrap border border-amber-500/30"
        >
          <Key className="w-3.5 h-3.5" />
          Get Supabase API Keys
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  )
}
