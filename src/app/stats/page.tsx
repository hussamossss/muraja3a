'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Page, ReviewLog } from '@/lib/types'
import { todayStr } from '@/lib/spaced-rep'

export default function StatsPage() {
  const router = useRouter()
  const [pages, setPages] = useState<Page[]>([])
  const [logs, setLogs] = useState<ReviewLog[]>([])
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

  const today = todayStr()
  const total         = pages.length
  const totalReviews  = logs.length
  const todayReviews  = logs.filter(l => l.reviewed_at === today).length
  const strong        = logs.filter(l => l.strength === 'strong').length
  const medium        = logs.filter(l => l.strength === 'medium').length
  const weak          = logs.filter(l => l.strength === 'weak').length
  const maxS          = Math.max(strong, medium, weak, 1)
  const fresh         = pages.filter(p => p.current_interval_days <= 3).length
  const mid           = pages.filter(p => p.current_interval_days > 3 && p.current_interval_days <= 14).length
  const strongMem     = pages.filter(p => p.current_interval_days > 14).length

  // Streak
  let streak = 0
  const reviewDays = [...new Set(logs.map(l => l.reviewed_at))].sort().reverse()
  let checkDate = today
  for (const d of reviewDays) {
    if (d === checkDate) {
      streak++
      const x = new Date(checkDate)
      x.setDate(x.getDate() - 1)
      checkDate = x.toISOString().split('T')[0]
    } else if (d < checkDate) break
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid #2a3a2a', borderTopColor: 'var(--green)', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(160deg, #1a3a22 0%, #0f1c14 100%)', padding: '24px 16px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.back()} style={backBtn}>‹</button>
        <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--cream)' }}>إحصائياتك</span>
      </div>

      <div style={{ flex: 1, padding: '18px 16px 40px', overflowY: 'auto' }}>

        {/* Hero */}
        <div style={{ background: 'linear-gradient(135deg, #1a3a22, #0f2218)', border: '1px solid var(--green)', borderRadius: 20, padding: 24, marginBottom: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>📈</div>
          <div style={{ fontSize: 14, color: 'var(--sub)' }}>إجمالي التقدم</div>
          <div style={{ fontSize: 13, color: 'var(--cream)', marginTop: 6 }}>
            {total} صفحة محفوظة · {totalReviews} مراجعة منجزة
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          {[
            { num: streak,       color: 'var(--goldL)', label: '🔥 أيام متواصلة' },
            { num: todayReviews, color: '#7ec8a0',      label: 'مراجعات اليوم' },
            { num: fresh,        color: '#e07070',      label: '🆕 صفحات جديدة' },
            { num: strongMem,    color: 'var(--goldL)', label: '💎 حفظ راسخ' },
          ].map((s, i) => (
            <div key={i} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 30, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.num}</div>
              <div style={{ fontSize: 11, color: 'var(--sub)', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Strength Bars */}
        <div style={sectionTitle}>📊 توزيع التقييمات</div>
        <div style={barCard}>
          {totalReviews === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--sub)', textAlign: 'center' }}>لا توجد مراجعات بعد</div>
          ) : (
            [
              { label: '💪 قوي',   count: strong, color: '#4a9a6a' },
              { label: '🤔 متوسط', count: medium, color: '#d4a832' },
              { label: '😓 ضعيف',  count: weak,   color: '#c05858' },
            ].map((b, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 56, fontSize: 12, color: 'var(--cream)', textAlign: 'right', flexShrink: 0 }}>{b.label}</div>
                <div style={{ flex: 1, height: 10, background: 'rgba(255,255,255,0.05)', borderRadius: 5, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.round(b.count / maxS * 100)}%`, background: b.color, borderRadius: 5, transition: 'width 0.6s' }} />
                </div>
                <div style={{ width: 24, fontSize: 11, color: 'var(--sub)', textAlign: 'left', flexShrink: 0 }}>{b.count}</div>
              </div>
            ))
          )}
        </div>

        {/* Memory Stages */}
        <div style={sectionTitle}>📚 مراحل الحفظ</div>
        <div style={{ ...barCard, marginBottom: 24 }}>
          {total === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--sub)', textAlign: 'center' }}>لا توجد صفحات بعد</div>
          ) : (
            [
              { label: '🆕 جديدة',  count: fresh,     color: '#7ec8a0' },
              { label: '📖 نشطة',   count: mid,        color: '#d4a832' },
              { label: '💎 راسخة',  count: strongMem,  color: '#c9a84c' },
            ].map((b, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 64, fontSize: 11, color: 'var(--cream)', textAlign: 'right', flexShrink: 0 }}>{b.label}</div>
                <div style={{ flex: 1, height: 10, background: 'rgba(255,255,255,0.05)', borderRadius: 5, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.round(b.count / total * 100)}%`, background: b.color, borderRadius: 5, transition: 'width 0.6s' }} />
                </div>
                <div style={{ width: 24, fontSize: 11, color: 'var(--sub)', textAlign: 'left', flexShrink: 0 }}>{b.count}</div>
              </div>
            ))
          )}
        </div>

        {/* Sign out */}
        <button onClick={async () => { await supabase.auth.signOut(); router.push('/auth') }}
          style={{ background: 'rgba(192,88,88,0.1)', border: '1px solid rgba(192,88,88,0.3)', color: '#e07070', padding: 12, borderRadius: 14, cursor: 'pointer', fontSize: 14, width: '100%', fontFamily: 'Amiri, serif' }}>
          ↩️ تسجيل الخروج
        </button>
      </div>
    </div>
  )
}

const backBtn: React.CSSProperties = { width: 36, height: 36, borderRadius: 10, background: 'transparent', border: '1px solid var(--border)', color: 'var(--sub)', cursor: 'pointer', fontSize: 18 }
const sectionTitle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: 'var(--sub)', letterSpacing: 1, marginBottom: 10 }
const barCard: React.CSSProperties = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, marginBottom: 16 }
