'use client'

import { useRouter } from 'next/navigation'
import { useI18n } from '@/lib/i18n'

const BUY_ME_A_COFFEE_URL = 'https://buymeacoffee.com/hussamossss'
const PAYPAL_URL          = 'https://paypal.me/MohamadHussamA'

export default function SupportPage() {
  const router = useRouter()
  const { t }  = useI18n()

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', background:'var(--bg)' }}>

      <div style={{ background:'var(--bg)', padding:'48px 16px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12 }}>
        <button onClick={() => router.back()} style={backBtn}>‹</button>
        <span style={{ fontSize:18, fontWeight:700, color:'var(--cream)' }}>{t('supportTitle')}</span>
      </div>

      <div style={{ flex:1, padding:'32px 16px 40px' }}>

        {/* Hero */}
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderTop:'3px solid #22C55E', borderRadius:18, padding:'32px 24px 28px', marginBottom:20, textAlign:'center' }}>
          <div style={{ fontSize:48, lineHeight:1, marginBottom:14 }}>❤️</div>
          <h1 style={{ margin:'0 0 10px', fontSize:20, fontWeight:700, color:'var(--cream)' }}>{t('supportHeading')}</h1>
          <p style={{ margin:'0 0 8px', fontSize:14, color:'var(--cream)', opacity:0.92, lineHeight:1.7 }}>{t('supportLead')}</p>
          <p style={{ margin:0, fontSize:13, color:'var(--sub)', lineHeight:1.7 }}>{t('supportBody')}</p>
        </div>

        {/* Support options */}
        <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:24 }}>

          <SupportOption
            href={BUY_ME_A_COFFEE_URL}
            icon="☕"
            tint="#FFDD00"
            label={t('supportCoffeeLabel')}
            desc={t('supportCoffeeDesc')}
          />

          <SupportOption
            href={PAYPAL_URL}
            icon="💳"
            tint="#0070BA"
            label={t('supportPaypalLabel')}
            desc={t('supportPaypalDesc')}
          />

        </div>

        <p style={{ textAlign:'center', fontSize:13, color:'var(--sub)', lineHeight:1.8 }}>{t('supportThanks')}</p>

      </div>
    </div>
  )
}

function SupportOption({ href, icon, tint, label, desc }: { href: string; icon: string; tint: string; label: string; desc: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display:'flex', alignItems:'center', gap:14,
        padding:'16px 18px',
        background:'var(--card)', border:'1px solid var(--border)',
        borderLeft:`3px solid ${tint}`,
        borderRadius:14, textDecoration:'none',
        cursor:'pointer',
      }}
    >
      <span style={{ fontSize:26, lineHeight:1, flexShrink:0 }}>{icon}</span>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:15, fontWeight:700, color:'var(--cream)' }}>{label}</div>
        <div style={{ fontSize:12, color:'var(--sub)', marginTop:2 }}>{desc}</div>
      </div>
      <span style={{ color:'var(--sub)', fontSize:18, flexShrink:0 }}>›</span>
    </a>
  )
}

const backBtn: React.CSSProperties = {
  width:36, height:36, borderRadius:10,
  background:'transparent', border:'1px solid var(--border)',
  color:'var(--sub)', cursor:'pointer', fontSize:20,
}
