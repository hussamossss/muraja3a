'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Page, Strength } from '@/lib/types'
import { todayStr, daysDiff, formatDate } from '@/lib/spaced-rep'

const C = {
  bg:    '#0B0D0C',
  navBg: '#131614',
  title: '#FFFFFF',
  sub:   '#8A8F8F',
  sep:   '#252B28',
  green: '#22C55E',
  orange:'#F97316',
  red:   '#EF4444',
  accent:'#38BDF8',
}

function dateLabel(dateStr: string): string {
  const d       = daysDiff(dateStr)
  const dayName = new Date(dateStr + 'T00:00:00').toLocaleDateString('ar-EG', { weekday: 'long' })
  if (d === 1) return `غداً · ${dayName}`
  if (d === 2) return `بعد يومين · ${dayName}`
  if (d <= 7)  return `${dayName} · بعد ${d} أيام`
  return formatDate(dateStr)
}

function strengthInfo(s: Strength | null): { label: string; color: string } {
  switch (s) {
    case 'strong': return { label:'قوي',   color: C.green  }
    case 'medium': return { label:'متوسط', color: C.orange }
    case 'weak':   return { label:'ضعيف',  color: C.red    }
    default:       return { label:'جديد',  color: C.sub    }
  }
}

export default function DashboardPage() {
  const router = useRouter()
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
    const t = setTimeout(() => setToast(false), 3000)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  async function loadPages() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/auth'); return }
    const { data, error } = await supabase
      .from('pages').select('*').eq('user_id', session.user.id)
    if (!error && data) setPages(data)
    setLoading(false)
  }

  const today    = todayStr()
  const overdue  = pages.filter(p => p.next_review_date < today)
                        .sort((a, b) => a.next_review_date.localeCompare(b.next_review_date))
  const dueToday = pages.filter(p => p.next_review_date === today)
                        .sort((a, b) => a.page_number - b.page_number)
  const total    = dueToday.length + overdue.length

  // Preview strip: nearest upcoming date + its count
  const upcoming  = pages.filter(p => p.next_review_date > today)
                         .sort((a, b) => a.next_review_date.localeCompare(b.next_review_date))
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

      {/* ── Header ── */}
      <div style={{ display:'flex', justifyContent:'flex-end', padding:'52px 20px 10px' }}>
        <button
          onClick={() => setMenuOpen(true)}
          style={{ background:'none', border:'none', color: C.title, fontSize:22, cursor:'pointer', lineHeight:1, padding:'4px 6px' }}>
          ☰
        </button>
      </div>

      {/* ── Title ── */}
      <div style={{ padding:'10px 20px 20px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:8 }}>
          <span style={{ width:4, height:36, background: C.green, borderRadius:2, flexShrink:0 }}/>
          <span style={{ fontSize:30, fontWeight:700, color: C.title }}>مراجعات اليوم</span>
        </div>
        <div style={{ fontSize:13, color: C.sub, paddingRight:16, marginBottom:14 }}>
          ما أجمل اليوم الذي نبدأ فيه بمراجعة كتاب الله 🌿
        </div>

        {/* Goal Gradient chips */}
        {total > 0 && (
          <div style={{ display:'flex', gap:8, paddingRight:16, marginBottom:12 }}>
            {dueToday.length > 0 && (
              <span style={{ background:`${C.green}18`, color: C.green, fontSize:12, fontWeight:700, padding:'5px 14px', borderRadius:20 }}>
                {dueToday.length} اليوم
              </span>
            )}
            {overdue.length > 0 && (
              <span style={{ background:`${C.orange}18`, color: C.orange, fontSize:12, fontWeight:700, padding:'5px 14px', borderRadius:20 }}>
                {overdue.length} متأخرة
              </span>
            )}
          </div>
        )}

        {/* Preview strip → /calendar */}
        {nextDate && (
          <button
            onClick={() => router.push('/calendar')}
            style={{
              display:'flex', alignItems:'center', justifyContent:'space-between',
              width:'100%', background:`${C.accent}0D`,
              border:`1px solid ${C.accent}30`, borderRadius:12,
              padding:'10px 16px', cursor:'pointer', fontFamily:'Amiri, serif',
            }}>
            <span style={{ fontSize:13, color: C.accent, fontWeight:600 }}>
              الجلسة القادمة: {dateLabel(nextDate)} · {nextCount} صفحات
            </span>
            <span style={{ color: C.accent, fontSize:16 }}>‹</span>
          </button>
        )}
      </div>

      {/* ── Body ── */}
      <div style={{ flex:1 }}>
        {total === 0 ? (
          <div style={{ textAlign:'center', padding:'60px 20px' }}>
            <div style={{ fontSize:56, marginBottom:16 }}>✅</div>
            <div style={{ fontSize:20, fontWeight:700, color: C.title, marginBottom:8 }}>أحسنت! انتهيت من كل شيء</div>
            <div style={{ fontSize:14, color: C.sub }}>لا توجد مراجعات متبقية اليوم</div>
          </div>
        ) : (
          <>
            {dueToday.map(p => <ReviewRow key={p.id} page={p} isOverdue={false} router={router}/>)}
            {overdue.length > 0 && (
              <>
                <div style={{ display:'flex', alignItems:'center', gap:7, padding:'20px 20px 12px', borderTop:`1px solid ${C.sep}` }}>
                  <span style={{ fontSize:15, fontWeight:700, color: C.orange }}>متأخرة</span>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.orange} strokeWidth="2">
                    <circle cx="12" cy="12" r="9"/><polyline points="12,7 12,12 15,15"/>
                  </svg>
                </div>
                {overdue.map(p => <ReviewRow key={p.id} page={p} isOverdue={true} router={router}/>)}
              </>
            )}
          </>
        )}
      </div>

      {/* ── FAB ── */}
      <div style={{
        position:'fixed', bottom:66, left:'50%', transform:'translateX(-50%)',
        width:'100%', maxWidth:768, display:'flex', flexDirection:'column', alignItems:'center',
        padding:'20px 0 14px',
        background:`linear-gradient(to top, ${C.bg} 55%, transparent)`, zIndex:40,
      }}>
        <button onClick={() => router.push('/add')} style={{
          width:62, height:62, borderRadius:'50%',
          background: C.green, border:'none', color:'#000',
          fontSize:30, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
          animation:'fabPulse 2.8s ease-in-out infinite', position:'relative', zIndex:1,
        }}>＋</button>
        <span style={{ fontSize:13, color: C.sub, marginTop:8 }}>إضافة صفحة</span>
        <style>{`
          @keyframes fabPulse { 0%,100%{box-shadow:0 4px 20px ${C.green}40} 50%{box-shadow:0 4px 32px ${C.green}70} }
          @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        `}</style>
      </div>

      {/* ── Bottom Nav ── */}
      <nav style={{
        position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)',
        width:'100%', maxWidth:768, display:'flex', alignItems:'center', justifyContent:'space-around',
        background: C.navBg, borderTop:`1px solid ${C.sep}`,
        borderRadius:'20px 20px 0 0', height:66, zIndex:40, padding:'0 10px',
      }}>
        <NavTab label="الرئيسية" active color={C.green}
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill={C.green} stroke={C.green} strokeWidth="1.8"><path d="M3 11.5L12 3l9 8.5V21h-6v-5H9v5H3z"/></svg>}
          onClick={() => router.push('/dashboard')}/>
        <NavTab label="التقدم" color={C.sub}
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.sub} strokeWidth="1.8"><polyline points="4,18 9,12 13,15 20,6"/><circle cx="20" cy="6" r="2" fill={C.sub} stroke="none"/></svg>}
          onClick={() => router.push('/stats')}/>
        <NavTab label="التقويم" color={C.sub}
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.sub} strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/></svg>}
          onClick={() => router.push('/calendar')}/>
        <NavTab label="الحساب" color={C.sub}
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.sub} strokeWidth="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></svg>}
          onClick={() => {}}/>
      </nav>

      {/* ── Hamburger Menu ── */}
      {menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:200, animation:'fadeIn .2s' }}
        />
      )}
      <div style={{
        position:'fixed', top:0, right:0,
        width:'min(280px, 82vw)', height:'100vh',
        background: C.navBg, borderLeft:`1px solid ${C.sep}`,
        zIndex:201,
        transform: menuOpen ? 'translateX(0)' : 'translateX(100%)',
        transition:'transform .28s cubic-bezier(0.4,0,0.2,1)',
        display:'flex', flexDirection:'column',
      }}>
        {/* Menu header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'52px 18px 18px', borderBottom:`1px solid ${C.sep}` }}>
          <span style={{ fontSize:16, fontWeight:700, color: C.title }}>القائمة</span>
          <button onClick={() => setMenuOpen(false)} style={{ background:'none', border:'none', color: C.sub, fontSize:22, cursor:'pointer', lineHeight:1, padding:4 }}>✕</button>
        </div>

        {/* Menu items */}
        <div style={{ flex:1, padding:'8px 0' }}>
          {[
            { icon:'📅', label:'الجلسات القادمة', desc:'عرض صفحاتك المجدولة', action:() => { setMenuOpen(false); router.push('/calendar') } },
            { icon:'📊', label:'الإحصائيات',      desc:'تقدمك ومراجعاتك',      action:() => { setMenuOpen(false); router.push('/stats')    } },
          ].map((item, i) => (
            <button key={i} onClick={item.action} style={{
              display:'flex', alignItems:'center', gap:14,
              width:'100%', padding:'16px 18px',
              background:'none', border:'none', borderBottom:`1px solid ${C.sep}`,
              cursor:'pointer', fontFamily:'Amiri, serif', textAlign:'right',
            }}>
              <span style={{ fontSize:22, flexShrink:0 }}>{item.icon}</span>
              <div>
                <div style={{ fontSize:15, fontWeight:600, color: C.title }}>{item.label}</div>
                <div style={{ fontSize:12, color: C.sub, marginTop:2 }}>{item.desc}</div>
              </div>
              <span style={{ color: C.sub, fontSize:18, marginRight:'auto' }}>‹</span>
            </button>
          ))}
        </div>

        {/* Logout */}
        <button
          onClick={async () => { setMenuOpen(false); await supabase.auth.signOut(); router.push('/auth') }}
          style={{ display:'flex', alignItems:'center', gap:12, padding:'16px 18px', background:'none', border:'none', borderTop:`1px solid ${C.sep}`, cursor:'pointer', fontFamily:'Amiri, serif', width:'100%' }}>
          <span style={{ fontSize:20 }}>↩️</span>
          <span style={{ fontSize:14, fontWeight:600, color: C.red }}>تسجيل الخروج</span>
        </button>
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position:'fixed', top:88, left:'50%', transform:'translateX(-50%)',
          zIndex:300, animation:'fadeIn .25s ease',
          background: C.navBg, border:`1px solid ${C.green}40`,
          borderRadius:12, padding:'10px 20px',
          textAlign:'center', minWidth:200,
          boxShadow:'0 4px 20px rgba(0,0,0,0.4)',
        }}>
          <div style={{ fontSize:14, fontWeight:700, color: C.green }}>✓ تمت إضافة الصفحة</div>
          <div style={{ fontSize:12, color: C.sub, marginTop:3 }}>ستظهر في جلساتك القادمة</div>
        </div>
      )}
    </div>
  )
}

