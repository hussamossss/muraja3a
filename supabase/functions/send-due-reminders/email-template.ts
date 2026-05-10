// AR/EN HTML email template for the daily review reminder.
// Plain HTML/inline CSS — broad email-client compatibility.

type Lang = 'ar' | 'en'

interface EmailParams {
  lang:            Lang
  dueCount:        number
  appUrl:          string
  unsubscribeUrl?: string
}

interface Email {
  subject: string
  html:    string
  text:    string
}

const T = {
  ar: {
    subject:     (n: number) => `عندك ${n} ${n === 1 ? 'صفحة' : 'صفحات'} للمراجعة اليوم`,
    title:       'وقت المراجعة 🌿',
    body:        (n: number) => `اليوم لديك <strong>${n}</strong> ${n === 1 ? 'صفحة' : 'صفحات'} مجدولة للمراجعة.`,
    cta:         'ابدأ المراجعة',
    footer:      'مُراجِع · مجدول مراجعة الحفظ',
    unsubscribe: 'إلغاء الاشتراك من رسائل التذكير',
    text:        (n: number, url: string) => `اليوم عندك ${n} ${n === 1 ? 'صفحة' : 'صفحات'} للمراجعة.\n\nابدأ: ${url}`,
    textUnsub:   (url: string) => `\n\nلإلغاء الاشتراك: ${url}`,
  },
  en: {
    subject:     (n: number) => `You have ${n} ${n === 1 ? 'page' : 'pages'} to review today`,
    title:       'Time to review 🌿',
    body:        (n: number) => `You have <strong>${n}</strong> ${n === 1 ? 'page' : 'pages'} scheduled for review today.`,
    cta:         'Start review',
    footer:      'Muraja3a · Quran review scheduler',
    unsubscribe: 'Unsubscribe from reminder emails',
    text:        (n: number, url: string) => `You have ${n} ${n === 1 ? 'page' : 'pages'} to review today.\n\nStart: ${url}`,
    textUnsub:   (url: string) => `\n\nUnsubscribe: ${url}`,
  },
} as const

export function renderEmail({ lang, dueCount, appUrl, unsubscribeUrl }: EmailParams): Email {
  const t   = T[lang]
  const dir = lang === 'ar' ? 'rtl' : 'ltr'
  const url = `${appUrl}/dashboard`

  const unsubFooter = unsubscribeUrl
    ? `<div style="margin-top:10px;"><a href="${unsubscribeUrl}" style="color:#6B7270;text-decoration:underline;font-size:11px;">${t.unsubscribe}</a></div>`
    : ''

  const html = `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${t.title}</title>
</head>
<body style="margin:0;padding:0;background:#0F1411;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0F1411;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#1A1F1C;border-radius:16px;border:1px solid #252B28;">
        <tr><td style="padding:40px 32px 24px;text-align:center;">
          <div style="font-size:48px;line-height:1;">📖</div>
          <h1 style="margin:18px 0 0;color:#F5E6D3;font-size:22px;font-weight:700;">${t.title}</h1>
        </td></tr>
        <tr><td style="padding:0 32px 28px;color:#9CA3A0;font-size:15px;line-height:1.7;text-align:center;">
          ${t.body(dueCount)}
        </td></tr>
        <tr><td align="center" style="padding:0 32px 36px;">
          <a href="${url}" style="display:inline-block;background:#22C55E;color:#0F1411;text-decoration:none;font-weight:700;font-size:15px;padding:12px 32px;border-radius:10px;">${t.cta}</a>
        </td></tr>
        <tr><td style="padding:18px 32px;border-top:1px solid #252B28;color:#6B7270;font-size:11px;text-align:center;line-height:1.6;">
          ${t.footer}
          ${unsubFooter}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  const textBody = t.text(dueCount, url) + (unsubscribeUrl ? t.textUnsub(unsubscribeUrl) : '')

  return {
    subject: t.subject(dueCount),
    html,
    text: textBody,
  }
}
