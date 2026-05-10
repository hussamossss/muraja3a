import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyUnsubscribeToken } from '@/lib/unsubscribe-token'

export const runtime = 'nodejs'

type Lang = 'ar' | 'en'

const COPY = {
  ar: {
    okTitle:    'تم إلغاء الاشتراك ✓',
    okBody:     'لن يصلك بريد تذكير بعد الآن. تقدر تعيد التفعيل من إعدادات الحساب متى أردت.',
    errTitle:   'رابط غير صالح',
    errBody:    'رابط إلغاء الاشتراك منتهي الصلاحية أو غير صحيح.',
    backToApp:  'العودة للتطبيق',
  },
  en: {
    okTitle:    'Unsubscribed ✓',
    okBody:     "You'll no longer receive reminder emails. You can re-enable them anytime from your account settings.",
    errTitle:   'Invalid link',
    errBody:    'This unsubscribe link is invalid or expired.',
    backToApp:  'Back to app',
  },
} as const

function pickLang(req: Request, url: URL): Lang {
  const q = url.searchParams.get('lang')
  if (q === 'ar' || q === 'en') return q
  const al = req.headers.get('accept-language') ?? ''
  return al.toLowerCase().startsWith('ar') ? 'ar' : 'en'
}

function renderPage(lang: Lang, ok: boolean, appUrl: string): string {
  const t   = COPY[lang]
  const dir = lang === 'ar' ? 'rtl' : 'ltr'
  const title = ok ? t.okTitle : t.errTitle
  const body  = ok ? t.okBody  : t.errBody
  const tint  = ok ? '#22C55E' : '#EF4444'
  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>
  html,body{margin:0;padding:0;background:#0F1411;color:#F5E6D3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;}
  .wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;}
  .card{max-width:440px;width:100%;background:#1A1F1C;border:1px solid #252B28;border-top:3px solid ${tint};border-radius:16px;padding:36px 28px;text-align:center;}
  h1{margin:0 0 12px;font-size:22px;color:${tint};}
  p{margin:0 0 24px;color:#9CA3A0;line-height:1.7;font-size:15px;}
  a{display:inline-block;background:rgba(34,197,94,0.10);border:1px solid rgba(34,197,94,0.3);color:#22C55E;text-decoration:none;padding:10px 22px;border-radius:10px;font-weight:600;font-size:14px;}
</style>
</head>
<body>
  <div class="wrap"><div class="card">
    <h1>${title}</h1>
    <p>${body}</p>
    <a href="${appUrl}/account">${t.backToApp}</a>
  </div></div>
</body>
</html>`
}

async function doUnsubscribe(token: string): Promise<{ ok: boolean; status: number }> {
  const secret = process.env.NOTIFICATION_HMAC_SECRET
  if (!secret) return { ok: false, status: 500 }

  const userId = verifyUnsubscribeToken(token, secret)
  if (!userId) return { ok: false, status: 400 }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return { ok: false, status: 500 }

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
  const { error } = await admin
    .from('user_preferences')
    .update({ email_enabled: false, updated_at: new Date().toISOString() })
    .eq('user_id', userId)

  if (error) {
    console.error('[email-unsubscribe] update failed:', error)
    return { ok: false, status: 500 }
  }
  return { ok: true, status: 200 }
}

const HTML_HEADERS = { 'Content-Type': 'text/html; charset=utf-8' }

// User clicks the footer link → render an HTML confirmation page
export async function GET(req: Request) {
  const url    = new URL(req.url)
  const lang   = pickLang(req, url)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL('/', req.url).origin
  const token  = url.searchParams.get('token') ?? ''

  const { ok, status } = await doUnsubscribe(token)
  return new NextResponse(renderPage(lang, ok, appUrl), { status, headers: HTML_HEADERS })
}

// Gmail / Apple Mail one-click (RFC 8058): they POST with no body and expect 2xx.
// Token can come from query string or form body.
export async function POST(req: Request) {
  const url   = new URL(req.url)
  let token   = url.searchParams.get('token') ?? ''
  if (!token) {
    const ct = req.headers.get('content-type') ?? ''
    if (ct.includes('application/x-www-form-urlencoded')) {
      const form = await req.formData().catch(() => null)
      // RFC 8058 sends body `List-Unsubscribe=One-Click`; the token still lives
      // in the URL query string, but some clients send it in the body too.
      const t = form?.get('token')
      if (typeof t === 'string') token = t
    }
  }

  const { ok, status } = await doUnsubscribe(token)
  return NextResponse.json({ ok }, { status })
}
