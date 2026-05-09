'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useT } from '@/lib/i18n'

export default function AuthPage() {
  const router = useRouter()
  const t = useT()
  const [isSignup, setIsSignup] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!email || !password) { setError(t.auth.emptyFields); return }
    setLoading(true); setError('')
    try {
      const { error } = isSignup
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password })

      if (error) throw error
      router.push('/dashboard')
    } catch (e: any) {
      setError(e.message.includes('Invalid') ? t.auth.wrongCredentials : e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div style={{
        background: 'var(--bg)',
        borderBottom: '1px solid var(--border)',
        padding: '48px 20px 32px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>📖</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--cream)' }}>{t.auth.appTitle}</div>
        <div style={{ fontSize: 13, color: 'var(--sub)', marginTop: 6 }}>{t.auth.tagline}</div>
      </div>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 20, padding: '28px 22px', width: '100%', maxWidth: 380,
          display: 'flex', flexDirection: 'column', gap: 14,
        }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--cream)', textAlign: 'center' }}>
            {isSignup ? t.auth.createAccount : t.auth.signIn}
          </div>

          <form onSubmit={e => { e.preventDefault(); handleSubmit() }}
            style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <input
              type="email"
              placeholder={t.auth.email}
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              style={inputStyle}
            />
            <input
              type="password"
              placeholder={t.auth.password}
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              style={inputStyle}
            />

            {error && (
              <div style={{ fontSize: 12, color: 'var(--red)', textAlign: 'center' }}>{error}</div>
            )}

            <button type="submit" disabled={loading} style={primaryBtn}>
              {loading ? t.auth.loading : isSignup ? t.auth.creating : t.auth.entering}
            </button>
          </form>

          <div style={{ textAlign: 'center' }}>
            <button onClick={() => { setIsSignup(!isSignup); setError('') }} style={linkBtn}>
              {isSignup ? t.auth.haveAccount : t.auth.noAccount}
            </button>
          </div>

          <div style={{ height: 1, background: 'var(--border)' }} />

          <button onClick={() => router.push('/reset-password')} style={linkBtn}>
            {t.auth.forgotPassword}
          </button>
        </div>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  background: '#0F1210', border: '1.5px solid var(--border)',
  borderRadius: 12, padding: '13px 16px', fontSize: 15,
  color: 'var(--cream)', width: '100%', outline: 'none',
  fontFamily: 'Amiri, serif', direction: 'ltr', textAlign: 'left',
}

const primaryBtn: React.CSSProperties = {
  background: '#16A34A', border: 'none', color: '#ffffff',
  padding: 14, borderRadius: 14, cursor: 'pointer',
  fontSize: 15, fontWeight: 700, width: '100%',
  fontFamily: 'Amiri, serif',
}

const linkBtn: React.CSSProperties = {
  background: 'none', border: 'none', color: 'var(--green)',
  fontSize: 13, cursor: 'pointer', fontFamily: 'Amiri, serif',
  textDecoration: 'underline', textUnderlineOffset: 3,
}
