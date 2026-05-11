import { createClient } from '@supabase/supabase-js'

const STORAGE_KEY = 'muraja3a-auth'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession:     true,
      autoRefreshToken:   true,
      detectSessionInUrl: true,
      storageKey:         STORAGE_KEY,
    },
  }
)

// Defensive: a stale/invalid refresh token causes supabase-js to log an
// AuthApiError ("Invalid Refresh Token" / "Refresh Token Not Found") and
// then fire SIGNED_OUT. Clear our explicit storage key and route protected
// routes back to /auth so the user lands somewhere usable instead of a
// broken authenticated page.
if (typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange((event) => {
    if (event !== 'SIGNED_OUT') return
    window.localStorage.removeItem(STORAGE_KEY)
    const path = window.location.pathname
    const isPublic =
      path === '/' ||
      path.startsWith('/auth') ||
      path.startsWith('/reset-password') ||
      path.startsWith('/update-password')
    if (!isPublic) window.location.replace('/auth')
  })
}
