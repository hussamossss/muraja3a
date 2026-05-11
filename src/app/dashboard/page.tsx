'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Page } from '@/lib/types'
import { todayStr, daysDiff } from '@/lib/spaced-rep'
import BottomNav from '@/components/BottomNav'
import { useI18n } from '@/lib/i18n'
import type { Lang } from '@/lib/translations'

const C = {
  bg:'#0B0D0C', navBg:'#131614', title:'#FFFFFF', sub:'#8A8F8F',
  sep:'#252B28', green:'#22C55E', orange:'#F97316', red:'#EF4444', accent:'#38BDF8',
}

function dateLabel(dateStr: string, lang: Lang): string {
  const d      = daysDiff(dateStr)
  const locale = lang === 'ar' ? 'ar-EG' : 'en-US'
  const date   = new Date(dateStr + 'T00:00:00')
  const dayName = date.toLocaleDateString(locale, { weekday:'long' })
  if (d === 1) return lang === 'ar' ? `غداً · ${dayName}` : `Tomorrow · ${dayName}`
  if (d === 2) return lang === 'ar' ? `بعد يومين · ${dayName}` : `In 2 days · ${dayName}`
  if (d <= 7)  return lang === 'ar' ? `${dayName} · بعد ${d} أيام` : `${dayName} · in ${d} days`
  return date.toLocaleDateString(locale, { day:'numeric', month:'long' })
}


