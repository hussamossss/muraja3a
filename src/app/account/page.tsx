'use client'

import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useLang, useT } from '@/lib/i18n'

export default function AccountPage() {
  const router = useRouter()
  const { lang, setLang } = useLang()
  const t = useT()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', background:'var(--bg)' }}>

      {/* Header */}
      <div style={{ background:'var(--bg)', padding:'48px 16px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12 }}>
        <button onClick={() => router.back()} style={backBtn}>‹</button>
        <span style={{ fontSize:18, fontWeight:700, color:'var(--cream)' }}>{t.account.title}</span>
      </div>

      {/* Body */}
      <div style={{ flex:1, padding:'32px 16px' }}>

        {/* Account header */}
        <div style={{ display:'flex', alignItems:'center', gap:16, background:'var(--card)', border:'1px solid var(--border)', borderRadius:18, padding:'20px 18px', marginBottom:24 }}>
          <div style={{ width:52, height:52, borderRadius:'50%', background:'rgba(34,197,94,0.12)', border:'2px solid rgba(34,197,94,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, flexShrink:0 }}>
            👤
          </div>
          <div>
            <div style={{ fontSize:16, fontWeight:700, color:'var(--cream)' }}>{t.account.myAccount}</div>
            <div style={{ fontSize:12, color:'var(--sub)', marginTop:3 }}>{t.account.settingsDesc}</div>
          </div>
        </div>

        {/* Language toggle */}
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:'16px 18px', marginBottom:16 }}>
          <div style={{ fontSize:12, color:'var(--sub)', marginBottom:10, fontWeight:600 }}>{t.account.language}</div>
          <div style={{ display:'flex', gap:8 }}>
            {(['ar', 'en'] as const).map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                style={{
                  flex:1, padding:'10px', borderRadius:10, cursor:'pointer',
                  border:`1.5px solid ${lang === l ? '#38BDF8' : 'var(--border)'}`,
                  background: lang === l ? '#38BDF812' : '#0F1210',
                  color: lang === l ? '#38BDF8' : 'var(--sub)',
                  fontSize:14, fontWeight:700, fontFamily:'Amiri, serif',
                  transition:'all .15s',
                }}
              >
                {l === 'ar' ? 'العربية' : 'English'}
              </button>
            ))}
          </div>
        </div>

        {/* Placeholder for future settings */}
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:'16px 18px', marginBottom:24 }}>
          <div style={{ fontSize:13, color:'var(--sub)', textAlign:'center' }}>
            {t.account.comingSoon}
          </div>
        </div>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, width:'100%', padding:14, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:14, cursor:'pointer', fontFamily:'Amiri, serif', color:'#EF4444', fontSize:15, fontWeight:700 }}>
          {t.account.signOut}
        </button>
      </div>
    </div>
  )
}

const backBtn: React.CSSProperties = {
  width:36, height:36, borderRadius:10,
  background:'transparent', border:'1px solid var(--border)',
  color:'var(--sub)', cursor:'pointer', fontSize:20,
}
