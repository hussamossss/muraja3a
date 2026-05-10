import crypto from 'crypto'

// Token format: `<user_id>.<base64url(hmac_sha256(secret, user_id))>`
// No expiry — unsubscribe links must work indefinitely. The only thing the
// token can do is set email_enabled=false, which the user can reverse from
// the account settings page.

function base64UrlEncode(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlDecode(str: string): Buffer {
  const padded = str + '='.repeat((4 - (str.length % 4)) % 4)
  return Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
}

export function signUnsubscribeToken(userId: string, secret: string): string {
  const sig = crypto.createHmac('sha256', secret).update(userId).digest()
  return `${userId}.${base64UrlEncode(sig)}`
}

export function verifyUnsubscribeToken(token: string, secret: string): string | null {
  const idx = token.lastIndexOf('.')
  if (idx <= 0) return null

  const userId = token.slice(0, idx)
  const sigB64 = token.slice(idx + 1)

  const expected = crypto.createHmac('sha256', secret).update(userId).digest()
  let provided: Buffer
  try {
    provided = base64UrlDecode(sigB64)
  } catch {
    return null
  }

  if (expected.length !== provided.length) return null
  if (!crypto.timingSafeEqual(expected, provided)) return null
  return userId
}
