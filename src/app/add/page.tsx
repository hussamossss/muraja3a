'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { todayStr, addDays } from '@/lib/spaced-rep'
import { uid } from '@/lib/utils'
import type { ReviewStage, InitialMemoryState } from '@/lib/types'

// ── Preset definitions ────────────────────────────────────────────────────────
type Preset = {
  stage: ReviewStage; stability: number; difficulty: number
  warmUp: number; baseInterval: number; label: string; desc: string; color: string
}

const PRESETS: Record<InitialMemoryState, Preset> = {
  new:          { stage:'learning', stability:1,  difficulty:0.3,  warmUp:0, baseInterval:1,  label:'جديدة',          desc:'لم أحفظها من قبل',              color:'#22C55E' },
  strong_old:   { stage:'mature',   stability:35, difficulty:0.25, warmUp:5, baseInterval:21, label:'ثابتة جداً',      desc:'أحفظها بطلاقة منذ فترة',         color:'#22C55E' },
  good_old:     { stage:'review',   stability:21, difficulty:0.4,  warmUp:5, baseInterval:14, label:'جيدة',            desc:'أتذكرها جيداً مع مراجعة دورية', color:'#38BDF8' },
  hesitant_old: { stage:'fragile',  stability:7,  difficulty:0.55, warmUp:5, baseInterval:3,  label:'مترددة',          desc:'أتذكرها أحياناً وأخطئ أحياناً', color:'#F97316' },
  weak_old:     { stage:'learning', stability:1,  difficulty:0.75, warmUp:0, baseInterval:1,  label:'ضعيفة أو منسية', desc:'أكاد لا أتذكرها',               color:'#EF4444' },
}

const OLD_OPTIONS: InitialMemoryState[] = ['strong_old', 'good_old', 'hesitant_old', 'weak_old']

