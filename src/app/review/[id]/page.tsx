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
import { useT } from '@/lib/i18n'

const OPTION_META: { key: MistakeLevel; emoji: string; color: string; bg: string }[] = [
  { key:'perfect',   emoji:'🌟', color:'#22C55E', bg:'#0a1f10' },
  { key:'minor',     emoji:'✅', color:'#84CC16', bg:'#0d1a04' },
  { key:'impactful', emoji:'⚠️', color:'#F97316', bg:'#1a1005' },
  { key:'few',       emoji:'🔸', color:'#FB923C', bg:'#1a1108' },
  { key:'many',      emoji:'❌', color:'#EF4444', bg:'#1a0808' },
  { key:'lapse',     emoji:'🔄', color:'#7C3AED', bg:'#130a1f' },
]

export default function ReviewPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const t = useT()

  const [page, setPage]         = useState<Page | null>(null)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)

  const [reviewMode, setReviewMode] = useState<'quick' | 'words' | null>(null)

  const [mistakeLevel, setMistakeLevel] = useState<MistakeLevel | null>(null)

  const [allWords,      setAllWords]      = useState<QuranWord[]>([])
  const [selectedKeys,  setSelectedKeys]  = useState<Set<string>>(new Set())
  const [selectedWords, setSelectedWords] = useState<QuranWord[]>([])
  const [confirmZero,   setConfirmZero]   = useState(false)

  useEffect(() => { loadPage() }, [])

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

  function buildResult(level: MistakeLevel) {
    if (!page) return null
    const fullPage: Page = {
      ...createInitialState(),
      ...page,
      stability_days: page.stability_days ?? page.current_interval_days,
    }
    return { fullPage, result: scheduleReview(fullPage, level, todayStr()) }
  }

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

  async function handleConfirm() {
    if (!mistakeLevel || !page) return
    setSaving(true)
    try {
      await persistReview(mistakeLevel)
      router.push('/dashboard')
    } catch { setSaving(false) }
  }

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
        : await calcMistakeLevel(selectedWords, page.user_id, page.id)

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

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'var(--bg)' }}>⏳</div>
  if (!page)   return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'var(--bg)', color:'var(--sub)' }}>{t.review.pageNotFound}</div>

  const quickResult  = mistakeLevel ? buildResult(mistakeLevel)?.result : null
  const selectedMeta = OPTION_META.find(o => o.key === mistakeLevel)
  const selectedLevelLabel = mistakeLevel ? t.mistakeLevels[mistakeLevel].label : ''

  const options = OPTION_META.map(meta => ({
    ...meta,
    label: t.mistakeLevels[meta.key].label,
    desc:  t.mistakeLevels[meta.key].desc,
  }))

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', background:'var(--bg)' }}>

      {/* Header */}
      <div style={{ background:'var(--bg)', padding:'24px 16px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12 }}>
        <button
          onClick={() => reviewMode ? setReviewMode(null) : router.back()}
          style={backBtn}>‹</button>
        <span style={{ fontSize:17, fontWeight:700, color:'var(--cream)' }}>
          {reviewMode === 'words' ? t.review.wordsHint : t.review.headerTitle}
        </span>
        {reviewMode === 'words' && selectedKeys.size > 0 && (
          <span style={{ marginRight:'auto', fontSize:13, fontWeight:700, color:'#EF4444', background:'rgba(239,68,68,0.12)', padding:'4px 12px', borderRadius:20 }}>
            {t.review.selectedCount(selectedKeys.size)}
          </span>
        )}
      </div>

      <div style={{ flex:1, padding:'20px 16px 40px', overflowY:'auto' }}>

        {/* Hero */}
        <div style={{ background:'#161A18', border:'1px solid var(--border)', borderTop:'3px solid #38BDF8', borderRadius:20, padding:'28px 20px', textAlign:'center', marginBottom:24 }}>
          <div style={{ fontSize:80, fontWeight:800, color:'var(--cream)', lineHeight:1 }}>{page.page_number}</div>
          <div style={{ fontSize:13, color:'var(--sub)', marginTop:6 }}>{t.review.reviewedCount(page.review_count)}</div>
          <div style={{ display:'inline-block', marginTop:12, background:'rgba(56,189,248,0.12)', color:'#38BDF8', fontSize:12, fontWeight:700, padding:'4px 14px', borderRadius:20 }}>
            {t.review.intervalLabel(page.current_interval_days)}
          </div>
        </div>

        {/* ── Mode selector ── */}
        {!reviewMode && (
          <>
            <div style={{ fontSize:13, fontWeight:600, color:'var(--sub)', marginBottom:12, textAlign:'center' }}>
              {t.review.howRecord}
            </div>
            <div style={{ display:'flex', gap:10, marginBottom:8 }}>
              <button onClick={() => setReviewMode('quick')} style={{
                flex:1, padding:'18px 12px', borderRadius:14, cursor:'pointer',
                border:'1.5px solid var(--border)', background:'#0F1210',
                display:'flex', flexDirection:'column', alignItems:'center', gap:8,
                fontFamily:'Amiri, serif', transition:'all .15s',
              }}>
                <span style={{ fontSize:28 }}>⚡</span>
                <span style={{ fontSize:15, fontWeight:700, color:'var(--cream)' }}>{t.review.quickRate}</span>
                <span style={{ fontSize:11, color:'var(--sub)' }}>{t.review.quickRateDesc}</span>
              </button>
              <button onClick={() => setReviewMode('words')} style={{
                flex:1, padding:'18px 12px', borderRadius:14, cursor:'pointer',
                border:'1.5px solid var(--border)', background:'#0F1210',
                display:'flex', flexDirection:'column', alignItems:'center', gap:8,
                fontFamily:'Amiri, serif', transition:'all .15s',
              }}>
                <span style={{ fontSize:28 }}>🔤</span>
                <span style={{ fontSize:15, fontWeight:700, color:'var(--cream)' }}>{t.review.selectWords}</span>
                <span style={{ fontSize:11, color:'var(--sub)' }}>{t.review.selectWordsDesc}</span>
              </button>
            </div>
          </>
        )}

        {/* ── Quick mode ── */}
        {reviewMode === 'quick' && (
          <>
            <div style={{ fontSize:13, fontWeight:600, color:'var(--sub)', marginBottom:12, textAlign:'center' }}>
              {t.review.howWas}
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
            {quickResult && selectedMeta && (
              <div style={{ background:`${selectedMeta.color}10`, border:`1px solid ${selectedMeta.color}30`, borderRadius:14, padding:'16px 20px', textAlign:'center', marginBottom:16 }}>
                <div style={{ fontSize:12, color:'var(--sub)', marginBottom:4 }}>
                  {t.dates.locale === 'ar-EG' ? 'المراجعة القادمة' : 'Next review'}
                </div>
                <div style={{ fontSize:32, fontWeight:800, color: selectedMeta.color, lineHeight:1 }}>{quickResult.newInterval}</div>
                <div style={{ fontSize:12, color:'var(--sub)', marginTop:2 }}>
                  {t.dates.locale === 'ar-EG' ? 'يوم من الآن' : 'days from now'}
                </div>
              </div>
            )}
            <button onClick={handleConfirm} disabled={!mistakeLevel || saving} style={{
              background: mistakeLevel ? (selectedMeta?.color ?? '#22C55E') : '#252B28',
              border:'none', color: mistakeLevel ? '#000' : 'var(--sub)',
              padding:16, borderRadius:14, cursor: mistakeLevel ? 'pointer' : 'not-allowed',
              fontSize:16, fontWeight:800, width:'100%', fontFamily:'Amiri, serif', transition:'all .15s',
            }}>
              {saving ? t.review.saving : mistakeLevel ? t.review.confirmBtn(selectedLevelLabel) : t.review.chooseFirst}
            </button>
          </>
        )}

        {/* ── Words mode ── */}
        {reviewMode === 'words' && (
          <>
            {selectedWords.length > 0 && (
              <div style={{ background:'rgba(239,68,68,0.07)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:14, padding:'12px 16px', marginBottom:16 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                  <span style={{ fontSize:11, fontWeight:600, color:'#EF4444' }}>{t.review.selectedWords}</span>
                  <button onClick={() => { setSelectedKeys(new Set()); setSelectedWords([]) }}
                    style={{ background:'none', border:'none', color:'var(--sub)', fontSize:12, cursor:'pointer', fontFamily:'Amiri, serif' }}>
                    {t.review.clearWords}
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

            {confirmZero && (
              <div style={{ background:'rgba(56,189,248,0.07)', border:'1px solid rgba(56,189,248,0.25)', borderRadius:14, padding:'16px', marginBottom:16, textAlign:'center' }}>
                <div style={{ fontSize:14, color:'var(--cream)', marginBottom:12 }}>
                  {t.review.noWordsConfirm}
                </div>
                <div style={{ display:'flex', gap:10 }}>
                  <button onClick={() => handleConfirmWords(true)} style={{
                    flex:1, padding:'10px', borderRadius:10, cursor:'pointer',
                    background:'#22C55E', border:'none', color:'#000', fontSize:14, fontWeight:700, fontFamily:'Amiri, serif',
                  }}>{t.review.yesNoErrors}</button>
                  <button onClick={() => setConfirmZero(false)} style={{
                    flex:1, padding:'10px', borderRadius:10, cursor:'pointer',
                    background:'transparent', border:'1px solid var(--border)', color:'var(--sub)', fontSize:14, fontFamily:'Amiri, serif',
                  }}>{t.review.cancel}</button>
                </div>
              </div>
            )}

            <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, marginBottom:16, overflow:'hidden' }}>
              <QuranPage
                pageNumber={page.page_number}
                interactive
                selectedKeys={selectedKeys}
                onWordToggle={handleWordToggle}
              />
            </div>

            {!confirmZero && (
              <button onClick={() => handleConfirmWords()} disabled={saving} style={{
                background: saving ? '#252B28' : '#EF4444',
                border:'none', color: saving ? 'var(--sub)' : '#fff',
                padding:16, borderRadius:14, cursor: saving ? 'not-allowed' : 'pointer',
                fontSize:16, fontWeight:800, width:'100%', fontFamily:'Amiri, serif', transition:'all .15s',
              }}>
                {saving
                  ? t.review.saving
                  : selectedWords.length > 0
                    ? t.review.saveMistakes(selectedWords.length)
                    : t.review.confirmNoErrors}
              </button>
            )}
          </>
        )}

      </div>
    </div>
  )
}

const backBtn: React.CSSProperties = { width:36, height:36, borderRadius:10, background:'transparent', border:'1px solid var(--border)', color:'var(--sub)', cursor:'pointer', fontSize:18 }
