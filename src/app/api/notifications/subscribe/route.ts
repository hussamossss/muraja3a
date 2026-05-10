import { NextResponse } from 'next/server'
import { authFromRequest } from '@/lib/supabase-server'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const auth = await authFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null) as
    | { endpoint?: string; p256dh?: string; auth?: string; userAgent?: string }
    | null
  if (!body?.endpoint || !body.p256dh || !body.auth) {
    return NextResponse.json({ error: 'invalid_subscription' }, { status: 400 })
  }

  const { error } = await auth.supabase
    .from('push_subscriptions')
    .upsert(
      {
        user_id:    auth.user.id,
        endpoint:   body.endpoint,
        p256dh:     body.p256dh,
        auth:       body.auth,
        user_agent: body.userAgent ?? null,
      },
      { onConflict: 'user_id,endpoint' }
    )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
