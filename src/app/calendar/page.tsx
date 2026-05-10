'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Page } from '@/lib/types'
import { todayStr, daysDiff } from '@/lib/spaced-rep'
import BottomNav from '@/components/BottomNav'
import { useI18n } from '@/lib/i18n'
import type { Lang } from '@/lib/translations'

const C = {
  bg:'#0B0D0C', card:'#161A18', border:'#252B28', title:'#FFFFFF',
  sub:'#8A8F8F', green:'#22C55E', orange:'#F97316', red:'#EF4444', accent:'#38BDF8',
}

function dateLabel(dateStr: string, lang: Lang): string {
  const d      = daysDiff(dateStr)
  const locale = lang === 'ar' ? 'ar-EG' : 'en-US'
  const date   = new Date(dateStr + 'T00:00:00')
  const day    = date.toLocaleDateString(locale, { weekday:'long' })
  const md     = date.toLocaleDateString(locale, { day:'numeric', month:'long' })
  if (d === 1) return lang === 'ar' ? `غداً - ${day} ${md}` : `Tomorrow - ${day} ${md}`
  if (d === 2) return lang === 'ar' ? `بعد يومين - ${day} ${md}` : `In 2 days - ${day} ${md}`
  if (d <= 7)  return lang === 'ar' ? `${day} ${md} - بعد ${d} أيام` : `${day} ${md} - in ${d} days`
  return `${day} ${md}`
}

const SC: Record<string, string> = {
  strong:'#22C55E', medium:'#F97316', weak:'#EF4444',
  perfect:'#22C55E', minor:'#84CC16', impactful:'#F97316',
  few:'#FB923C', many:'#EF4444', lapse:'#7C3AED',
}

