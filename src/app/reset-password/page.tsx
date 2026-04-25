'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleReset() {
    if (!email) { setError('أدخل بريدك الإلكتروني'); return }
    setLoading(true); setError('')
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/update-password`,
      })
      if (error) throw error
      setSent(true)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div style={{
        background: 'linear-gradient(160deg, #1a3a22 0%, #0f1c14 100%)',
        borderBottom: '1px solid var(--border)',
        padding: '24px 16px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button onClick={() => router.back()} style={backBtn}>‹</button>
        <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--cream)' }}>استرجاع كلمة المرور</span>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 20, padding: '28px 22px', width: '100%', maxWidth: 380,
          display: 'flex', flexDirection: 'column', gap: 14, textAlign: 'center',
        }}>
          {sent ? (
            <>
              <div style={{ fontSize: 48 }}>📬</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--cream)' }}>تم الإرسال!</div>
              <div style={{ fontSize: 13, color: 'var(--sub)' }}>تحقق من بريدك الإلكتروني واضغط على الرابط</div>
              <button onClick={() => router.push('/auth')} style={primaryBtn}>العودة لتسجيل الدخول</button>
            </>
          ) : (
            <>
              <div style={{ fontSize: 48 }}>🔑</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--cream)' }}>نسيت كلمة المرور؟</div>
              <div style={{ fontSize: 13, color: 'var(--sub)' }}>أدخل بريدك وسنرسل لك رابط الاسترجاع</div>
              <input
                type="email"
                placeholder="البريد الإلكتروني"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleReset()}
                style={inputStyle}
              />
              {error && <div style={{ fontSize: 12, color: '#e07070' }}>{error}</div>}
              <button onClick={handleReset} disabled={loading} style={primaryBtn}>
                {loading ? 'جارٍ الإرسال...' : 'إرسال رابط الاسترجاع'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  background: 'rgba(0,0,0,0.3)', border: '1.5px solid var(--border)',
  borderRadius: 12, padding: '13px 16px', fontSize: 15,
  color: 'var(--cream)', width: '100%', outline: 'none',
  fontFamily: 'Amiri, serif', direction: 'ltr', textAlign: 'left',
}

const primaryBtn: React.CSSProperties = {
  background: 'linear-gradient(135deg, #2a5a3a, #1a3a2a)',
  border: '1px solid var(--green)', color: '#7ec8a0',
  padding: 14, borderRadius: 14, cursor: 'pointer',
  fontSize: 15, fontWeight: 700, width: '100%',
  fontFamily: 'Amiri, serif',
}

const backBtn: React.CSSProperties = {
  width: 36, height: 36, borderRadius: 10,
  background: 'transparent', border: '1px solid var(--border)',
  color: 'var(--sub)', cursor: 'pointer', fontSize: 18,
}