// ── Next date logic ───────────────────────────────────────────────────────────
function calcNextDate(
  baseInterval: number,
  lastReviewedAt: string,
  today: string,
  state: InitialMemoryState,
): string {
  if (!lastReviewedAt) return addDays(today, baseInterval)

  const elapsed = Math.max(0, Math.round(
    (new Date(today).getTime() - new Date(lastReviewedAt).getTime()) / 86400000
  ))
  const remaining = baseInterval - elapsed

  if (remaining <= 0) {
    // ثابتة/جيدة: لا تظهر كمستحقة فوراً — غداً كحد أدنى
    if (state === 'strong_old' || state === 'good_old') return addDays(today, 1)
    // مترددة/ضعيفة: تظهر اليوم
    return today
  }

  return addDays(today, Math.min(remaining, 21))
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function AddPage() {
  const router = useRouter()
  const [value, setValue]       = useState('')
  const [mode, setMode]         = useState<'new' | 'old'>('new')
  const [memState, setMemState] = useState<InitialMemoryState>('strong_old')
  const [lastDate, setLastDate] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  async function handleAdd() {
    const num = parseInt(value)
    if (!value || isNaN(num) || num < 1 || num > 604) {
      setError('أدخل رقمًا صحيحًا من 1 إلى 604'); return
    }
    setLoading(true); setError('')
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) { router.push('/auth'); return }

      const { data: existing } = await supabase
        .from('pages').select('id')
        .eq('user_id', user.id).eq('page_number', num).maybeSingle()
      if (existing) { setError('الصفحة موجودة مسبقًا!'); setLoading(false); return }

      const today          = todayStr()
      const activeState    = mode === 'new' ? 'new' : memState
      const preset         = PRESETS[activeState]
      const lastReviewedAt = (mode === 'old' && lastDate) ? lastDate : null
      const nextDate       = calcNextDate(preset.baseInterval, lastDate, today, activeState)

      const { error: insertErr } = await supabase.from('pages').insert({
        id:                    uid(),
        user_id:               user.id,
        page_number:           num,
        created_at:            today,
        last_reviewed_at:      lastReviewedAt,
        next_review_date:      nextDate,
        current_interval_days: preset.baseInterval,
        last_strength:         null,
        review_count:          0,
        last_mistake_level:    null,
        stability_days:        preset.stability,
        difficulty:            preset.difficulty,
        review_stage:          preset.stage,
        lapses:                0,
        risk_score:            0,
        warm_up_count:         preset.warmUp,
        consecutive_good:      0,
        initial_memory_state:  activeState,
      })
      if (insertErr) throw insertErr
      router.push('/dashboard?added=1')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'حدث خطأ')
    } finally {
      setLoading(false)
    }
  }

  const today = todayStr()

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', background:'var(--bg)' }}>

      {/* Header */}
      <div style={{ background:'var(--bg)', padding:'24px 16px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12 }}>
        <button onClick={() => router.back()} style={backBtn}>‹</button>
        <span style={{ fontSize:17, fontWeight:700, color:'var(--cream)' }}>إضافة صفحة</span>
      </div>

      {/* Body */}
      <div style={{ flex:1, padding:'24px 16px 48px', overflowY:'auto' }}>
        <div style={{ maxWidth:400, margin:'0 auto', display:'flex', flexDirection:'column', gap:20 }}>

          {/* Page number */}
          <div style={card}>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
              <div style={{ fontSize:32 }}>📖</div>
              <div style={{ fontSize:17, fontWeight:700, color:'var(--cream)' }}>رقم الصفحة</div>
              <div style={{ fontSize:12, color:'var(--sub)' }}>من 1 إلى 604</div>
              <input
                type="number" min="1" max="604"
                value={value}
                onChange={e => { setValue(e.target.value); setError('') }}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                placeholder="مثال: 25"
                autoFocus
                style={{ background:'#0F1210', border:`1.5px solid ${error ? 'var(--red)' : 'var(--border)'}`, borderRadius:12, padding:14, fontSize:28, color:'var(--cream)', textAlign:'center', width:'100%', outline:'none', fontFamily:'Amiri, serif' }}
              />
              {error && <div style={{ fontSize:12, color:'var(--red)', textAlign:'center' }}>{error}</div>}
            </div>
          </div>

          {/* Mode toggle */}
          <div>
            <div style={{ fontSize:12, color:'var(--sub)', marginBottom:10, fontWeight:600 }}>حالة الصفحة</div>
            <div style={{ display:'flex', gap:8 }}>
              {(['new', 'old'] as const).map(m => {
                const active = mode === m
                return (
                  <button key={m} onClick={() => setMode(m)} style={{
                    flex:1, padding:'12px 0', borderRadius:12,
                    border:`1.5px solid ${active ? (m === 'new' ? '#22C55E' : '#38BDF8') : 'var(--border)'}`,
                    background: active ? (m === 'new' ? '#22C55E18' : '#38BDF818') : '#0F1210',
                    color: active ? (m === 'new' ? '#22C55E' : '#38BDF8') : 'var(--sub)',
                    fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'Amiri, serif',
                    transition:'all .15s',
                  }}>
                    {m === 'new' ? 'جديدة' : 'محفوظة سابقًا'}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Memory state options (old only) */}
          {mode === 'old' && (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              <div style={{ fontSize:12, color:'var(--sub)', marginBottom:2, fontWeight:600 }}>حالة الحفظ الحالية</div>
              {OLD_OPTIONS.map(key => {
                const p   = PRESETS[key]
                const sel = memState === key
                return (
                  <button key={key} onClick={() => setMemState(key)} style={{
                    display:'flex', alignItems:'center', gap:12,
                    padding:'12px 14px', borderRadius:12, cursor:'pointer',
                    border:`1.5px solid ${sel ? p.color : 'var(--border)'}`,
                    background: sel ? `${p.color}12` : '#0F1210',
                    fontFamily:'Amiri, serif', textAlign:'right', width:'100%',
                    transition:'all .15s',
                  }}>
                    <div style={{ width:10, height:10, borderRadius:'50%', background: sel ? p.color : 'var(--border)', flexShrink:0 }}/>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:14, fontWeight:700, color: sel ? p.color : 'var(--cream)' }}>{p.label}</div>
                      <div style={{ fontSize:11, color:'var(--sub)', marginTop:2 }}>{p.desc}</div>
                    </div>
                    {sel && <span style={{ color: p.color, fontSize:16 }}>✓</span>}
                  </button>
                )
              })}
            </div>
          )}

          {/* Last review date (old only) */}
          {mode === 'old' && (
            <div>
              <div style={{ fontSize:12, color:'var(--sub)', marginBottom:8, fontWeight:600 }}>
                متى كانت آخر مراجعة؟ <span style={{ fontWeight:400 }}>(اختياري)</span>
              </div>
              <input
                type="date"
                max={today}
                value={lastDate}
                onChange={e => setLastDate(e.target.value)}
                style={{ background:'#0F1210', border:'1px solid var(--border)', borderRadius:10, padding:'10px 12px', color: lastDate ? 'var(--cream)' : 'var(--sub)', width:'100%', outline:'none', fontSize:14, fontFamily:'Amiri, serif', boxSizing:'border-box' }}
              />
            </div>
          )}

          {/* Save button */}
          <button onClick={handleAdd} disabled={loading} style={{
            background:'#16A34A', border:'none', color:'#fff',
            padding:14, borderRadius:14, cursor:'pointer',
            fontSize:15, fontWeight:700, width:'100%',
            fontFamily:'Amiri, serif', opacity: loading ? 0.6 : 1,
          }}>
            {loading ? 'جارٍ الحفظ...' : 'حفظ الصفحة'}
          </button>

        </div>
      </div>
    </div>
  )
}

const backBtn: React.CSSProperties = { width:36, height:36, borderRadius:10, background:'transparent', border:'1px solid var(--border)', color:'var(--sub)', cursor:'pointer', fontSize:18 }
const card: React.CSSProperties    = { background:'var(--card)', border:'1px solid var(--border)', borderRadius:20, padding:'24px 20px' }