export default function CalendarPage() {
  const router = useRouter()
  const { t, lang } = useI18n()
  const [pages, setPages]       = useState<Page[]>([])
  const [loading, setLoading]   = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [swipedId, setSwipedId] = useState<string | null>(null)

  const SL_KEY: Record<string, any> = {
    strong:'strStrong', medium:'strMedium', weak:'strWeak',
    perfect:'strPerfect', minor:'strMinor', impactful:'strImpactful',
    few:'strFew', many:'strMany', lapse:'strLapse',
  }
  const getLabel = (key: string) => SL_KEY[key] ? t(SL_KEY[key]) : key

  useEffect(() => { loadPages() }, [])

  async function loadPages() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/auth'); return }
    const { data, error } = await supabase.from('pages').select('*').eq('user_id', session.user.id)
    if (!error && data) {
      const today    = todayStr()
      const upcoming = data
        .filter(p => p.next_review_date > today)
        .sort((a, b) => a.next_review_date.localeCompare(b.next_review_date))
      setPages(upcoming)
      setExpanded(new Set(upcoming.map(p => p.next_review_date)))
    }
    setLoading(false)
  }

  async function deletePage(id: string) {
    setPages(prev => prev.filter(p => p.id !== id))
    setSwipedId(null)
    await supabase.from('pages').delete().eq('id', id)
  }

  const grouped = pages.reduce((acc, p) => {
    if (!acc[p.next_review_date]) acc[p.next_review_date] = []
    acc[p.next_review_date].push(p)
    return acc
  }, {} as Record<string, Page[]>)

  const groups = Object.entries(grouped)

  function toggle(date: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(date) ? next.delete(date) : next.add(date)
      return next
    })
  }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background: C.bg }}>
      <div style={{ width:44, height:44, borderRadius:'50%', border:`3px solid ${C.border}`, borderTopColor: C.green, animation:'spin .8s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background: C.bg, paddingBottom:86 }}>
      <div style={{ background: C.bg, padding:'48px 16px 16px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:12 }}>
        <button onClick={() => router.back()} style={backBtn}>‹</button>
        <span style={{ fontSize:18, fontWeight:700, color: C.title }}>{t('calTitle')}</span>
        {pages.length > 0 && (
          <span style={{ marginRight:'auto', fontSize:12, color: C.accent, background:`${C.accent}15`, padding:'4px 10px', borderRadius:20, fontWeight:600 }}>
            {pages.length} {t('pagesWord')}
          </span>
        )}
      </div>

      <div>
        {groups.length === 0 ? (
          <div style={{ textAlign:'center', padding:'80px 24px' }}>
            <div style={{ fontSize:52, marginBottom:16 }}>📿</div>
            <div style={{ fontSize:18, fontWeight:700, color: C.title, marginBottom:8 }}>{t('calEmpty')}</div>
            <div style={{ fontSize:13, color: C.sub }}>{t('calEmptySub')}</div>
          </div>
        ) : (
          groups.map(([date, groupPages]) => {
            const open = expanded.has(date)
            return (
              <div key={date}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px', background: C.card, borderBottom:`1px solid ${C.border}`, borderTop:`1px solid ${C.border}`, marginTop:8 }}>
                  <div>
                    <div style={{ fontSize:15, fontWeight:700, color: C.title }}>{dateLabel(date, lang)}</div>
                    <div style={{ fontSize:11, color: C.sub, marginTop:2 }}>{groupPages.length} {t('pagesWord')}</div>
                  </div>
                  <button
                    onClick={() => toggle(date)}
                    style={{ background:'none', border:`1px solid ${C.border}`, color: C.accent, fontSize:12, fontWeight:600, padding:'6px 14px', borderRadius:20, cursor:'pointer', fontFamily:'Amiri, serif', flexShrink:0 }}>
                    {open ? t('calHide') : t('calShow')}
                  </button>
                </div>
                {open && groupPages.map(p => (
                  <PageRow
                    key={p.id}
                    page={p}
                    swiped={swipedId === p.id}
                    onSwipe={() => setSwipedId(p.id)}
                    onCancel={() => setSwipedId(null)}
                    onDelete={() => deletePage(p.id)}
                    onOpen={() => router.push(`/pages/${p.id}`)}
                    getLabel={getLabel}
                    deleteLabel={t('calDeleteBtn')}
                    newLabel={t('calNew')}
                    pageLabel={t('pageWord')}
                  />
                ))}
              </div>
            )
          })
        )}
      </div>
      <BottomNav/>
    </div>
  )
}

const DELETE_W = 76

function PageRow({ page, swiped, onSwipe, onCancel, onDelete, onOpen, getLabel, deleteLabel, newLabel, pageLabel }: {
  page: Page; swiped: boolean
  onSwipe: () => void; onCancel: () => void; onDelete: () => void; onOpen: () => void
  getLabel: (k: string) => string; deleteLabel: string; newLabel: string; pageLabel: string
}) {
  const startX = useRef<number | null>(null)
  const key    = page.last_mistake_level ?? page.last_strength
  const color  = key ? (SC[key] ?? C.sub) : C.sub
  const label  = key ? getLabel(key) : null

  return (
    <div style={{ position:'relative', overflow:'hidden', borderBottom:`1px solid ${C.border}` }}>
      <div style={{ position:'absolute', right:0, top:0, bottom:0, width: DELETE_W, background: C.red, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <button onClick={e => { e.stopPropagation(); onDelete() }} style={{ background:'none', border:'none', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'Amiri, serif' }}>
          {deleteLabel}
        </button>
      </div>
      <div
        onTouchStart={e  => { startX.current = e.touches[0].clientX }}
        onTouchEnd={e => {
          if (startX.current === null) return
          const dx = e.changedTouches[0].clientX - startX.current
          if (dx < -60) onSwipe()
          else if (dx > 20) onCancel()
          startX.current = null
        }}
        onClick={() => swiped ? onCancel() : onOpen()}
        style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 16px', background: C.bg, transform: swiped ? `translateX(-${DELETE_W}px)` : 'translateX(0)', transition:'transform .22s ease', cursor:'pointer' }}>
        <span style={{ fontSize:16, fontWeight:600, color: C.title }}>{pageLabel} {page.page_number}</span>
        {label ? (
          <span style={{ fontSize:11, fontWeight:700, color, background:`${color}1A`, padding:'4px 12px', borderRadius:20 }}>{label}</span>
        ) : (
          <span style={{ fontSize:11, color: C.sub }}>{newLabel}</span>
        )}
      </div>
    </div>
  )
}

const backBtn: React.CSSProperties = {
  width:36, height:36, borderRadius:10,
  background:'transparent', border:`1px solid ${C.border}`,
  color: C.sub, cursor:'pointer', fontSize:20,
}
