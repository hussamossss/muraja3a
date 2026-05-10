'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/lib/i18n'

export default function ResetPasswordPage() {
  const router = useRouter()
  const { t }  = useI18n()
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState('')

  async function handleReset() {
    if (!email) { setError(t('resetErrEmpty')); return }
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
    <div className="min-h-screen flex flex-col" style={{ background:'var(--bg)' }}>
      <div style={{ background:'var(--bg)', borderBottom:'1px solid var(--border)', padding:'24px 16px 16px', display:'flex', alignItems:'center', gap:12 }}>
        <button onClick={() => router.back()} style={backBtn}>‹</button>
        <span style={{ fontSize:17, fontWeight:700, color:'var(--cream)' }}>{t('resetTitle')}</span>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:20, padding:'28px 22px', width:'100%', maxWidth:380, display:'flex', flexDirection:'column', gap:14, textAlign:'center' }}>
          {sent ? (
            <>
              <div style={{ fontSize:48 }}>📬</div>
              <div style={{ fontSize:17, fontWeight:700, color:'var(--cream)' }}>{t('resetSentTitle')}</div>
              <div style={{ fontSize:13, color:'var(--sub)' }}>{t('resetSentSub')}</div>
              <button onClick={() => router.push('/auth')} style={primaryBtn}>{t('resetBackLogin')}</button>
            </>
          ) : (
            <>
              <div style={{ fontSize:48 }}>🔑</div>
              <div style={{ fontSize:17, fontWeight:700, color:'var(--cream)' }}>{t('resetForgotTitle')}</div>
              <div style={{ fontSize:13, color:'var(--sub)' }}>{t('resetForgotSub')}</div>
              <input
                type="email"
                placeholder={t('resetEmail')}
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleReset()}
                style={inputStyle}
              />
              {error && <div style={{ fontSize:12, color:'var(--red)' }}>{error}</div>}
              <button onClick={handleReset} disabled={loading} style={primaryBtn}>
                {loading ? t('resetSending') : t('resetSendBtn')}
              </button>
            </>
          )}
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
const backBtn: React.CSSProperties = {
  width:36, height:36, borderRadius:10,
  background:'transparent', border:'1px solid var(--border)',
  color:'var(--sub)', cursor:'pointer', fontSize:18,
}
