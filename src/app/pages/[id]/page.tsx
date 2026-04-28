'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import { Page, ReviewLog } from '@/lib/types'
import { formatDate, todayStr } from '@/lib/spaced-rep'

export default function PageDetailsPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [page, setPage] = useState<Page | null>(null)
  const [logs, setLogs] = useState<ReviewLog[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [pageRes, logsRes] = await Promise.all([
      supabase.from('pages').select('*').eq('id', id).single(),
      supabase.from('review_logs').select('*').eq('page_id', id).order('reviewed_at', { ascending: false }),
    ])
    if (pageRes.data) setPage(pageRes.data)
    if (logsRes.data) setLogs(logsRes.data)
    setLoading(false)
  }

  async function handleDelete() {
    if (!confirm('هل تريد حذف هذه الصفحة وكل سجلاتها؟')) return
    setDeleting(true)
    await supabase.from('pages').delete().eq('id', id)
    router.push('/dashboard')
  }

  const SL: Record<string, string> = {
    strong:'قوي', medium:'متوسط', weak:'ضعيف',
    perfect:'لا أخطاء', minor:'خطأ بسيط', impactful:'خطأ مؤثر',
    few:'2-3 أخطاء', many:'4-6 أخطاء', lapse:'نسيت تقريبًا',
  }
  const SC: Record<string, string> = {
    strong:'#22C55E', medium:'#F97316', weak:'#EF4444',
    perfect:'#22C55E', minor:'#84CC16', impactful:'#F97316',
    few:'#FB923C', many:'#EF4444', lapse:'#7C3AED',
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)' }}>⏳</div>
  if (!page)   return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)', color: 'var(--sub)' }}>الصفحة غير موجودة</div>

  const isOverdue = page.next_review_date <= todayStr()

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{ background: 'var(--bg)', padding: '24px 16px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.back()} style={backBtn}>‹</button>
        <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--cream)' }}>تفاصيل الصفحة</span>
      </div>

      {/* Body */}
      <div style={{ flex: 1, padding: '18px 16px 40px', overflowY: 'auto' }}>
        {/* Hero */}
        <div style={{ background: '#161A18', border: '1px solid var(--border)', borderRadius: 20, padding: 28, textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 72, fontWeight: 700, color: 'var(--cream)', lineHeight: 1 }}>{page.page_number}</div>
          <div style={{ fontSize: 13, color: 'var(--sub)', marginTop: 4 }}>صفحة من القرآن الكريم</div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12, flexWrap: 'wrap' }}>
            <span style={badge}>⭐ {page.review_count} مراجعة</span>
            {(page.last_mistake_level ?? page.last_strength) && (
              <span style={{ ...badge, color: SC[page.last_mistake_level ?? page.last_strength ?? ''] }}>
                آخر تقييم: {SL[page.last_mistake_level ?? page.last_strength ?? '']}
              </span>
            )}
          </div>
        </div>

        {/* Info Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'تاريخ الإضافة',     value: formatDate(page.created_at) },
            { label: 'آخر مراجعة',         value: page.last_reviewed_at ? formatDate(page.last_reviewed_at) : 'لم تراجع بعد' },
            { label: 'المراجعة القادمة',   value: formatDate(page.next_review_date), warn: isOverdue },
            { label: 'الفاصل الحالي',      value: `${page.current_interval_days} يوم` },
          ].map((item, i) => (
            <div key={i} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px' }}>
              <div style={{ fontSize: 10, color: 'var(--sub)', marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: item.warn ? 'var(--red)' : 'var(--cream)' }}>{item.value}</div>
            </div>
          ))}
        </div>

        {/* Review button */}
        {isOverdue && (
          <button onClick={() => router.push(`/review/${page.id}`)} style={{ ...primaryBtn, marginBottom: 10 }}>
            ✓ ابدأ المراجعة
          </button>
        )}

        {/* Delete */}
        <button onClick={handleDelete} disabled={deleting} style={{ background: 'rgba(224,80,80,0.1)', border: '1px solid rgba(224,80,80,0.3)', color: 'var(--red)', padding: 12, borderRadius: 14, cursor: 'pointer', fontSize: 14, width: '100%', fontFamily: 'Amiri, serif', marginBottom: 24, opacity: deleting ? 0.6 : 1 }}>
          {deleting ? 'جارٍ الحذف...' : '🗑️ حذف هذه الصفحة'}
        </button>

        {/* Logs */}
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--sub)', letterSpacing: 1, marginBottom: 10 }}>🔄 سجل المراجعات</div>
        {logs.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--sub)', padding: '12px 0' }}>لا توجد مراجعات سابقة</div>
        ) : (
          <div>
            {logs.map((log, i) => (
              <div key={log.id} style={{ display: 'flex', gap: 12, minHeight: 56 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 14 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: SC[log.mistake_level ?? log.strength] || 'var(--sub)', flexShrink: 0, marginTop: 4 }} />
                  {i < logs.length - 1 && <div style={{ flex: 1, width: 1.5, background: 'var(--border)', margin: '4px 0' }} />}
                </div>
                <div style={{ flex: 1, paddingBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: SC[log.mistake_level ?? log.strength], fontWeight: 600 }}>{SL[log.mistake_level ?? log.strength]}</span>
                    <span style={{ fontSize: 11, color: 'var(--sub)' }}>{formatDate(log.reviewed_at)}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--sub)', marginTop: 2 }}>
                    {log.previous_interval_days} يوم → {log.new_interval_days} يوم
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const backBtn: React.CSSProperties = { width: 36, height: 36, borderRadius: 10, background: 'transparent', border: '1px solid var(--border)', color: 'var(--sub)', cursor: 'pointer', fontSize: 18 }
const badge: React.CSSProperties = { fontSize: 11, color: 'var(--gold)', background: 'rgba(212,144,56,0.12)', padding: '3px 10px', borderRadius: 20 }
const primaryBtn: React.CSSProperties = { background: '#16A34A', border: 'none', color: '#ffffff', padding: 14, borderRadius: 14, cursor: 'pointer', fontSize: 15, fontWeight: 700, width: '100%', fontFamily: 'Amiri, serif' }
