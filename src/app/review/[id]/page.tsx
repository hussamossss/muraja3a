'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import { Page, MistakeLevel, QuranWord } from '@/lib/types'
import { todayStr } from '@/lib/spaced-rep'
import { scheduleReview, MISTAKE_TO_STRENGTH, createInitialState } from '@/lib/quran-scheduler'
import { loadPageWords } from '@/lib/quran-data'
import { calcMistakeLevel, saveWordMistakes } from '@/lib/word-scorer'
import { uid } from '@/lib/utils'
import QuranPage from '@/components/QuranPage'

// ── Quick-mode options ────────────────────────────────────────────────────────
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

  const [page, setPage]         = useState<Page | null>(null)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)

  // mode
  const [reviewMode, setReviewMode] = useState<'quick' | 'words' | null>(null)

  // quick mode
  const [mistakeLevel, setMistakeLevel] = useState<MistakeLevel | null>(null)

  // words mode
  const [allWords,      setAllWords]      = useState<QuranWord[]>([])
  const [selectedKeys,  setSelectedKeys]  = useState<Set<string>>(new Set())
  const [selectedWords, setSelectedWords] = useState<QuranWord[]>([])
  const [confirmZero,   setConfirmZero]   = useState(false)

  useEffect(() => { loadPage() }, [])

  // load page words when words mode is selected
  useEffect(() => {
    if (reviewMode === 'words' && page) {
      loadPageWords(page.page_number).then(setAllWords).catch(console.error)
    }
  }, [reviewMode, page])

  async function loadPage() {
    const { data, error } = await supabase.from('pages').select('*').eq('id', id).single()
    if (!error && data) setPage(data)
    setLoading(false)
  }

  // ── shared: build full page + run scheduler ───────────────────────────────
  function buildResult(level: MistakeLevel) {
    if (!page) return null
    const fullPage: Page = {
      ...createInitialState(),
      ...page,
      stability_days: page.stability_days ?? page.current_interval_days,
    }
    return { fullPage, result: scheduleReview(fullPage, level, todayStr()) }
  }

  // ── shared: write pages + review_logs ────────────────────────────────────
  async function persistReview(level: MistakeLevel) {
    if (!page) return null
    const built = buildResult(level)
    if (!built) return null
    const { fullPage, result } = built
    const today = todayStr()
    const logId = uid()

    const { error: pe } = await supabase.from('pages').update({
      last_reviewed_at:      today,
      next_review_date:      result.nextReviewDate,
      current_interval_days: result.newInterval,
      review_count:          page.review_count + 1,
      last_mistake_level:    level,
      stability_days:        result.stabilityAfter,
      difficulty:            result.difficultyAfter,
      review_stage:          result.stageAfter,
      lapses:                result.newLapses,
      risk_score:            result.riskScore,
      warm_up_count:         result.newWarmUpCount,
      consecutive_good:      result.newConsecutiveGood,
    }).eq('id', page.id)
    if (pe) throw pe

    const { error: le } = await supabase.from('review_logs').insert({
      id:                     logId,
      user_id:                page.user_id,
      page_id:                page.id,
      reviewed_at:            today,
      next_review_date:       result.nextReviewDate,
      previous_interval_days: page.current_interval_days,
      new_interval_days:      result.newInterval,
      mistake_level:          level,
      strength:               MISTAKE_TO_STRENGTH[level],
      stability_before:       fullPage.stability_days,
      stability_after:        result.stabilityAfter,
      retrievability_before:  result.retrievabilityBefore,
    })
    if (le) throw le

    return { logId, result }
  }

  // ── quick mode confirm ────────────────────────────────────────────────────
  async function handleConfirm() {
    if (!mistakeLevel || !page) return
    setSaving(true)
    try {
      await persistReview(mistakeLevel)
      router.push('/dashboard')
    } catch { setSaving(false) }
  }

  // ── words mode confirm ────────────────────────────────────────────────────
  async function handleConfirmWords(forceZero = false) {
    if (!page) return

    if (selectedWords.length === 0 && !forceZero) {
      setConfirmZero(true)
      return
    }

    setSaving(true)
    setConfirmZero(false)
    try {
      const level: MistakeLevel = selectedWords.length === 0
        ? 'perfect'
        : await calcMistakeLevel(selectedWords, page.user_id, page.page_number)

      const saved = await persistReview(level)
      if (!saved) throw new Error('save failed')

      if (selectedWords.length > 0) {
        const { error: we } = await saveWordMistakes({
          userId:        page.user_id,
          pageId:        page.id,
          pageNumber:    page.page_number,
          reviewLogId:   saved.logId,
          selectedWords,
          allWords,
        })
        if (we) console.error('[review] word_mistakes failed:', we)
      }

      router.push('/dashboard')
    } catch { setSaving(false) }
  }

  // ── word toggle ───────────────────────────────────────────────────────────
  const handleWordToggle = useCallback((word: QuranWord) => {
    const key = `${word.s}:${word.a}:${word.wi}`
    setSelectedKeys(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
    setSelectedWords(prev => {
      const exists = prev.some(w => w.s === word.s && w.a === word.a && w.wi === word.wi)
      return exists
        ? prev.filter(w => !(w.s === word.s && w.a === word.a && w.wi === word.wi))
        : [...prev, word]
    })
  }, [])

  // ── loading / not found ───────────────────────────────────────────────────
  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'var(--bg)' }}>⏳</div>
  if (!page)   return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'var(--bg)', color:'var(--sub)' }}>الصفحة غير موجودة</div>

  const quickResult  = mistakeLevel ? buildResult(mistakeLevel)?.result : null
  const selectedOpt  = options.find(o => o.key === mistakeLevel)

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', background:'var(--bg)' }}>

      {/* Header */}
      <div style={{ background:'var(--bg)', padding:'24px 16px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12 }}>
        <button
          onClick={() => reviewMode ? setReviewMode(null) : router.back()}
          style={backBtn}>‹</button>
        <span style={{ fontSize:17, fontWeight:700, color:'var(--cream)' }}>
          {reviewMode === 'words' ? 'حدد الكلمات الخاطئة' : 'مراجعة الصفحة'}
        </span>
        {reviewMode === 'words' && selectedKeys.size > 0 && (
          <span style={{ marginRight:'auto', fontSize:13, fontWeight:700, color:'#EF4444', background:'rgba(239,68,68,0.12)', padding:'4px 12px', borderRadius:20 }}>
            {selectedKeys.size} كلمة
          </span>
        )}
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

        {/* ── Mode selector ── */}
        {!reviewMode && (
          <>
            <div style={{ fontSize:13, fontWeight:600, color:'var(--sub)', marginBottom:12, textAlign:'center' }}>
              كيف تريد تسجيل المراجعة؟
            </div>
            <div style={{ display:'flex', gap:10, marginBottom:8 }}>
              <button onClick={() => setReviewMode('quick')} style={{
                flex:1, padding:'18px 12px', borderRadius:14, cursor:'pointer',
                border:'1.5px solid var(--border)', background:'#0F1210',
                display:'flex', flexDirection:'column', alignItems:'center', gap:8,
                fontFamily:'Amiri, serif', transition:'all .15s',
              }}>
                <span style={{ fontSize:28 }}>⚡</span>
                <span style={{ fontSize:15, fontWeight:700, color:'var(--cream)' }}>تقييم سريع</span>
                <span style={{ fontSize:11, color:'var(--sub)' }}>اختر مستوى الأداء</span>
              </button>
              <button onClick={() => setReviewMode('words')} style={{
                flex:1, padding:'18px 12px', borderRadius:14, cursor:'pointer',
                border:'1.5px solid var(--border)', background:'#0F1210',
                display:'flex', flexDirection:'column', alignItems:'center', gap:8,
                fontFamily:'Amiri, serif', transition:'all .15s',
              }}>
                <span style={{ fontSize:28 }}>🔤</span>
                <span style={{ fontSize:15, fontWeight:700, color:'var(--cream)' }}>تحديد الكلمات</span>
                <span style={{ fontSize:11, color:'var(--sub)' }}>حدد الكلمات الخاطئة</span>
              </button>
            </div>
          </>
        )}

        {/* ── Quick mode ── */}
        {reviewMode === 'quick' && (
          <>
            <div style={{ fontSize:13, fontWeight:600, color:'var(--sub)', marginBottom:12, textAlign:'center' }}>
              كيف كانت المراجعة؟
            </div>
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
            {quickResult && selectedOpt && (
              <div style={{ background:`${selectedOpt.color}10`, border:`1px solid ${selectedOpt.color}30`, borderRadius:14, padding:'16px 20px', textAlign:'center', marginBottom:16 }}>
                <div style={{ fontSize:12, color:'var(--sub)', marginBottom:4 }}>المراجعة القادمة</div>
                <div style={{ fontSize:32, fontWeight:800, color: selectedOpt.color, lineHeight:1 }}>{quickResult.newInterval}</div>
                <div style={{ fontSize:12, color:'var(--sub)', marginTop:2 }}>يوم من الآن</div>
              </div>
            )}
            <button onClick={handleConfirm} disabled={!mistakeLevel || saving} style={{
              background: mistakeLevel ? (selectedOpt?.color ?? '#22C55E') : '#252B28',
              border:'none', color: mistakeLevel ? '#000' : 'var(--sub)',
              padding:16, borderRadius:14, cursor: mistakeLevel ? 'pointer' : 'not-allowed',
              fontSize:16, fontWeight:800, width:'100%', fontFamily:'Amiri, serif', transition:'all .15s',
            }}>
              {saving ? 'جارٍ الحفظ...' : mistakeLevel ? `تأكيد — ${selectedOpt?.label}` : 'اختر تقييماً أولاً'}
            </button>
          </>
        )}

        {/* ── Words mode ── */}
        {reviewMode === 'words' && (
          <>
            {/* Selected words */}
            {selectedWords.length > 0 && (
              <div style={{ background:'rgba(239,68,68,0.07)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:14, padding:'12px 16px', marginBottom:16 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                  <span style={{ fontSize:11, fontWeight:600, color:'#EF4444' }}>الكلمات المحددة</span>
                  <button onClick={() => { setSelectedKeys(new Set()); setSelectedWords([]) }}
                    style={{ background:'none', border:'none', color:'var(--sub)', fontSize:12, cursor:'pointer', fontFamily:'Amiri, serif' }}>
                    مسح ✕
                  </button>
                </div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6, direction:'rtl' }}>
                  {selectedWords.map(w => (
                    <span key={`${w.s}:${w.a}:${w.wi}`} onClick={() => handleWordToggle(w)}
                      style={{ fontFamily:'"Amiri Quran", serif', fontSize:18, color:'#EF4444', background:'rgba(239,68,68,0.12)', padding:'3px 10px', borderRadius:20, cursor:'pointer' }}>
                      {w.t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Zero-words confirmation */}
            {confirmZero && (
              <div style={{ background:'rgba(56,189,248,0.07)', border:'1px solid rgba(56,189,248,0.25)', borderRadius:14, padding:'16px', marginBottom:16, textAlign:'center' }}>
                <div style={{ fontSize:14, color:'var(--cream)', marginBottom:12 }}>
                  لم تحدد أي كلمة خاطئة. هل تريد تسجيلها كمراجعة بلا أخطاء؟
                </div>
                <div style={{ display:'flex', gap:10 }}>
                  <button onClick={() => handleConfirmWords(true)} style={{
                    flex:1, padding:'10px', borderRadius:10, cursor:'pointer',
                    background:'#22C55E', border:'none', color:'#000', fontSize:14, fontWeight:700, fontFamily:'Amiri, serif',
                  }}>نعم — لا أخطاء</button>
                  <button onClick={() => setConfirmZero(false)} style={{
                    flex:1, padding:'10px', borderRadius:10, cursor:'pointer',
                    background:'transparent', border:'1px solid var(--border)', color:'var(--sub)', fontSize:14, fontFamily:'Amiri, serif',
                  }}>إلغاء</button>
                </div>
              </div>
            )}

            {/* Quran page */}
            <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, marginBottom:16, overflow:'hidden' }}>
              <QuranPage
                pageNumber={page.page_number}
                interactive
                selectedKeys={selectedKeys}
                onWordToggle={handleWordToggle}
              />
            </div>

            {/* Confirm words */}
            {!confirmZero && (
              <button onClick={() => handleConfirmWords()} disabled={saving} style={{
                background: saving ? '#252B28' : '#EF4444',
                border:'none', color: saving ? 'var(--sub)' : '#fff',
                padding:16, borderRadius:14, cursor: saving ? 'not-allowed' : 'pointer',
                fontSize:16, fontWeight:800, width:'100%', fontFamily:'Amiri, serif', transition:'all .15s',
              }}>
                {saving
                  ? 'جارٍ الحفظ...'
                  : selectedWords.length > 0
                    ? `حفظ ${selectedWords.length} كلمة خاطئة`
                    : 'تأكيد — لا أخطاء'}
              </button>
            )}
          </>
        )}

      </div>
    </div>
  )
}

const backBtn: React.CSSProperties = { width:36, height:36, borderRadius:10, background:'transparent', border:'1px solid var(--border)', color:'var(--sub)', cursor:'pointer', fontSize:18 }
