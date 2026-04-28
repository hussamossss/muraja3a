'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import { Page, MistakeLevel } from '@/lib/types'
import { todayStr } from '@/lib/spaced-rep'
import { scheduleReview, MISTAKE_TO_STRENGTH, createInitialState } from '@/lib/quran-scheduler'
import { uid } from '@/lib/utils'

const options: { key: MistakeLevel; label: string; emoji: string; desc: string; color: string; bg: string }[] = [
  { key:'perfect',   label:'لا أخطاء',    emoji:'🌟', desc:'حفظت الصفحة بطلاقة تامة',       color:'#22C55E', bg:'#0a1f10' },
  { key:'minor',     label:'خطأ بسيط',    emoji:'✅', desc:'خطأ في حركة أو كلمة لم يؤثر',  color:'#84CC16', bg:'#0d1a04' },
  { key:'impactful', label:'خطأ مؤثر',    emoji:'⚠️', desc:'خطأ أوقفك أو غيّر المعنى',     color:'#F97316', bg:'#1a1005' },
  { key:'few',       label:'2-3 أخطاء',   emoji:'🔸', desc:'أخطاء متعددة لكن تذكرت',        color:'#FB923C', bg:'#1a1108' },
  { key:'many',      label:'4-6 أخطاء',   emoji:'❌', desc:'صعوبة واضحة في أجزاء عدة',      color:'#EF4444', bg:'#1a0808' },
  { key:'lapse',     label:'نسيت تقريبًا',emoji:'🔄', desc:'لم تتذكر معظم الصفحة',          color:'#7C3AED', bg:'#130a1f' },
]

