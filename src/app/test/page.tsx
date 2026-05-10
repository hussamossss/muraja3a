'use client'

import { useRouter } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import { useI18n } from '@/lib/i18n'

export default function TestPage() {
  const router = useRouter()
  const { t } = useI18n()

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', background:'var(--bg)' }}>

      {/* Header */}
      <div style={{ background:'var(--bg)', padding:'48px 16px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12 }}>
        <button onClick={() => router.back()} style={backBtn}>‹</button>
        <span style={{ fontSize:18, fontWeight:700, color:'var(--cream)' }}>{t('testTitle')}</span>
      </div>

      {/* Body */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'40px 24px 86px', textAlign:'center' }}>
        <div style={{ fontSize:64, marginBottom:24 }}>🧪</div>
        <div style={{ fontSize:22, fontWeight:700, color:'var(--cream)', marginBottom:12 }}>{t('testTitle')}</div>
        <div style={{ fontSize:15, color:'var(--sub)', lineHeight:1.8, maxWidth:280 }}>
          {t('testComingSoon')}
        </div>
      </div>

      <BottomNav/>
    </div>
  )
}

const backBtn: React.CSSProperties = {
  width:36, height:36, borderRadius:10,
  background:'transparent', border:'1px solid var(--border)',
  color:'var(--sub)', cursor:'pointer', fontSize:20,
}
