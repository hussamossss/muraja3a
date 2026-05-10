import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'

// The client app stores auth in localStorage (storageKey: 'muraja3a-auth'),
// so API routes can't read auth from cookies. Instead, the client passes the
// access token in the Authorization header, and we verify it here.

export function getServerSupabase(accessToken: string): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth:   { persistSession: false, autoRefreshToken: false },
    }
  )
}

export async function authFromRequest(
  req: Request
): Promise<{ user: User; supabase: SupabaseClient } | null> {
  const header = req.headers.get('authorization')
  if (!header?.toLowerCase().startsWith('bearer ')) return null
  const token = header.slice(7).trim()
  if (!token) return null

  const supabase = getServerSupabase(token)
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return null
  return { user: data.user, supabase }
}
