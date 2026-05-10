// Edge Function: send-due-reminders
// Triggered hourly by pg_cron. For each user whose local hour matches their
// reminder_hour, count due pages and dispatch reminders via push and/or email.
// Idempotent: notification_logs has UNIQUE(user_id, sent_date, channel).

// deno-lint-ignore-file no-explicit-any

import { createClient } from 'jsr:@supabase/supabase-js@2'
import webpush from 'npm:web-push@^3.6.7'
import { renderEmail } from './email-template.ts'

const SUPABASE_URL    = Deno.env.get('SUPABASE_URL')!
// Supabase auto-injects SUPABASE_SERVICE_ROLE_KEY, but the dashboard UI blocks
// setting any secret starting with SUPABASE_. Fall back to SERVICE_ROLE_KEY so
// the secret can be set manually if the auto-injection isn't available.
const SERVICE_KEY     = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY')!
const VAPID_PUB       = Deno.env.get('VAPID_PUBLIC_KEY')   ?? ''
const VAPID_PRIV      = Deno.env.get('VAPID_PRIVATE_KEY')  ?? ''
const VAPID_SUB       = Deno.env.get('VAPID_SUBJECT')      ?? ''
const RESEND_API_KEY  = Deno.env.get('RESEND_API_KEY')     ?? ''
const FROM_EMAIL      = Deno.env.get('RESEND_FROM_EMAIL')  ?? 'Muraja3a <onboarding@resend.dev>'
const APP_URL         = Deno.env.get('APP_URL')            ?? 'http://localhost:3000'
const CRON_SECRET     = Deno.env.get('CRON_SECRET')        ?? ''
const HMAC_SECRET     = Deno.env.get('NOTIFICATION_HMAC_SECRET') ?? ''

if (VAPID_PUB && VAPID_PRIV && VAPID_SUB) {
  webpush.setVapidDetails(VAPID_SUB, VAPID_PUB, VAPID_PRIV)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

interface UserPref {
  user_id:        string
  timezone:       string
  reminder_hour:  number
  email_enabled:  boolean
  push_enabled:   boolean
  lang:           'ar' | 'en'
}

interface Subscription {
  id:        string
  endpoint:  string
  p256dh:    string
  auth:      string
}

function localHour(tz: string, now: Date): number {
  return parseInt(now.toLocaleString('en-US', { timeZone: tz, hour: 'numeric', hourCycle: 'h23' }), 10)
}

function localDate(tz: string, now: Date): string {
  // sv-SE locale formats as YYYY-MM-DD
  return now.toLocaleDateString('sv-SE', { timeZone: tz })
}

function base64UrlEncode(buf: Uint8Array): string {
  let str = ''
  for (const b of buf) str += String.fromCharCode(b)
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function signUnsubscribeToken(userId: string): Promise<string> {
  if (!HMAC_SECRET) return ''
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(HMAC_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(userId))
  return `${userId}.${base64UrlEncode(new Uint8Array(sig))}`
}

async function sendPush(sub: Subscription, payload: string) {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      payload,
    )
    return { ok: true as const }
  } catch (e) {
    const code = (e as { statusCode?: number }).statusCode
    return { ok: false as const, code, error: (e as Error).message }
  }
}

async function sendEmail(to: string, subject: string, html: string, text: string, unsubscribeUrl: string) {
  if (!RESEND_API_KEY) return { ok: false as const, error: 'RESEND_API_KEY not configured' }
  const headers: Record<string, string> = {}
  if (unsubscribeUrl) {
    // RFC 8058 — Gmail and other clients render a one-click unsubscribe button
    headers['List-Unsubscribe']      = `<${unsubscribeUrl}>`
    headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click'
  }
  const res = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ from: FROM_EMAIL, to, subject, html, text, headers }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    return { ok: false as const, error: `${res.status}: ${body.slice(0, 200)}` }
  }
  return { ok: true as const }
}

async function logResult(
  user_id: string, sent_date: string, channel: 'push' | 'email',
  due_count: number, status: 'sent' | 'failed' | 'skipped', error: string | null,
) {
  await supabase.from('notification_logs').upsert(
    { user_id, sent_date, channel, due_count, status, error },
    { onConflict: 'user_id,sent_date,channel' },
  )
}

async function alreadySent(user_id: string, sent_date: string, channel: 'push' | 'email'): Promise<boolean> {
  const { data } = await supabase
    .from('notification_logs')
    .select('status')
    .eq('user_id', user_id).eq('sent_date', sent_date).eq('channel', channel)
    .maybeSingle()
  return data?.status === 'sent'
}