export default function DashboardPage() {
  const router = useRouter()
  const { t, lang } = useI18n()
  const [pages, setPages]       = useState<Page[]>([])
  const [loading, setLoading]   = useState(true)
  const [toast, setToast]       = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => { loadPages() }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('added') === '1') {
      window.history.replaceState({}, '', '/dashboard')
      setToast(true)
    }
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(false), 3000)
    return () => clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  async function loadPages() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/auth'); return }
    const { data, error } = await supabase.from('pages').select('*').eq('user_id', session.user.id)
    if (!error && data) setPages(data)
    setLoading(false)
  }

  const today    = todayStr()
  const overdue  = pages.filter(p => p.next_review_date < today).sort((a, b) => a.next_review_date.localeCompare(b.next_review_date))
  const dueToday = pages.filter(p => p.next_review_date === today).sort((a, b) => a.page_number - b.page_number)
  const total    = dueToday.length + overdue.length

  const upcoming  = pages.filter(p => p.next_review_date > today).sort((a, b) => a.next_review_date.localeCompare(b.next_review_date))
  const nextDate  = upcoming[0]?.next_review_date
  const nextCount = nextDate ? upcoming.filter(p => p.next_review_date === nextDate).length : 0

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background: C.bg }}>
      <div style={{ width:44, height:44, borderRadius:'50%', border:`3px solid ${C.sep}`, borderTopColor: C.green, animation:'spin .8s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', background: C.bg, paddingBottom:180 }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'flex-end', padding:'52px 20px 10px' }}>
        <button onClick={() => setMenuOpen(true)} style={{ background:'none', border:'none', color: C.title, fontSize:22, cursor:'pointer', lineHeight:1, padding:'4px 6px' }}>
          ☰
        </button>
      </div>

      {/* Title */}
      <div style={{ padding:'10px 20px 20px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:8 }}>
          <span style={{ width:4, height:36, background: C.green, borderRadius:2, flexShrink:0 }}/>
          <span style={{ fontSize:30, fontWeight:700, color: C.title }}>{t('dashTitle')}</span>
        </div>
        <div style={{ fontSize:13, color: C.sub, paddingRight:16, marginBottom:14 }}>{t('dashSubtitle')}</div>

        {total > 0 && (
          <div style={{ display:'flex', gap:8, paddingRight:16, marginBottom:12 }}>
            {dueToday.length > 0 && (
              <span style={{ background:`${C.green}18`, color: C.green, fontSize:12, fontWeight:700, padding:'5px 14px', borderRadius:20 }}>
                {dueToday.length} {t('dashToday')}
              </span>
            )}
            {overdue.length > 0 && (
              <span style={{ background:`${C.orange}18`, color: C.orange, fontSize:12, fontWeight:700, padding:'5px 14px', borderRadius:20 }}>
                {overdue.length} {t('dashOverdue')}
              </span>
            )}
          </div>
        )}

        {nextDate && (
          <button
            onClick={() => router.push('/calendar')}
            style={{ display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%', background:`${C.accent}0D`, border:`1px solid ${C.accent}30`, borderRadius:12, padding:'10px 16px', cursor:'pointer', fontFamily:'Amiri, serif' }}>
            <span style={{ fontSize:13, color: C.accent, fontWeight:600 }}>
              {t('dashNextSession')} {dateLabel(nextDate, lang)} · {nextCount} {t('pagesWord')}
            </span>
            <span style={{ color: C.accent, fontSize:16 }}>‹</span>
          </button>
        )}
      </div>

      {/* Body */}
      <div style={{ flex:1 }}>
        {total === 0 ? (
          <div style={{ textAlign:'center', padding:'60px 20px' }}>
            <div style={{ fontSize:56, marginBottom:16 }}>✅</div>
            <div style={{ fontSize:20, fontWeight:700, color: C.title, marginBottom:8 }}>{t('dashAllDone')}</div>
            <div style={{ fontSize:14, color: C.sub }}>{t('dashAllDoneSub')}</div>
          </div>
        ) : (
          <>
            {dueToday.map(p => <ReviewRow key={p.id} page={p} isOverdue={false} router={router} today={today} t={t} pageLabel={t('pageWord')} reviewBtn={t('dashReviewBtn')} readBtn={t('dashReadBtn')} readTodayLabel={t('dashReadToday')}/>)}
            {overdue.length > 0 && (
              <>
                <div style={{ display:'flex', alignItems:'center', gap:7, padding:'20px 20px 12px', borderTop:`1px solid ${C.sep}` }}>
                  <span style={{ fontSize:15, fontWeight:700, color: C.orange }}>{t('dashOverdueLabel')}</span>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.orange} strokeWidth="2">
                    <circle cx="12" cy="12" r="9"/><polyline points="12,7 12,12 15,15"/>
                  </svg>
                </div>
                {overdue.map(p => <ReviewRow key={p.id} page={p} isOverdue={true} router={router} today={today} t={t} pageLabel={t('pageWord')} reviewBtn={t('dashReviewBtn')} readBtn={t('dashReadBtn')} readTodayLabel={t('dashReadToday')}/>)}
              </>
            )}
          </>
        )}
      </div>

      {/* FAB */}
      <div style={{ position:'fixed', bottom:66, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:768, display:'flex', flexDirection:'column', alignItems:'center', padding:'20px 0 14px', background:`linear-gradient(to top, ${C.bg} 55%, transparent)`, zIndex:40 }}>
        <button onClick={() => router.push('/add')} style={{ width:62, height:62, borderRadius:'50%', background: C.green, border:'none', color:'#000', fontSize:30, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', animation:'fabPulse 2.8s ease-in-out infinite', position:'relative', zIndex:1 }}>＋</button>
        <span style={{ fontSize:13, color: C.sub, marginTop:8 }}>{t('dashAddPage')}</span>
        <style>{`
          @keyframes fabPulse { 0%,100%{box-shadow:0 4px 20px ${C.green}40} 50%{box-shadow:0 4px 32px ${C.green}70} }
          @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        `}</style>
      </div>

      <BottomNav/>

      {/* Hamburger overlay */}
      {menuOpen && (
        <div onClick={() => setMenuOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:200, animation:'fadeIn .2s' }} />
      )}
      <div style={{ position:'fixed', top:0, right:0, width:'min(280px, 82vw)', height:'100vh', background: C.navBg, borderLeft:`1px solid ${C.sep}`, zIndex:201, transform: menuOpen ? 'translateX(0)' : 'translateX(100%)', transition:'transform .28s cubic-bezier(0.4,0,0.2,1)', display:'flex', flexDirection:'column' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'52px 18px 18px', borderBottom:`1px solid ${C.sep}` }}>
          <span style={{ fontSize:16, fontWeight:700, color: C.title }}>{t('dashMenu')}</span>
          <button onClick={() => setMenuOpen(false)} style={{ background:'none', border:'none', color: C.sub, fontSize:22, cursor:'pointer', lineHeight:1, padding:4 }}>✕</button>
        </div>
        <div style={{ flex:1, padding:'8px 0' }}>
          {[
            { icon:'📅', label: t('dashMenuCalendar'), desc: t('dashMenuCalendarDesc'), action:() => { setMenuOpen(false); router.push('/calendar') } },
            { icon:'👤', label: t('dashMenuAccount'),  desc: t('dashMenuAccountDesc'),  action:() => { setMenuOpen(false); router.push('/account')  } },
            { icon:'❤️', label: t('dashMenuSupport'),  desc: t('dashMenuSupportDesc'),  action:() => { setMenuOpen(false); router.push('/support')  } },
          ].map((item, i) => (
            <button key={i} onClick={item.action} style={{ display:'flex', alignItems:'center', gap:14, width:'100%', padding:'16px 18px', background:'none', border:'none', borderBottom:`1px solid ${C.sep}`, cursor:'pointer', fontFamily:'Amiri, serif', textAlign:'right' }}>
              <span style={{ fontSize:22, flexShrink:0 }}>{item.icon}</span>
              <div>
                <div style={{ fontSize:15, fontWeight:600, color: C.title }}>{item.label}</div>
                <div style={{ fontSize:12, color: C.sub, marginTop:2 }}>{item.desc}</div>
              </div>
              <span style={{ color: C.sub, fontSize:18, marginRight:'auto' }}>‹</span>
            </button>
          ))}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position:'fixed', top:88, left:'50%', transform:'translateX(-50%)', zIndex:300, animation:'fadeIn .25s ease', background: C.navBg, border:`1px solid ${C.green}40`, borderRadius:12, padding:'10px 20px', textAlign:'center', minWidth:200, boxShadow:'0 4px 20px rgba(0,0,0,0.4)' }}>
          <div style={{ fontSize:14, fontWeight:700, color: C.green }}>{t('dashToastTitle')}</div>
          <div style={{ fontSize:12, color: C.sub, marginTop:3 }}>{t('dashToastSub')}</div>
        </div>
      )}
    </div>
  )
}

