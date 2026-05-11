'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n'

export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/dashboard')
    })
  }, [])

  return <LandingPage />
}

const T = {
  bg:'#0B0D0C', card:'#161A18', border:'#252B28', title:'#FFFFFF',
  sub:'#8A8F8F', green:'#22C55E', accent:'#38BDF8', purple:'#A855F7', orange:'#F97316',
}

function LandingPage() {
  const { t, lang, setLang } = useI18n()

  const FEATURES = [
    { icon:'🧠', color:'#22C55E', title: t('feat1Title'), desc: t('feat1Desc') },
    { icon:'📋', color:'#38BDF8', title: t('feat2Title'), desc: t('feat2Desc') },
    { icon:'📊', color:'#A855F7', title: t('feat3Title'), desc: t('feat3Desc') },
    { icon:'📅', color:'#F97316', title: t('feat4Title'), desc: t('feat4Desc') },
    { icon:'⚡', color:'#22C55E', title: t('feat5Title'), desc: t('feat5Desc') },
    { icon:'🔒', color:'#38BDF8', title: t('feat6Title'), desc: t('feat6Desc') },
  ]
  const STEPS = [
    { icon:'📖', color:'#22C55E', title: t('step1Title'), desc: t('step1Desc') },
    { icon:'🔔', color:'#38BDF8', title: t('step2Title'), desc: t('step2Desc') },
    { icon:'⭐', color:'#F97316', title: t('step3Title'), desc: t('step3Desc') },
    { icon:'📈', color:'#A855F7', title: t('step4Title'), desc: t('step4Desc') },
  ]
  const AUDIENCE = [
    { icon:'🕌', title: t('aud1Title'), desc: t('aud1Desc') },
    { icon:'👨‍👩‍👧', title: t('aud2Title'), desc: t('aud2Desc') },
    { icon:'🌙', title: t('aud3Title'), desc: t('aud3Desc') },
    { icon:'📚', title: t('aud4Title'), desc: t('aud4Desc') },
  ]
  const STATS = [
    { num:'604',  label: t('landingStat1') },
    { num:'3',    label: t('landingStat2') },
    { num: lang === 'ar' ? 'آلي' : 'Auto', label: t('landingStat3') },
    { num: lang === 'ar' ? '٪١٠٠' : '100%', label: t('landingStat4') },
  ]

  return (
    <div style={{ background: T.bg, color: T.title, fontFamily:"'Amiri','Cairo',Georgia,serif", direction: lang === 'ar' ? 'rtl' : 'ltr', minHeight:'100vh' }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        .a1{animation:fadeUp .7s ease both}
        .a2{animation:fadeUp .7s .15s ease both}
        .a3{animation:fadeUp .7s .3s ease both}
        a{text-decoration:none}
        *{box-sizing:border-box}
      `}</style>

      {/* Navbar */}
      <nav style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'18px 28px', borderBottom:`1px solid ${T.border}`, position:'sticky', top:0, background:`${T.bg}F0`, backdropFilter:'blur(12px)', zIndex:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon-192.png" alt="" width={32} height={32} style={{ borderRadius:8 }}/>
          <span style={{ fontSize:22, fontWeight:800, color: T.green, letterSpacing:-.5 }}>مُراجِع</span>
        </div>
        <div style={{ display:'flex', gap:12, alignItems:'center' }}>
          <button onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')} style={{ background:'rgba(255,255,255,0.06)', border:`1px solid ${T.border}`, color: T.sub, fontSize:12, fontWeight:700, padding:'6px 14px', borderRadius:20, cursor:'pointer' }}>
            {lang === 'ar' ? 'EN' : 'AR'}
          </button>
          <Link href="/auth">
            <span style={{ background: T.green, color:'#000', padding:'9px 24px', borderRadius:22, fontSize:14, fontWeight:700, cursor:'pointer', display:'inline-block' }}>
              {t('landingSignIn')}
            </span>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ textAlign:'center', padding:'88px 24px 72px', maxWidth:720, margin:'0 auto' }}>
        <div className="a1" style={{ fontSize:13, fontWeight:700, color: T.green, background:`${T.green}15`, display:'inline-block', padding:'6px 18px', borderRadius:20, marginBottom:28, letterSpacing:.8 }}>
          {t('landingHeroBadge')}
        </div>
        <h1 className="a2" style={{ fontSize:'clamp(38px,9vw,68px)', fontWeight:800, lineHeight:1.15, margin:'0 0 22px', letterSpacing:-.5 }}>
          {t('landingHeroLine1')}<br/>
          <span style={{ color: T.green }}>{t('landingHeroLine2')}</span>
        </h1>
        <p className="a3" style={{ fontSize:17, color: T.sub, lineHeight:1.8, margin:'0 0 44px', maxWidth:480, marginInline:'auto' }}>
          {t('landingHeroSub')}
        </p>
        <div className="a3" style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
          <Link href="/auth">
            <span style={{ background: T.green, color:'#000', padding:'15px 40px', borderRadius:30, fontSize:16, fontWeight:800, cursor:'pointer', display:'inline-block', boxShadow:`0 8px 28px ${T.green}35` }}>
              {t('landingStartFree')}
            </span>
          </Link>
          <a href="#features">
            <span style={{ color: T.sub, padding:'15px 24px', borderRadius:30, fontSize:15, fontWeight:600, cursor:'pointer', border:`1px solid ${T.border}`, display:'inline-block' }}>
              {t('landingLearnMore')}
            </span>
          </a>
        </div>
      </section>

      {/* Stats strip */}
      <div style={{ borderTop:`1px solid ${T.border}`, borderBottom:`1px solid ${T.border}`, display:'flex', justifyContent:'center', flexWrap:'wrap' }}>
        {STATS.map((s, i) => (
          <div key={i} style={{ flex:'1 1 130px', textAlign:'center', padding:'22px 16px', borderLeft: i > 0 ? `1px solid ${T.border}` : 'none' }}>
            <div style={{ fontSize:30, fontWeight:800, color: T.green }}>{s.num}</div>
            <div style={{ fontSize:12, color: T.sub, marginTop:4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Features */}
      <section id="features" style={{ padding:'72px 24px', maxWidth:1000, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:52 }}>
          <div style={{ fontSize:12, color: T.accent, fontWeight:700, marginBottom:10, letterSpacing:1 }}>{t('landingFeatLabel')}</div>
          <h2 style={{ fontSize:'clamp(26px,5vw,38px)', fontWeight:800, margin:0 }}>{t('landingFeatTitle')}</h2>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(290px,1fr))', gap:16 }}>
          {FEATURES.map((f, i) => (
            <div key={i} style={{ background: T.card, border:`1px solid ${T.border}`, borderTop:`3px solid ${f.color}`, borderRadius:18, padding:'28px 22px' }}>
              <div style={{ fontSize:34, marginBottom:16 }}>{f.icon}</div>
              <div style={{ fontSize:17, fontWeight:700, color: T.title, marginBottom:10 }}>{f.title}</div>
              <div style={{ fontSize:13, color: T.sub, lineHeight:1.8 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{ background: T.card, borderTop:`1px solid ${T.border}`, borderBottom:`1px solid ${T.border}`, padding:'72px 24px' }}>
        <div style={{ maxWidth:760, margin:'0 auto', textAlign:'center' }}>
          <div style={{ fontSize:12, color: T.purple, fontWeight:700, marginBottom:10, letterSpacing:1 }}>{t('landingHowLabel')}</div>
          <h2 style={{ fontSize:'clamp(26px,5vw,38px)', fontWeight:800, margin:'0 0 52px' }}>{t('landingHowTitle')}</h2>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:32 }}>
            {STEPS.map((s, i) => (
              <div key={i}>
                <div style={{ width:56, height:56, borderRadius:'50%', background:`${s.color}15`, border:`2px solid ${s.color}50`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', fontSize:24 }}>
                  {s.icon}
                </div>
                <div style={{ fontSize:11, color: s.color, fontWeight:700, marginBottom:6, letterSpacing:.5 }}>{t('landingStep')} {i + 1}</div>
                <div style={{ fontSize:15, fontWeight:700, color: T.title, marginBottom:8 }}>{s.title}</div>
                <div style={{ fontSize:12, color: T.sub, lineHeight:1.7 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For whom */}
      <section style={{ padding:'72px 24px', maxWidth:900, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:44 }}>
          <div style={{ fontSize:12, color: T.orange, fontWeight:700, marginBottom:10, letterSpacing:1 }}>{t('landingForLabel')}</div>
          <h2 style={{ fontSize:'clamp(26px,5vw,38px)', fontWeight:800, margin:0 }}>{t('landingForTitle')}</h2>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:14 }}>
          {AUDIENCE.map((a, i) => (
            <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:14, background: T.card, border:`1px solid ${T.border}`, borderRadius:16, padding:'18px 16px' }}>
              <span style={{ fontSize:26, flexShrink:0, lineHeight:1 }}>{a.icon}</span>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color: T.title, marginBottom:5 }}>{a.title}</div>
                <div style={{ fontSize:12, color: T.sub, lineHeight:1.6 }}>{a.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ textAlign:'center', padding:'88px 24px', background:`linear-gradient(160deg, #0d1f10 0%, ${T.bg} 100%)`, borderTop:`1px solid ${T.border}` }}>
        <div style={{ fontSize:12, color: T.green, fontWeight:700, marginBottom:16, letterSpacing:1 }}>{t('landingCtaLabel')}</div>
        <h2 style={{ fontSize:'clamp(28px,6vw,50px)', fontWeight:800, margin:'0 0 18px', lineHeight:1.3 }}>{t('landingCtaTitle')}</h2>
        <p style={{ fontSize:16, color: T.sub, margin:'0 0 40px', maxWidth:380, marginInline:'auto', lineHeight:1.7 }}>{t('landingCtaSub')}</p>
        <Link href="/auth">
          <span style={{ background: T.green, color:'#000', padding:'17px 52px', borderRadius:34, fontSize:17, fontWeight:800, cursor:'pointer', display:'inline-block', boxShadow:`0 10px 36px ${T.green}40` }}>
            {t('landingCtaBtn')}
          </span>
        </Link>
      </section>

      {/* Footer */}
      <footer style={{ borderTop:`1px solid ${T.border}`, padding:'28px 24px', textAlign:'center' }}>
        <div style={{ fontSize:20, fontWeight:800, color: T.green, marginBottom:8 }}>مُراجِع</div>
        <div style={{ fontSize:12, color: T.sub }}>{t('landingFooterSub')}</div>
      </footer>
    </div>
  )
}