Deno.serve(async (req) => {
  // Auth: require CRON_SECRET if set
  if (CRON_SECRET) {
    const auth = req.headers.get('authorization') ?? ''
    if (auth !== `Bearer ${CRON_SECRET}`) {
      return new Response('unauthorized', { status: 401 })
    }
  }

  const url = new URL(req.url)
  // ?user_id=... bypasses the hour match — useful for manual testing
  const testUserId = url.searchParams.get('user_id')
  // ?dry=1 logs would-send without actually sending
  const dryRun     = url.searchParams.get('dry') === '1'
  const now        = new Date()

  let prefsQuery = supabase.from('user_preferences').select('*')
  if (testUserId) prefsQuery = prefsQuery.eq('user_id', testUserId)
  const { data: prefs, error: prefsErr } = await prefsQuery
  if (prefsErr) {
    return new Response(JSON.stringify({ error: prefsErr.message }), {
      status:  500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const summary = {
    matched: 0, processed: 0, skipped: 0,
    push_sent: 0, push_failed: 0,
    email_sent: 0, email_failed: 0,
    errors: [] as string[],
    dryRun,
  }

  for (const p of (prefs ?? []) as UserPref[]) {
    if (!testUserId && localHour(p.timezone, now) !== p.reminder_hour) continue
    summary.matched++

    const today = localDate(p.timezone, now)

    const { count: dueCount, error: countErr } = await supabase
      .from('pages')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', p.user_id)
      .lte('next_review_date', today)

    if (countErr) {
      summary.errors.push(`count ${p.user_id}: ${countErr.message}`)
      continue
    }

    if (!dueCount || dueCount === 0) {
      // Log skipped to keep an audit trail
      if (p.email_enabled) await logResult(p.user_id, today, 'email', 0, 'skipped', 'no due pages')
      if (p.push_enabled)  await logResult(p.user_id, today, 'push',  0, 'skipped', 'no due pages')
      summary.skipped++
      continue
    }

    summary.processed++

    // ── Push channel ──
    if (p.push_enabled && !(await alreadySent(p.user_id, today, 'push'))) {
      const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', p.user_id)

      const payload = JSON.stringify({
        title: p.lang === 'ar' ? 'مُراجِع' : 'Muraja3a',
        body:  p.lang === 'ar'
          ? `لديك ${dueCount} ${dueCount === 1 ? 'صفحة' : 'صفحات'} للمراجعة اليوم 🌿`
          : `You have ${dueCount} ${dueCount === 1 ? 'page' : 'pages'} to review today 🌿`,
        url:   '/dashboard',
        tag:   'due-reminder',
        lang:  p.lang,
      })

      let anyOk = false
      const errs: string[] = []
      for (const s of (subs ?? []) as Subscription[]) {
        if (dryRun) { anyOk = true; continue }
        const r = await sendPush(s, payload)
        if (r.ok) { anyOk = true; summary.push_sent++ }
        else {
          summary.push_failed++
          if (r.code === 404 || r.code === 410) {
            await supabase.from('push_subscriptions').delete().eq('id', s.id)
          }
          errs.push(`${r.code ?? '?'}:${r.error}`)
        }
      }

      const status = (subs && subs.length > 0)
        ? (anyOk ? 'sent' : 'failed')
        : 'skipped'
      await logResult(p.user_id, today, 'push', dueCount, status,
        errs.length ? errs.join('; ').slice(0, 300) : (status === 'skipped' ? 'no subscriptions' : null))
    }

    // ── Email channel ──
    if (p.email_enabled && !(await alreadySent(p.user_id, today, 'email'))) {
      const { data: userData, error: uErr } = await supabase.auth.admin.getUserById(p.user_id)
      const email = userData?.user?.email
      if (uErr || !email) {
        summary.errors.push(`email lookup ${p.user_id}: ${uErr?.message ?? 'no email'}`)
        await logResult(p.user_id, today, 'email', dueCount, 'failed', `lookup: ${uErr?.message ?? 'no email'}`)
        continue
      }
      if (dryRun) {
        summary.email_sent++
        continue
      }
      const token = await signUnsubscribeToken(p.user_id)
      const unsubscribeUrl = token
        ? `${APP_URL}/api/notifications/email-unsubscribe?token=${encodeURIComponent(token)}&lang=${p.lang}`
        : ''
      const { subject, html, text } = renderEmail({ lang: p.lang, dueCount, appUrl: APP_URL, unsubscribeUrl })
      const r = await sendEmail(email, subject, html, text, unsubscribeUrl)
      if (r.ok) summary.email_sent++
      else      summary.email_failed++
      await logResult(p.user_id, today, 'email', dueCount,
        r.ok ? 'sent' : 'failed',
        r.ok ? null : r.error.slice(0, 300))
    }
  }

  return new Response(JSON.stringify(summary, null, 2), {
    headers: { 'Content-Type': 'application/json' },
  })
})
