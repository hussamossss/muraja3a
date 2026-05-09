'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Page, ReviewLog, WordMistake } from '@/lib/types'
import { todayStr } from '@/lib/spaced-rep'
import { useT } from '@/lib/i18n'
import BottomNav from '@/components/BottomNav'

export default function StatsPage() {
  const router = useRouter()
  const t = useT()
  const [pages,     setPages]     = useState<Page[]>([])
  const [logs,      setLogs]      = useState<ReviewLog[]>([])
  const [mistakes,  setMistakes]  = useState<WordMistake[]>([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/auth'); return }
    const [pRes, lRes, mRes] = await Promise.all([
      supabase.from('pages').select('*').eq('user_id', session.user.id),
      supabase.from('review_logs').select('*').eq('user_id', session.user.id),
      supabase.from('word_mistakes').select('word_text, normalized_word, page_number')
        .eq('user_id', session.user.id),
    ])
    if (pRes.data) setPages(pRes.data)
    if (lRes.data) setLogs(lRes.data)
    if (mRes.data) setMistakes(mRes.data as WordMistake[])
    setLoading(false)
  }

  const today       = todayStr()
  const total       = pages.length
  const totalRev    = logs.length
  const todayRev    = logs.filter(l => l.reviewed_at === today).length
  const getCount = (levels: string[]) =>
    logs.filter(l => levels.includes(l.mistake_level ?? l.strength)).length
  const excellent = getCount(['perfect', 'minor', 'strong'])
  const partial   = getCount(['impactful', 'few', 'medium'])
  const poor      = getCount(['many', 'lapse', 'weak'])
  const maxS      = Math.max(excellent, partial, poor, 1)

  const fresh     = pages.filter(p => (p.review_stage ?? 'learning') === 'learning' || p.current_interval_days <= 3).length
  const mid       = pages.filter(p => p.review_stage === 'review' || (!p.review_stage && p.current_interval_days > 3 && p.current_interval_days <= 14)).length
  const strongMem = pages.filter(p => p.review_stage === 'mature' || p.review_stage === 'fragile' || (!p.review_stage && p.current_interval_days > 14)).length

  let streak = 0
  const days = [...new Set(logs.map(l => l.reviewed_at))].sort().reverse()
  let check = today
  for (const d of days) {
    if (d === check) {
      streak++
      const x = new Date(check); x.setDate(x.getDate() - 1)
      check = x.toISOString().split('T')[0]
    } else if (d < check) break
  }

  const wordMap = new Map<string, { text: string; count: number; pages: Set<number> }>()
  mistakes.forEach(m => {
    const key = m.normalized_word
    if (!wordMap.has(key)) wordMap.set(key, { text: m.word_text, count: 0, pages: new Set() })
    const e = wordMap.get(key)!
    e.count++
    e.pages.add(m.page_number)
  })
  const topWords = [...wordMap.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'var(--bg)' }}>
      <div style={{ width:44, height:44, borderRadius:'50%', border:'3px solid var(--border)', borderTopColor:'var(--green)', animation:'spin .8s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const statCards = [
    { num: streak,    color: '#A855F7', label: t.stats.streakDays,   icon: '🔥' },
    { num: todayRev,  color: '#38BDF8', label: t.stats.todayReviews, icon: '📅' },
    { num: fresh,     color: '#F97316', label: t.stats.newPages,     icon: '🆕' },
    { num: strongMem, color: '#22C55E', label: t.stats.strongMemory, icon: '💎' },
  ]

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', background:'var(--bg)' }}>

      {/* Header */}
      <div style={{ background:'var(--bg)', padding:'48px 16px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12 }}>
        <button onClick={() => router.back()} style={backBtn}>‹</button>
        <span style={{ fontSize:18, fontWeight:700, color:'var(--cream)' }}>{t.stats.title}</span>
      </div>

      <div style={{ flex:1, padding:'20px 16px 86px', overflowY:'auto' }}>

        {/* Hero */}
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:20, padding:'24px 20px', marginBottom:16, borderTop:'3px solid #22C55E' }}>
          <div style={{ display:'flex', justifyContent:'space-around', textAlign:'center' }}>
            <div>
              <div style={{ fontSize:48, fontWeight:800, color:'#22C55E', lineHeight:1 }}>{total}</div>
              <div style={{ fontSize:12, color:'var(--sub)', marginTop:4 }}>{t.stats.pagesMemorized}</div>
            </div>
            <div style={{ width:1, background:'var(--border)' }}/>
            <div>
              <div style={{ fontSize:48, fontWeight:800, color:'#38BDF8', lineHeight:1 }}>{totalRev}</div>
              <div style={{ fontSize:12, color:'var(--sub)', marginTop:4 }}>{t.stats.reviewsDone}</div>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:20 }}>
          {statCards.map((s, i) => (
            <div key={i} style={{
              background:'var(--card)', border:'1px solid var(--border)',
              borderTop:`3px solid ${s.color}`,
              borderRadius:14, padding:'18px 14px', textAlign:'center',
            }}>
              <div style={{ fontSize:44, fontWeight:800, color: s.color, lineHeight:1 }}>{s.num}</div>
              <div style={{ fontSize:11, color:'var(--sub)', marginTop:6 }}>{s.icon} {s.label}</div>
            </div>
          ))}
        </div>

        {/* Strength bars */}
        <div style={sectionLabel}>{t.stats.ratingsDist}</div>
        <div style={card}>
          {totalRev === 0
            ? <div style={{ fontSize:13, color:'var(--sub)', textAlign:'center' }}>{t.stats.noReviews}</div>
            : [
                { label: t.stats.excellent, count:excellent, color:'#22C55E' },
                { label: t.stats.partial,   count:partial,   color:'#F97316' },
                { label: t.stats.difficult, count:poor,      color:'#EF4444' },
              ].map((b, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:10, marginBottom: i < 2 ? 14 : 0 }}>
                  <span style={{
                    fontSize:11, fontWeight:700, color: b.color,
                    background:`${b.color}1A`, padding:'3px 10px',
                    borderRadius:20, minWidth:52, textAlign:'center', flexShrink:0,
                  }}>{b.label}</span>
                  <div style={{ flex:1, height:12, background:'rgba(255,255,255,0.06)', borderRadius:6, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${Math.round(b.count/maxS*100)}%`, background: b.color, borderRadius:6, transition:'width .6s' }}/>
                  </div>
                  <span style={{ width:28, fontSize:12, fontWeight:700, color:'var(--cream)', textAlign:'left', flexShrink:0 }}>{b.count}</span>
                </div>
              ))
          }
        </div>

        {/* Top mistake words */}
        {topWords.length > 0 && (
          <>
            <div style={sectionLabel}>{t.stats.topMistakes}</div>
            <div style={{ ...card, marginBottom:20 }}>
              {topWords.map((w, i) => (
                <div key={w.text + i} style={{
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                  paddingBottom: i < topWords.length - 1 ? 14 : 0,
                  marginBottom:  i < topWords.length - 1 ? 14 : 0,
                  borderBottom:  i < topWords.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontFamily:'"Amiri Quran", serif', fontSize:20, color:'#EF4444', minWidth:60 }}>{w.text}</span>
                    <span style={{ fontSize:11, color:'var(--sub)' }}>
                      {[...w.pages].sort((a,b)=>a-b).map(p => t.stats.pageShort(p)).join('، ')}
                    </span>
                  </div>
                  <span style={{
                    fontSize:13, fontWeight:700, color:'#EF4444',
                    background:'rgba(239,68,68,0.1)',
                    padding:'3px 10px', borderRadius:20, flexShrink:0,
                  }}>
                    {w.count}×
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Memory stages */}
        <div style={sectionLabel}>{t.stats.memoryStages}</div>
        <div style={{ ...card, marginBottom:24 }}>
          {total === 0
            ? <div style={{ fontSize:13, color:'var(--sub)', textAlign:'center' }}>{t.stats.noPages}</div>
            : [
                { label: t.stats.stageNew,    count:fresh,    color:'#22C55E' },
                { label: t.stats.stageActive, count:mid,       color:'#38BDF8' },
                { label: t.stats.stageStrong, count:strongMem, color:'#A855F7' },
              ].map((b, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:10, marginBottom: i < 2 ? 14 : 0 }}>
                  <span style={{
                    fontSize:11, fontWeight:700, color: b.color,
                    background:`${b.color}1A`, padding:'3px 10px',
                    borderRadius:20, minWidth:52, textAlign:'center', flexShrink:0,
                  }}>{b.label}</span>
                  <div style={{ flex:1, height:12, background:'rgba(255,255,255,0.06)', borderRadius:6, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${Math.round(b.count/total*100)}%`, background: b.color, borderRadius:6, transition:'width .6s' }}/>
                  </div>
                  <span style={{ width:28, fontSize:12, fontWeight:700, color:'var(--cream)', textAlign:'left', flexShrink:0 }}>{b.count}</span>
                </div>
              ))
          }
        </div>

      </div>
      <BottomNav/>
    </div>
  )
}

const backBtn: React.CSSProperties  = { width:36, height:36, borderRadius:10, background:'transparent', border:'1px solid var(--border)', color:'var(--sub)', cursor:'pointer', fontSize:20 }
const sectionLabel: React.CSSProperties = { fontSize:12, fontWeight:600, color:'var(--sub)', letterSpacing:.5, marginBottom:10, paddingRight:2 }
const card: React.CSSProperties     = { background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:'18px 16px', marginBottom:16 }
