'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/lib/i18n'

export default function AuthPage() {
  const router = useRouter()
  const { t }  = useI18n()
  const [isSignup, setIsSignup] = useState(false)
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  async function handleSubmit() {
    if (!email || !password) { setError(t('authErrEmpty')); return }
    setLoading(true); setError('')
    try {
      const { error } = isSignup
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      router.push('/dashboard')
    } catch (e: any) {
      setError(e.message.includes('Invalid') ? t('authErrInvalid') : e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div style={{ background:'var(--bg)', borderBottom:'1px solid var(--border)', padding:'48px 20px 32px', textAlign:'center' }}>
        <div style={{ fontSize:48, marginBottom:8 }}>📖</div>
        <div style={{ fontSize:22, fontWeight:700, color:'var(--cream)' }}>{t('authAppTitle')}</div>
        <div style={{ fontSize:13, color:'var(--sub)', marginTop:6 }}>{t('authAppSub')}</div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:20, padding:'28px 22px', width:'100%', maxWidth:380, display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ fontSize:20, fontWeight:700, color:'var(--cream)', textAlign:'center' }}>
            {isSignup ? t('authSignUp') : t('authSignIn')}
          </div>

          <form onSubmit={e => { e.preventDefault(); handleSubmit() }} style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <input
              type="email"
              placeholder={t('authEmail')}
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              style={inputStyle}
            />
            <input
              type="password"
              placeholder={t('authPassword')}
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              style={inputStyle}
            />
            {error && <div style={{ fontSize:12, color:'var(--red)', textAlign:'center' }}>{error}</div>}
            <button type="submit" disabled={loading} style={primaryBtn}>
              {loading ? t('authLoading') : isSignup ? t('authSignUpBtn') : t('authSignInBtn')}
            </button>
          </form>

          <div style={{ textAlign:'center' }}>
            <button onClick={() => { setIsSignup(!isSignup); setError('') }} style={linkBtn}>
              {isSignup ? t('authHaveAccount') : t('authNoAccount')}
            </button>
          </div>

          <div style={{ height:1, background:'var(--border)' }} />

          <button onClick={() => router.push('/reset-password')} style={linkBtn}>
            {t('authForgotPw')}
          </button>
        </div>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  background:'#0F1210', border:'1.5px solid var(--border)',
  borderRadius:12, padding:'13px 16px', fontSize:15,
  color:'var(--cream)', width:'100%', outline:'none',
  fontFamily:'Amiri, serif', direction:'ltr', textAlign:'left',
}
const primaryBtn: React.CSSProperties = {
  background:'#16A34A', border:'none', color:'#ffffff',
  padding:14, borderRadius:14, cursor:'pointer',
  fontSize:15, fontWeight:700, width:'100%', fontFamily:'Amiri, serif',
}
const linkBtn: React.CSSProperties = {
  background:'none', border:'none', color:'var(--green)',
  fontSize:13, cursor:'pointer', fontFamily:'Amiri, serif',
  textDecoration:'underline', textUnderlineOffset:3,
}