export default function ReviewPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [page, setPage]             = useState<Page | null>(null)
  const [mistakeLevel, setMistakeLevel] = useState<MistakeLevel | null>(null)
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)

  useEffect(() => { loadPage() }, [])

  async function loadPage() {
    const { data, error } = await supabase.from('pages').select('*').eq('id', id).single()
    if (!error && data) setPage(data)
    setLoading(false)
  }

  async function handleConfirm() {
    if (!mistakeLevel || !page) return
    setSaving(true)

    // initialise missing scheduler fields for legacy pages (backfill fallback)
    const fullPage: Page = {
      ...createInitialState(),
      ...page,
      stability_days: page.stability_days ?? page.current_interval_days,
    }

    const today  = todayStr()
    const result = scheduleReview(fullPage, mistakeLevel, today)

    try {
      const { error: pe } = await supabase.from('pages').update({
        last_reviewed_at:      today,
        next_review_date:      result.nextReviewDate,
        current_interval_days: result.newInterval,
        review_count:          page.review_count + 1,
        // new scheduler fields
        last_mistake_level:   mistakeLevel,
        stability_days:       result.stabilityAfter,
        difficulty:           result.difficultyAfter,
        review_stage:         result.stageAfter,
        lapses:               result.newLapses,
        risk_score:           result.riskScore,
        warm_up_count:        result.newWarmUpCount,
        consecutive_good:     result.newConsecutiveGood,
      }).eq('id', page.id)
      if (pe) throw pe

      const { error: le } = await supabase.from('review_logs').insert({
        id:                     uid(),
        user_id:                page.user_id,
        page_id:                page.id,
        reviewed_at:            today,
        next_review_date:       result.nextReviewDate,
        previous_interval_days: page.current_interval_days,
        new_interval_days:      result.newInterval,
        // new scheduler fields
        mistake_level:          mistakeLevel,
        strength:               MISTAKE_TO_STRENGTH[mistakeLevel],
        stability_before:       fullPage.stability_days,
        stability_after:        result.stabilityAfter,
        retrievability_before:  result.retrievabilityBefore,
      })
      if (le) throw le

      router.push('/dashboard')
    } catch { setSaving(false) }
  }

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'var(--bg)' }}>⏳</div>
  if (!page)   return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'var(--bg)', color:'var(--sub)' }}>الصفحة غير موجودة</div>

  const fullPage: Page = { ...createInitialState(), ...page, stability_days: page.stability_days ?? page.current_interval_days }
  const result      = mistakeLevel ? scheduleReview(fullPage, mistakeLevel, todayStr()) : null
  const selectedOpt = options.find(o => o.key === mistakeLevel)

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', background:'var(--bg)' }}>

      {/* Header */}
      <div style={{ background:'var(--bg)', padding:'24px 16px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12 }}>
        <button onClick={() => router.back()} style={backBtn}>‹</button>
        <span style={{ fontSize:17, fontWeight:700, color:'var(--cream)' }}>مراجعة الصفحة</span>
      </div>

      <div style={{ flex:1, padding:'20px 16px 40px', overflowY:'auto' }}>

        {/* Hero */}
        <div style={{ background:'#161A18', border:'1px solid var(--border)', borderTop:'3px solid #38BDF8', borderRadius:20, padding:'28px 20px', textAlign:'center', marginBottom:24 }}>
          <div style={{ fontSize:80, fontWeight:800, color:'var(--cream)', lineHeight:1 }}>{page.page_number}</div>
          <div style={{ fontSize:13, color:'var(--sub)', marginTop:6 }}>صفحة · راجعها {page.review_count} مرة</div>
          <div style={{ display:'inline-block', marginTop:12, background:'rgba(56,189,248,0.12)', color:'#38BDF8', fontSize:12, fontWeight:700, padding:'4px 14px', borderRadius:20 }}>
            الفاصل الحالي: {page.current_interval_days} يوم
          </div>
        </div>

        <div style={{ fontSize:13, fontWeight:600, color:'var(--sub)', marginBottom:12, textAlign:'center' }}>
          كيف كانت المراجعة؟
        </div>

        {/* 6 options */}
        <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:18 }}>
          {options.map(opt => {
            const sel = mistakeLevel === opt.key
            return (
              <button key={opt.key} onClick={() => setMistakeLevel(opt.key)} style={{
                background: sel ? opt.bg : '#0F1210',
                border: `1.5px solid ${sel ? opt.color : 'var(--border)'}`,
                borderRight: `4px solid ${sel ? opt.color : 'transparent'}`,
                borderRadius:14, padding:'18px 16px', cursor:'pointer',
                display:'flex', alignItems:'center', gap:14,
                fontFamily:'Amiri, serif', width:'100%',
                minHeight:70, transition:'all .15s',
              }}>
                <span style={{ fontSize:28 }}>{opt.emoji}</span>
                <div style={{ flex:1, textAlign:'right' }}>
                  <div style={{ fontSize:17, fontWeight:700, color: sel ? opt.color : 'var(--cream)' }}>{opt.label}</div>
                  <div style={{ fontSize:12, color:'var(--sub)', marginTop:3 }}>{opt.desc}</div>
                </div>
                {sel && <span style={{ fontSize:18, color: opt.color }}>✓</span>}
              </button>
            )
          })}
        </div>

        {/* Preview */}
        {result && selectedOpt && (
          <div style={{ background:`${selectedOpt.color}10`, border:`1px solid ${selectedOpt.color}30`, borderRadius:14, padding:'16px 20px', textAlign:'center', marginBottom:16 }}>
            <div style={{ fontSize:12, color:'var(--sub)', marginBottom:4 }}>المراجعة القادمة</div>
            <div style={{ fontSize:32, fontWeight:800, color: selectedOpt.color, lineHeight:1 }}>{result.newInterval}</div>
            <div style={{ fontSize:12, color:'var(--sub)', marginTop:2 }}>يوم من الآن</div>
          </div>
        )}

        {/* Confirm */}
        <button onClick={handleConfirm} disabled={!mistakeLevel || saving} style={{
          background: mistakeLevel ? (selectedOpt?.color ?? '#22C55E') : '#252B28',
          border:'none', color: mistakeLevel ? '#000' : 'var(--sub)',
          padding:16, borderRadius:14, cursor: mistakeLevel ? 'pointer' : 'not-allowed',
          fontSize:16, fontWeight:800, width:'100%', fontFamily:'Amiri, serif',
          transition:'all .15s',
        }}>
          {saving ? 'جارٍ الحفظ...' : mistakeLevel ? `تأكيد — ${selectedOpt?.label}` : 'اختر تقييماً أولاً'}
        </button>
      </div>
    </div>
  )
}

const backBtn: React.CSSProperties = { width:36, height:36, borderRadius:10, background:'transparent', border:'1px solid var(--border)', color:'var(--sub)', cursor:'pointer', fontSize:18 }
