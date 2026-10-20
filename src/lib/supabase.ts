import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  ''

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseKey &&
  supabaseUrl !== 'https://your-project-ref.supabase.co' &&
  !supabaseUrl.includes('your-project-ref') &&
  supabaseKey !== 'your-supabase-publishable-key' &&
  supabaseKey !== 'your-supabase-anon-key'
)

// Safe initialization that avoids unhandled runtime crashes if credentials are missing
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : createClient('https://placeholder-domain-999.supabase.co', 'placeholder-anon-key-abc-123', {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
