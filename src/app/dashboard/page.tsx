'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Page } from '@/lib/types'
import { todayStr, formatDate, daysDiff } from '@/lib/spaced-rep'

export default function DashboardPage() {
  const router = useRouter()
  const [pages, setPages] = useState<Page[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPages()
  }, [])

  async function loadPages() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/auth'); return }
    const { data, error } = await supabase
      .from('pages')
      .select('*')
      .eq('user_id', session.user.id)
    if (!error && data) setPages(data)
    setLoading(false)
  }

  const today = todayStr()
  const overdue  = pages.filter(p => p.next_review_date < today).sort((a, b) => a.next_review_date.localeCompare(b.next_review_date))
  const dueToday = pages.filter(p => p.next_review_date === today).sort((a, b) => a.page_number - b.page_number)
  const upcoming = pages.filter(p => p.next_review_date > today).sort((a, b) => a.next_review_date.localeCompare(b.next_review_date))
  const allDue   = [...overdue, ...dueToday]

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid #2a3a2a', borderTopColor: 'var(--green)', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', width: '100%' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(160deg, #1a3a22 0%, #0f1c14 100%)', padding: '48px 20px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--goldL)' }}>مجدول مراجعة الحفظ</div>
            <div style={{ fontSize: 12, color: 'var(--sub)', marginTop: 3 }}>
              {new Date().toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => router.push('/stats')} style={iconBtn}>📊</button>
            <button onClick={async () => { await supabase.auth.signOut(); router.push('/auth') }} style={iconBtn}>↩️</button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: '12px 16px' }}>
          <div style={statStyle}>
            <span style={{ fontSize: 26, fontWeight: 700, color: 'var(--goldL)' }}>{dueToday.length}</span>
            <span style={{ fontSize: 11, color: 'var(--sub)' }}>اليوم</span>
          </div>
          <div style={{ width: 1, height: 32, background: 'var(--border)' }} />
          <div style={statStyle}>
            <span style={{ fontSize: 26, fontWeight: 700, color: '#e07070' }}>{overdue.length}</span>
            <span style={{ fontSize: 11, color: 'var(--sub)' }}>متأخرة</span>
          </div>
          <div style={{ width: 1, height: 32, background: 'var(--border)' }} />
          <div style={statStyle}>
            <span style={{ fontSize: 26, fontWeight: 700, color: '#7ec8a0' }}>{upcoming.length}</span>
            <span style={{ fontSize: 11, color: 'var(--sub)' }}>قادمة</span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, padding: '18px 16px 100px', overflowY: 'auto' }}>
        {allDue.length === 0 && upcoming.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px' }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>🌙</div>
            <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--cream)', marginBottom: 6 }}>لا توجد مراجعات اليوم</div>
            <div style={{ fontSize: 13, color: 'var(--sub)' }}>أضف صفحات جديدة باستخدام زر + أدناه</div>
          </div>
        ) : (
          <>
            {allDue.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={sectionTitle}>📋 مراجعات اليوم ({allDue.length})</div>
                {allDue.map(p => {
                  const isOverdue = p.next_review_date < today
                  return (
                    <div key={p.id} style={card}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={pageBadge}>
                            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--goldL)' }}>{p.page_number}</span>
                          </div>
                          <div>
                            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--cream)' }}>صفحة {p.page_number}</div>
                            <div>
                              {isOverdue
                                ? <span style={chipRed}>متأخرة · {Math.abs(daysDiff(p.next_review_date))} يوم</span>
                                : <span style={chipGold}>مستحقة اليوم</span>}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--sub)', marginTop: 3 }}>فاصل: {p.current_interval_days} يوم</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <button onClick={() => router.push(`/review/${p.id}`)} style={reviewBtn}>✓ مراجعة</button>
                          <button onClick={() => router.push(`/pages/${p.id}`)} style={detailBtn}>تفاصيل</button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {upcoming.length > 0 && (
              <div>
                <div style={sectionTitle}>🗓 قريبًا</div>
                {upcoming.slice(0, 5).map(p => (
                  <div key={p.id} style={{ ...card, opacity: 0.75 }} onClick={() => router.push(`/pages/${p.id}`)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ ...pageBadge, background: '#1e2a1e', borderColor: 'var(--border)' }}>
                          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--goldL)' }}>{p.page_number}</span>
                        </div>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--cream)' }}>صفحة {p.page_number}</div>
                          <div style={{ fontSize: 11, color: 'var(--sub)', marginTop: 3 }}>بعد {daysDiff(p.next_review_date)} يوم · {formatDate(p.next_review_date)}</div>
                        </div>
                      </div>
                      <span style={{ color: 'var(--sub)', fontSize: 14 }}>‹</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* FAB */}
      <button onClick={() => router.push('/add')} style={{
        position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
        width: 56, height: 56, borderRadius: '50%',
        background: 'linear-gradient(135deg, #3a7a4a, #1a4a2a)',
        border: '2px solid var(--green)', color: '#7ec8a0',
        cursor: 'pointer', fontSize: 26,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 20px rgba(74,154,106,0.4)', zIndex: 50,
      }}>＋</button>
    </div>
  )
}

const statStyle: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }
const iconBtn: React.CSSProperties = { background: 'rgba(74,154,106,0.1)', border: '1px solid var(--border)', color: 'var(--sub)', width: 36, height: 36, borderRadius: 10, cursor: 'pointer', fontSize: 17 }
const card: React.CSSProperties = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, marginBottom: 10, cursor: 'pointer' }
const pageBadge: React.CSSProperties = { width: 44, height: 44, borderRadius: 10, background: 'linear-gradient(135deg, #1a4a2a, #0f2a18)', border: '1px solid var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }
const sectionTitle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: 'var(--sub)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }
const chipRed: React.CSSProperties = { fontSize: 10, color: '#e07070', background: 'rgba(224,112,112,0.1)', padding: '2px 8px', borderRadius: 20, display: 'inline-block', marginTop: 3 }
const chipGold: React.CSSProperties = { fontSize: 10, color: 'var(--gold)', background: 'rgba(201,168,76,0.1)', padding: '2px 8px', borderRadius: 20, display: 'inline-block', marginTop: 3 }
const reviewBtn: React.CSSProperties = { background: 'linear-gradient(135deg, #2a5a3a, #1a3a2a)', border: '1px solid var(--green)', color: '#7ec8a0', padding: '7px 12px', borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'Amiri, serif', whiteSpace: 'nowrap' }
const detailBtn: React.CSSProperties = { background: 'transparent', border: '1px solid var(--border)', color: 'var(--sub)', padding: '5px 10px', borderRadius: 20, cursor: 'pointer', fontSize: 11, fontFamily: 'Amiri, serif' }
