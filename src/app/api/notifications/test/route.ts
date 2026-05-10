import { NextResponse } from 'next/server'
import webpush from 'web-push'
import { authFromRequest } from '@/lib/supabase-server'
import type { PushSubscriptionRow } from '@/lib/types'

export const runtime = 'nodejs'

let vapidConfigured = false
function configureVapid() {
  if (vapidConfigured) return
  const pub  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  const subj = process.env.VAPID_SUBJECT
  if (!pub || !priv || !subj) throw new Error('VAPID keys not configured')
  webpush.setVapidDetails(subj, pub, priv)
  vapidConfigured = true
}

export async function POST(req: Request) {
  const auth = await authFromRequest(req)
  if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  try {
    configureVapid()
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }

  const body = await req.json().catch(() => null) as { endpoint?: string } | null

  let query = auth.supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', auth.user.id)
  if (body?.endpoint) query = query.eq('endpoint', body.endpoint)

  const { data: subs, error } = await query as { data: PushSubscriptionRow[] | null; error: { message: string } | null }

  if (error)              return NextResponse.json({ error: error.message }, { status: 500 })
  if (!subs?.length)      return NextResponse.json({ error: 'no_subscriptions' }, { status: 404 })

  const payload = JSON.stringify({
    title: 'مُراجِع',
    body:  'إشعار تجريبي — يعمل! · Test notification — it works!',
    url:   '/dashboard',
    tag:   'test',
  })

  const results = await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload
        )
        return { endpoint: s.endpoint, ok: true }
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode
        // 404/410 → endpoint gone → clean it up
        if (code === 404 || code === 410) {
          await auth.supabase
            .from('push_subscriptions')
            .delete()
            .eq('id', s.id)
        }
        return { endpoint: s.endpoint, ok: false, code, error: (err as Error).message }
      }
    })
  )

  const sent   = results.filter(r => r.ok).length
  const failed = results.length - sent
  const status = sent > 0 ? 200 : 502
  return NextResponse.json({ sent, failed, total: subs.length, results }, { status })
}