const MISTAKE_LABEL_KEY: Record<string, any> = {
  perfect:'strPerfect', minor:'strMinor', impactful:'strImpactful',
  few:'strFew', many:'strMany', lapse:'strLapse',
  strong:'strStrong', medium:'strMedium', weak:'strWeak',
}
const MISTAKE_COLOR: Record<string, string> = {
  perfect:'#22C55E', minor:'#84CC16', impactful:'#F97316',
  few:'#FB923C', many:'#EF4444', lapse:'#7C3AED',
  strong: C.green, medium: C.orange, weak: C.red,
}

function ReviewRow({ page, isOverdue, router, today, t, pageLabel, reviewBtn, readBtn, readTodayLabel }: {
  page: Page; isOverdue: boolean; router: ReturnType<typeof useRouter>; today: string
  t: (k: any) => string; pageLabel: string; reviewBtn: string; readBtn: string; readTodayLabel: string
}) {
  const readToday = page.last_read_at === today
  const key       = page.last_mistake_level ?? page.last_strength ?? ''
  const color     = key ? (MISTAKE_COLOR[key] ?? C.sub) : C.sub
  const label     = key ? (MISTAKE_LABEL_KEY[key] ? t(MISTAKE_LABEL_KEY[key]) : key) : t('strNew' as any) || 'جديد'

  return (
    <div onClick={() => router.push(`/pages/${page.id}`)} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:`1px solid ${C.sep}`, borderRight: isOverdue ? `3px solid ${C.orange}` : '3px solid transparent', background: isOverdue ? `${C.orange}08` : 'transparent', cursor:'pointer', gap:10 }}>
      <div style={{ display:'flex', gap:6, flexShrink:0 }}>
        <button onClick={e => { e.stopPropagation(); router.push(`/review/${page.id}`) }} style={{ background: C.green, border:'none', color:'#000', padding:'11px 18px', borderRadius:24, cursor:'pointer', fontSize:14, fontWeight:800, fontFamily:'Amiri, serif' }}>
          {reviewBtn}
        </button>
        <button
          onClick={e => {
            e.stopPropagation()
            if (readToday) return
            router.push(`/review/${page.id}?mode=reading`)
          }}
          disabled={readToday}
          style={{ background: readToday ? C.sep : C.accent, border:'none', color: readToday ? C.sub : '#000', padding:'11px 18px', borderRadius:24, cursor: readToday ? 'not-allowed' : 'pointer', fontSize:14, fontWeight:800, fontFamily:'Amiri, serif' }}>
          {readToday ? readTodayLabel : readBtn}
        </button>
      </div>
      <span style={{ fontSize:19, fontWeight:700, color: C.title }}>{pageLabel} {page.page_number}</span>
      <span style={{ fontSize:11, fontWeight:700, color, background:`${color}1A`, padding:'5px 12px', borderRadius:20, minWidth:52, textAlign:'center', flexShrink:0 }}>
        {label}
      </span>
    </div>
  )
}
