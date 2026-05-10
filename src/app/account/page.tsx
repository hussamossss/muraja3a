'use client'

import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/lib/i18n'

export default function AccountPage() {
  const router = useRouter()
  const { t, lang, setLang } = useI18n()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', background:'var(--bg)' }}>
      <div style={{ background:'var(--bg)', padding:'48px 16px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12 }}>
        <button onClick={() => router.back()} style={backBtn}>‹</button>
        <span style={{ fontSize:18, fontWeight:700, color:'var(--cream)' }}>{t('accTitle')}</span>
      </div>

      <div style={{ flex:1, padding:'32px 16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:16, background:'var(--card)', border:'1px solid var(--border)', borderRadius:18, padding:'20px 18px', marginBottom:24 }}>
          <div style={{ width:52, height:52, borderRadius:'50%', background:'rgba(34,197,94,0.12)', border:'2px solid rgba(34,197,94,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, flexShrink:0 }}>
            👤
          </div>
          <div>
            <div style={{ fontSize:16, fontWeight:700, color:'var(--cream)' }}>{t('accMyAccount')}</div>
            <div style={{ fontSize:12, color:'var(--sub)', marginTop:3 }}>{t('accSub')}</div>
          </div>
        </div>

        {/* Language toggle */}
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:'16px 18px', marginBottom:16, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontSize:14, fontWeight:600, color:'var(--cream)' }}>{lang === 'ar' ? 'اللغة' : 'Language'}</div>
            <div style={{ fontSize:11, color:'var(--sub)', marginTop:2 }}>{lang === 'ar' ? 'عربي' : 'English'}</div>
          </div>
          <button
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            style={{ fontSize:13, fontWeight:700, color:'var(--cream)', background:'rgba(255,255,255,0.08)', border:'1px solid var(--border)', borderRadius:20, padding:'7px 18px', cursor:'pointer' }}>
            {lang === 'ar' ? 'EN ›' : 'AR ›'}
          </button>
        </div>

        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:'16px 18px', marginBottom:24 }}>
          <div style={{ fontSize:13, color:'var(--sub)', textAlign:'center' }}>{t('accPlaceholder')}</div>
        </div>

        <button onClick={handleSignOut} style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, width:'100%', padding:14, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:14, cursor:'pointer', fontFamily:'Amiri, serif', color:'#EF4444', fontSize:15, fontWeight:700 }}>
          {t('accSignOut')}
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
