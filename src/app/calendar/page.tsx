'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Page } from '@/lib/types'
import { todayStr, daysDiff } from '@/lib/spaced-rep'
import { useT, useLang } from '@/lib/i18n'
import BottomNav from '@/components/BottomNav'

const C = {
  bg:     '#0B0D0C',
  card:   '#161A18',
  border: '#252B28',
  title:  '#FFFFFF',
  sub:    '#8A8F8F',
  green:  '#22C55E',
  orange: '#F97316',
  red:    '#EF4444',
  accent: '#38BDF8',
}

const MISTAKE_COLOR: Record<string, string> = {
  perfect:'#22C55E', minor:'#84CC16', impactful:'#F97316',
  few:'#FB923C', many:'#EF4444', lapse:'#7C3AED',
  strong: C.green, medium: C.orange, weak: C.red,
}

export default function CalendarPage() {
  const router = useRouter()
  const t = useT()
  const { lang } = useLang()
  const [pages, setPages]       = useState<Page[]>([])
  const [loading, setLoading]   = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [swipedId, setSwipedId] = useState<string | null>(null)

  useEffect(() => { loadPages() }, [])

  function dateLabel(dateStr: string): string {
    const d    = daysDiff(dateStr)
    const date = new Date(dateStr + 'T00:00:00')
    const locale = t.dates.locale
    const day  = date.toLocaleDateString(locale, { weekday: 'long' })
    const md   = date.toLocaleDateString(locale, { day: 'numeric', month: 'long' })
    if (d === 1) return `${t.dates.tomorrow} - ${day} ${md}`
    if (d === 2) return `${t.dates.inTwoDays} - ${day} ${md}`
    if (d <= 7)  return `${day} ${md} - ${t.dates.inDays(d)}`
    return `${day} ${md}`
  }

  function getStrengthInfo(page: Page): { label: string; color: string } | null {
    const key = page.last_mistake_level ?? page.last_strength
    if (!key) return null
    const ml = (t.mistakeLevels as Record<string, { label: string }>)[key]
    const label = ml?.label ?? key
    const color = MISTAKE_COLOR[key] ?? C.sub
    return { label, color }
  }

  async function loadPages() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/auth'); return }
    const { data, error } = await supabase
      .from('pages').select('*').eq('user_id', session.user.id)
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

  const pageLabel = (n: number) => lang === 'ar' ? `صفحة ${n}` : `Page ${n}`

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background: C.bg }}>
      <div style={{ width:44, height:44, borderRadius:'50%', border:`3px solid ${C.border}`, borderTopColor: C.green, animation:'spin .8s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background: C.bg, paddingBottom:86 }}>

      {/* Header */}
      <div style={{ background: C.bg, padding:'48px 16px 16px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:12 }}>
        <button onClick={() => router.back()} style={backBtn}>‹</button>
        <span style={{ fontSize:18, fontWeight:700, color: C.title }}>{t.calendar.title}</span>
        {pages.length > 0 && (
          <span style={{ marginInlineStart:'auto', fontSize:12, color: C.accent, background:`${C.accent}15`, padding:'4px 10px', borderRadius:20, fontWeight:600 }}>
            {t.calendar.pageCount(pages.length)}
          </span>
        )}
      </div>

      {/* Content */}
      <div>
        {groups.length === 0 ? (
          <div style={{ textAlign:'center', padding:'80px 24px' }}>
            <div style={{ fontSize:52, marginBottom:16 }}>📿</div>
            <div style={{ fontSize:18, fontWeight:700, color: C.title, marginBottom:8 }}>{t.calendar.noSessions}</div>
            <div style={{ fontSize:13, color: C.sub }}>{t.calendar.noSessionsHint}</div>
          </div>
        ) : (
          groups.map(([date, groupPages]) => {
            const open = expanded.has(date)
            return (
              <div key={date}>
                <div style={{
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                  padding:'14px 16px',
                  background: C.card,
                  borderBottom:`1px solid ${C.border}`,
                  borderTop:`1px solid ${C.border}`,
                  marginTop:8,
                }}>
                  <div>
                    <div style={{ fontSize:15, fontWeight:700, color: C.title }}>
                      {dateLabel(date)}
                    </div>
                    <div style={{ fontSize:11, color: C.sub, marginTop:2 }}>
                      {t.calendar.pageCount(groupPages.length)}
                    </div>
                  </div>
                  <button
                    onClick={() => toggle(date)}
                    style={{
                      background:'none', border:`1px solid ${C.border}`,
                      color: C.accent, fontSize:12, fontWeight:600,
                      padding:'6px 14px', borderRadius:20, cursor:'pointer',
                      fontFamily:'Amiri, serif', flexShrink:0,
                    }}>
                    {open ? t.calendar.hidePages : t.calendar.showPages}
                  </button>
                </div>

                {open && groupPages.map(p => (
                  <PageRow
                    key={p.id}
                    page={p}
                    pageLabel={pageLabel(p.page_number)}
                    deleteLabel={t.calendar.deleteLabel}
                    newBadge={t.calendar.newBadge}
                    strengthInfo={getStrengthInfo(p)}
                    swiped={swipedId === p.id}
                    onSwipe={() => setSwipedId(p.id)}
                    onCancel={() => setSwipedId(null)}
                    onDelete={() => deletePage(p.id)}
                    onOpen={() => router.push(`/pages/${p.id}`)}
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

// ── PageRow with swipe-to-delete ──────────────────────────────────
const DELETE_W = 76

function PageRow({ page, pageLabel, deleteLabel, newBadge, strengthInfo, swiped, onSwipe, onCancel, onDelete, onOpen }: {
  page: Page
  pageLabel: string
  deleteLabel: string
  newBadge: string
  strengthInfo: { label: string; color: string } | null
  swiped: boolean
  onSwipe: () => void
  onCancel: () => void
  onDelete: () => void
  onOpen: () => void
}) {
  const startX = useRef<number | null>(null)

  return (
    <div style={{ position:'relative', overflow:'hidden', borderBottom:`1px solid ${C.border}` }}>

      {/* Delete zone */}
      <div style={{
        position:'absolute', right:0, top:0, bottom:0, width: DELETE_W,
        background: C.red,
        display:'flex', alignItems:'center', justifyContent:'center',
      }}>
        <button
          onClick={e => { e.stopPropagation(); onDelete() }}
          style={{ background:'none', border:'none', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'Amiri, serif' }}>
          {deleteLabel}
        </button>
      </div>

      {/* Row content */}
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
        style={{
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'16px 16px',
          background: C.bg,
          transform: swiped ? `translateX(-${DELETE_W}px)` : 'translateX(0)',
          transition:'transform .22s ease',
          cursor:'pointer',
        }}>
        <span style={{ fontSize:16, fontWeight:600, color: C.title }}>
          {pageLabel}
        </span>
        {strengthInfo ? (
          <span style={{
            fontSize:11, fontWeight:700, color: strengthInfo.color,
            background:`${strengthInfo.color}1A`,
            padding:'4px 12px', borderRadius:20,
          }}>{strengthInfo.label}</span>
        ) : (
          <span style={{ fontSize:11, color: C.sub }}>{newBadge}</span>
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
