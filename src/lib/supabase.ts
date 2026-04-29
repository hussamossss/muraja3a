import { createClient } from '@supabase/supabase-js'

// Custom storage: writes to both localStorage AND sessionStorage.
// On some mobile browsers (iOS Safari over HTTP/IP), localStorage is blocked.
// sessionStorage works reliably within the same tab session.
const hybridStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') return null
    try {
      const v = window.localStorage.getItem(key)
      if (v) return v
    } catch {}
    try {
      return window.sessionStorage.getItem(key)
    } catch {}
    return null
  },
  setItem: (key: string, value: string): void => {
    if (typeof window === 'undefined') return
    try { window.localStorage.setItem(key, value) } catch {}
    try { window.sessionStorage.setItem(key, value) } catch {}
  },
  removeItem: (key: string): void => {
    if (typeof window === 'undefined') return
    try { window.localStorage.removeItem(key) } catch {}
    try { window.sessionStorage.removeItem(key) } catch {}
  },
}

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage:       typeof window !== 'undefined' ? hybridStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    },
  }
)
