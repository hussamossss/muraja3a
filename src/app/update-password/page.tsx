'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useT } from '@/lib/i18n'

export default function UpdatePasswordPage() {
  const router = useRouter()
  const t = useT()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleUpdate() {
    if (!password || !confirm) { setError(t.updatePassword.emptyFields); return }
    if (password !== confirm) { setError(t.updatePassword.mismatch); return }
    if (password.length < 6) { setError(t.updatePassword.tooShort); return }
    setLoading(true); setError('')
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      router.push('/dashboard')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      <div style={{
        background: 'var(--bg)',
        borderBottom: '1px solid var(--border)',
        padding: '24px 16px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--cream)' }}>{t.updatePassword.title}</span>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 20, padding: '28px 22px', width: '100%', maxWidth: 380,
          display: 'flex', flexDirection: 'column', gap: 14, textAlign: 'center',
        }}>
          <div style={{ fontSize: 48 }}>🔒</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--cream)' }}>{t.updatePassword.heading}</div>

          <input
            type="password"
            placeholder={t.updatePassword.newPasswordPlaceholder}
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={inputStyle}
          />
          <input
            type="password"
            placeholder={t.updatePassword.confirmPasswordPlaceholder}
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleUpdate()}
            style={inputStyle}
          />

          {error && <div style={{ fontSize: 12, color: 'var(--red)' }}>{error}</div>}

          <button onClick={handleUpdate} disabled={loading} style={primaryBtn}>
            {loading ? t.updatePassword.updating : t.updatePassword.update}
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
