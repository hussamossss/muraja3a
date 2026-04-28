'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Page, ReviewLog } from '@/lib/types'
import { todayStr } from '@/lib/spaced-rep'
import BottomNav from '@/components/BottomNav'

export default function StatsPage() {
  const router = useRouter()
  const [pages, setPages]  = useState<Page[]>([])
  const [logs, setLogs]    = useState<ReviewLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/auth'); return }
    const [pRes, lRes] = await Promise.all([
      supabase.from('pages').select('*').eq('user_id', session.user.id),
      supabase.from('review_logs').select('*').eq('user_id', session.user.id),
    ])
    if (pRes.data) setPages(pRes.data)
    if (lRes.data) setLogs(lRes.data)
    setLoading(false)
  }

  const today       = todayStr()
  const total       = pages.length
  const totalRev    = logs.length
  const todayRev    = logs.filter(l => l.reviewed_at === today).length
  const strong      = logs.filter(l => l.strength === 'strong').length
  const medium      = logs.filter(l => l.strength === 'medium').length
  const weak        = logs.filter(l => l.strength === 'weak').length
  const maxS        = Math.max(strong, medium, weak, 1)
  const fresh       = pages.filter(p => p.current_interval_days <= 3).length
  const mid         = pages.filter(p => p.current_interval_days > 3 && p.current_interval_days <= 14).length
  const strongMem   = pages.filter(p => p.current_interval_days > 14).length

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

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'var(--bg)' }}>
      <div style={{ width:44, height:44, borderRadius:'50%', border:'3px solid var(--border)', borderTopColor:'var(--green)', animation:'spin .8s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const statCards = [
    { num: streak,    color: '#A855F7', label: 'أيام متواصلة', icon: '🔥' },
    { num: todayRev,  color: '#38BDF8', label: 'مراجعات اليوم', icon: '📅' },
    { num: fresh,     color: '#F97316', label: 'صفحات جديدة',  icon: '🆕' },
    { num: strongMem, color: '#22C55E', label: 'حفظ راسخ',      icon: '💎' },
  ]

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', background:'var(--bg)' }}>

      {/* Header */}
      <div style={{ background:'var(--bg)', padding:'48px 16px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12 }}>
        <button onClick={() => router.back()} style={backBtn}>‹</button>
        <span style={{ fontSize:18, fontWeight:700, color:'var(--cream)' }}>إحصائياتك</span>
      </div>

      <div style={{ flex:1, padding:'20px 16px 86px', overflowY:'auto' }}>

        {/* Hero — big numbers */}
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:20, padding:'24px 20px', marginBottom:16, borderTop:'3px solid #22C55E' }}>
          <div style={{ display:'flex', justifyContent:'space-around', textAlign:'center' }}>
            <div>
              <div style={{ fontSize:48, fontWeight:800, color:'#22C55E', lineHeight:1 }}>{total}</div>
              <div style={{ fontSize:12, color:'var(--sub)', marginTop:4 }}>صفحة محفوظة</div>
            </div>
            <div style={{ width:1, background:'var(--border)' }}/>
            <div>
              <div style={{ fontSize:48, fontWeight:800, color:'#38BDF8', lineHeight:1 }}>{totalRev}</div>
              <div style={{ fontSize:12, color:'var(--sub)', marginTop:4 }}>مراجعة منجزة</div>
            </div>
          </div>
        </div>

        {/* Stats grid — large numbers, colored top border (Fitts's Law: tap area) */}
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
        <div style={sectionLabel}>توزيع التقييمات</div>
        <div style={card}>
          {totalRev === 0
            ? <div style={{ fontSize:13, color:'var(--sub)', textAlign:'center' }}>لا توجد مراجعات بعد</div>
            : [
                { label:'قوي',   count:strong, color:'#22C55E' },
                { label:'متوسط', count:medium, color:'#F97316' },
                { label:'ضعيف',  count:weak,   color:'#EF4444' },
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

        {/* Memory stages */}
        <div style={sectionLabel}>مراحل الحفظ</div>
        <div style={{ ...card, marginBottom:24 }}>
          {total === 0
            ? <div style={{ fontSize:13, color:'var(--sub)', textAlign:'center' }}>لا توجد صفحات بعد</div>
            : [
                { label:'جديدة',  count:fresh,    color:'#22C55E' },
                { label:'نشطة',   count:mid,       color:'#38BDF8' },
                { label:'راسخة',  count:strongMem, color:'#A855F7' },
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
