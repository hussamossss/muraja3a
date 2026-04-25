'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import { Page, Strength } from '@/lib/types'
import { calcNewInterval, addDays, todayStr } from '@/lib/spaced-rep'
import { uid } from '@/lib/utils'

export default function ReviewPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [page, setPage] = useState<Page | null>(null)
  const [strength, setStrength] = useState<Strength | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadPage() }, [])

  async function loadPage() {
    const { data, error } = await supabase.from('pages').select('*').eq('id', id).single()
    if (!error && data) setPage(data)
    setLoading(false)
  }

  async function handleConfirm() {
    if (!strength || !page) return
    setSaving(true)
    const newInterval = calcNewInterval(page.current_interval_days, strength)
    const nextDate    = addDays(todayStr(), newInterval)
    try {
      const { error: pageError } = await supabase.from('pages').update({
        last_reviewed_at: todayStr(),
        next_review_date: nextDate,
        current_interval_days: newInterval,
        last_strength: strength,
        review_count: page.review_count + 1,
      }).eq('id', page.id)
      if (pageError) throw pageError

      const { error: logError } = await supabase.from('review_logs').insert({
        id: uid(),
        user_id: page.user_id,
        page_id: page.id,
        reviewed_at: todayStr(),
        strength,
        previous_interval_days: page.current_interval_days,
        new_interval_days: newInterval,
        next_review_date: nextDate,
      })
      if (logError) throw logError

      router.push('/dashboard')
    } catch (e) {
      setSaving(false)
    }
  }

  const options = [
    { key: 'strong' as Strength, label: 'قوي',   emoji: '💪', desc: 'حفظته بوضوح وطلاقة',        color: '#4a9a6a', bg: '#1a3a2a' },
    { key: 'medium' as Strength, label: 'متوسط', emoji: '🤔', desc: 'تذكرته مع بعض التردد',       color: '#d4a832', bg: '#2a2a10' },
    { key: 'weak'   as Strength, label: 'ضعيف',  emoji: '😓', desc: 'صعب أو نسيت أجزاء منه',     color: '#c05858', bg: '#2a1515' },
  ]

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>⏳</div>
  if (!page)   return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--sub)' }}>الصفحة غير موجودة</div>

  const preview = strength ? calcNewInterval(page.current_interval_days, strength) : null

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(160deg, #1a3a22 0%, #0f1c14 100%)', padding: '24px 16px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.back()} style={backBtn}>‹</button>
        <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--cream)' }}>مراجعة الصفحة</span>
      </div>

      {/* Body */}
      <div style={{ flex: 1, padding: '18px 16px 40px', overflowY: 'auto' }}>
        {/* Hero */}
        <div style={{ background: 'linear-gradient(135deg, #1a3a22, #0f2218)', border: '1px solid var(--green)', borderRadius: 20, padding: 28, textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 72, fontWeight: 700, color: 'var(--goldL)', lineHeight: 1 }}>{page.page_number}</div>
          <div style={{ fontSize: 13, color: 'var(--sub)', marginTop: 4 }}>صفحة</div>
          <div style={{ fontSize: 12, color: 'var(--sub)', marginTop: 8 }}>الفاصل الحالي: {page.current_interval_days} يوم</div>
        </div>

        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--sub)', letterSpacing: 1, marginBottom: 10 }}>كيف كان حفظك؟</div>

        {/* Strength buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {options.map(opt => (
            <button key={opt.key} onClick={() => setStrength(opt.key)} style={{
              background: strength === opt.key ? opt.bg : 'rgba(0,0,0,0.2)',
              border: `1.5px solid ${strength === opt.key ? opt.color : 'var(--border)'}`,
              borderRadius: 14, padding: '14px 16px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 12,
              fontFamily: 'Amiri, serif', width: '100%',
              transform: strength === opt.key ? 'scale(1.02)' : 'scale(1)',
              transition: 'all 0.18s',
            }}>
              <span style={{ fontSize: 24 }}>{opt.emoji}</span>
              <span style={{ fontSize: 16, fontWeight: 700, minWidth: 48, color: strength === opt.key ? opt.color : 'var(--cream)' }}>{opt.label}</span>
              <span style={{ fontSize: 12, color: 'var(--sub)', flex: 1, textAlign: 'right' }}>{opt.desc}</span>
            </button>
          ))}
        </div>

        {/* Preview */}
        {preview && (
          <div style={{ background: 'rgba(232,200,112,0.06)', border: '1px solid rgba(232,200,112,0.15)', borderRadius: 12, padding: '12px 18px', textAlign: 'center', fontSize: 14, color: 'var(--sub)', marginBottom: 12 }}>
            المراجعة القادمة بعد <strong style={{ color: 'var(--goldL)', fontSize: 20, margin: '0 6px' }}>{preview}</strong> يوم
          </div>
        )}

        {/* Confirm */}
        <button onClick={handleConfirm} disabled={!strength || saving} style={{ background: 'linear-gradient(135deg, #2a5a3a, #1a3a2a)', border: '1px solid var(--green)', color: '#7ec8a0', padding: 14, borderRadius: 14, cursor: 'pointer', fontSize: 15, fontWeight: 700, width: '100%', fontFamily: 'Amiri, serif', opacity: !strength || saving ? 0.4 : 1 }}>
          {saving ? 'جارٍ الحفظ...' : 'تأكيد المراجعة'}
        </button>
      </div>
    </div>
  )
}

const backBtn: React.CSSProperties = { width: 36, height: 36, borderRadius: 10, background: 'transparent', border: '1px solid var(--border)', color: 'var(--sub)', cursor: 'pointer', fontSize: 18 }