function ReviewRow({ page, isOverdue, router }: {
  page: Page; isOverdue: boolean; router: ReturnType<typeof useRouter>
}) {
  const { label, color } = strengthInfo(page.last_strength)
  return (
    <div onClick={() => router.push(`/pages/${page.id}`)} style={{
      display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'16px 20px', borderBottom:`1px solid ${C.sep}`,
      borderRight: isOverdue ? `3px solid ${C.orange}` : '3px solid transparent',
      background: isOverdue ? `${C.orange}08` : 'transparent', cursor:'pointer',
    }}>
      <button onClick={e => { e.stopPropagation(); router.push(`/review/${page.id}`) }} style={{
        background: C.green, border:'none', color:'#000',
        padding:'11px 24px', borderRadius:24, cursor:'pointer',
        fontSize:14, fontWeight:800, fontFamily:'Amiri, serif', flexShrink:0,
      }}>مراجعة ›</button>
      <span style={{ fontSize:19, fontWeight:700, color: C.title }}>صفحة {page.page_number}</span>
      <span style={{ fontSize:11, fontWeight:700, color, background:`${color}1A`, padding:'5px 12px', borderRadius:20, minWidth:52, textAlign:'center', flexShrink:0 }}>
        {label}
      </span>
    </div>
  )
}

function NavTab({ label, icon, active, color, onClick }: {
  label: string; icon: React.ReactNode; active?: boolean; color: string; onClick: () => void
}) {
  return (
    <button onClick={onClick} style={{
      flex:1, display:'flex', flexDirection:'column', alignItems:'center',
      justifyContent:'center', background:'none', border:'none',
      cursor:'pointer', fontFamily:'Amiri, serif', color, gap:2,
    }}>
      {icon}
      <span style={{ fontSize:10, marginTop:2 }}>{label}</span>
    </button>
  )
}
