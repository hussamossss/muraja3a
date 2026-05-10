import { NextResponse } from 'next/server'
import { authFromRequest } from '@/lib/supabase-server'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const auth = await authFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null) as { endpoint?: string } | null
  if (!body?.endpoint) {
    return NextResponse.json({ error: 'missing_endpoint' }, { status: 400 })
  }

  const { error } = await auth.supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id',  auth.user.id)
    .eq('endpoint', body.endpoint)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
