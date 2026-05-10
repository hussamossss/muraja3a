'use client'

import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { todayStr, addDays } from '@/lib/spaced-rep'
import { scheduleReview, MISTAKE_TO_STRENGTH, createInitialState } from '@/lib/quran-scheduler'
import { loadPageWords } from '@/lib/quran-data'
import { calcMistakeLevel, saveWordMistakes } from '@/lib/word-scorer'
import { uid } from '@/lib/utils'
import type { ReviewStage, InitialMemoryState, MistakeLevel, QuranWord } from '@/lib/types'
import QuranPage from '@/components/QuranPage'
import { useI18n } from '@/lib/i18n'

type Preset = {
  stage: ReviewStage; stability: number; difficulty: number
  warmUp: number; baseInterval: number; color: string
}

const PRESET_BASE: Record<InitialMemoryState, Omit<Preset, 'label'|'desc'>> = {
  new:          { stage:'learning', stability:1,  difficulty:0.3,  warmUp:0, baseInterval:1,  color:'#22C55E' },
  strong_old:   { stage:'mature',   stability:35, difficulty:0.25, warmUp:5, baseInterval:21, color:'#22C55E' },
  good_old:     { stage:'review',   stability:21, difficulty:0.4,  warmUp:5, baseInterval:14, color:'#38BDF8' },
  hesitant_old: { stage:'fragile',  stability:7,  difficulty:0.55, warmUp:5, baseInterval:3,  color:'#F97316' },
  weak_old:     { stage:'learning', stability:1,  difficulty:0.75, warmUp:0, baseInterval:1,  color:'#EF4444' },
}
const OLD_OPTIONS: InitialMemoryState[] = ['strong_old', 'good_old', 'hesitant_old', 'weak_old']

const REVIEWED_TODAY_PRESET: Preset & { label: string; desc: string } = {
  stage:'review', stability:14, difficulty:0.4, warmUp:5, baseInterval:7, label:'', desc:'', color:'',
}

const STATE_CAP: Record<string, number> = { strong_old:30, good_old:21, hesitant_old:7, weak_old:3 }

function calcAgeCap(memorizedAt: string, today: string): number {
  const diffDays = Math.round((new Date(today).getTime() - new Date(memorizedAt + '-01').getTime()) / 86400000)
  if (diffDays < 7)   return 7
  if (diffDays < 30)  return 14
  if (diffDays < 180) return 21
  return 30
}
function calcFinalCap(state: InitialMemoryState, memorizedAt: string, today: string): number {
  const stateCap = STATE_CAP[state] ?? 21
  if (!memorizedAt) return stateCap
  return Math.min(stateCap, calcAgeCap(memorizedAt, today))
}
function calcNextDate(baseInterval: number, lastReviewedAt: string, today: string, state: InitialMemoryState): string {
  if (!lastReviewedAt) return addDays(today, baseInterval)
  const targetDate = addDays(lastReviewedAt, baseInterval)
  if (targetDate < today) {
    if (state === 'strong_old' || state === 'good_old') return addDays(today, 1)
    return today
  }
  return targetDate
}

export default function AddPage() {
  const router = useRouter()
  const { t }  = useI18n()

  // Translated presets (inside component to access t())
  const PRESETS: Record<InitialMemoryState, Preset & { label: string; desc: string }> = {
    new:          { ...PRESET_BASE.new,          label: t('presetNew'),         desc: t('presetNewDesc')         },
    strong_old:   { ...PRESET_BASE.strong_old,   label: t('presetStrongOld'),   desc: t('presetStrongOldDesc')   },
    good_old:     { ...PRESET_BASE.good_old,     label: t('presetGoodOld'),     desc: t('presetGoodOldDesc')     },
    hesitant_old: { ...PRESET_BASE.hesitant_old, label: t('presetHesitantOld'), desc: t('presetHesitantOldDesc') },
    weak_old:     { ...PRESET_BASE.weak_old,     label: t('presetWeakOld'),     desc: t('presetWeakOldDesc')     },
  }
  const REVIEW_OPTIONS: { key: MistakeLevel; label: string; emoji: string; color: string }[] = [
    { key:'perfect',   label:t('optPerfect'),   emoji:'🌟', color:'#22C55E' },
    { key:'minor',     label:t('optMinor'),     emoji:'✅', color:'#84CC16' },
    { key:'impactful', label:t('optImpactful'), emoji:'⚠️', color:'#F97316' },
    { key:'few',       label:t('optFew'),       emoji:'🔸', color:'#FB923C' },
    { key:'many',      label:t('optMany'),      emoji:'❌', color:'#EF4444' },
    { key:'lapse',     label:t('optLapse'),     emoji:'🔄', color:'#7C3AED' },
  ]

  const [value, setValue]           = useState('')
  const [mode, setMode]             = useState<'new' | 'old'>('new')
  const [memState, setMemState]     = useState<InitialMemoryState>('strong_old')
  const [lastDate, setLastDate]     = useState('')
  const [reviewedToday,    setReviewedToday]    = useState(false)
  const [todayLevel,       setTodayLevel]       = useState<MistakeLevel | null>(null)
  const [memorizedAt,      setMemorizedAt]      = useState('')
  const [loading,          setLoading]          = useState(false)
  const [error,            setError]            = useState('')
  const [addReviewMode,    setAddReviewMode]    = useState<'quick' | 'words' | null>(null)
  const [addSelectedKeys,  setAddSelectedKeys]  = useState<Set<string>>(new Set())
  const [addSelectedWords, setAddSelectedWords] = useState<QuranWord[]>([])
  const [addAllWords,      setAddAllWords]      = useState<QuranWord[]>([])

  const pageNum   = parseInt(value)
  const validPage = !isNaN(pageNum) && pageNum >= 1 && pageNum <= 604

  useEffect(() => {
    if (addReviewMode === 'words' && validPage) {
      loadPageWords(pageNum).then(setAddAllWords).catch(console.error)
    }
  }, [addReviewMode, pageNum, validPage])

  const handleWordToggle = useCallback((word: QuranWord) => {
    const key = `${word.s}:${word.a}:${word.wi}`
    setAddSelectedKeys(prev => { const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next })
    setAddSelectedWords(prev => {
      const exists = prev.some(w => w.s === word.s && w.a === word.a && w.wi === word.wi)
      return exists ? prev.filter(w => !(w.s === word.s && w.a === word.a && w.wi === word.wi)) : [...prev, word]
    })
  }, [])

  const saveDisabled = loading
    || (reviewedToday && !addReviewMode)
    || (reviewedToday && addReviewMode === 'quick' && !todayLevel)

  const saveLabel = loading
    ? t('savingBtn')
    : (reviewedToday && !addReviewMode)
      ? t('addChooseMethod')
      : (reviewedToday && addReviewMode === 'quick' && !todayLevel)
        ? t('addChooseRating')
        : t('addSaveBtn')

  function handleModeChange(m: 'new' | 'old') {
    setMode(m); setReviewedToday(false); setTodayLevel(null)
    setLastDate(''); setMemorizedAt(''); setAddReviewMode(null)
    setAddSelectedKeys(new Set()); setAddSelectedWords([])
  }

  async function handleAdd() {
    const num = parseInt(value)
    if (!value || isNaN(num) || num < 1 || num > 604) { setError(t('addErrRange')); return }
    if (reviewedToday && !addReviewMode) return
    if (reviewedToday && addReviewMode === 'quick' && !todayLevel) return

    setLoading(true); setError('')
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) { router.push('/auth'); return }

      const { data: existing } = await supabase.from('pages').select('id').eq('user_id', user.id).eq('page_number', num).maybeSingle()
      if (existing) { setError(t('addErrExists')); setLoading(false); return }

      const today       = todayStr()
      const activeState: InitialMemoryState = mode === 'new' ? 'new' : (reviewedToday ? 'good_old' : memState)
      const preset      = (mode === 'old' && reviewedToday) ? REVIEWED_TODAY_PRESET : PRESETS[activeState]
      const pageId      = uid()

      if (mode === 'old' && reviewedToday && addReviewMode) {
        const resolvedLevel: MistakeLevel = addReviewMode === 'words'
          ? await calcMistakeLevel(addSelectedWords, user.id, pageId)
          : (todayLevel ?? 'perfect')
        const virtualPage = {
          ...createInitialState(),
          id: pageId, user_id: user.id, page_number: num, created_at: today,
          next_review_date: today, last_reviewed_at: lastDate || null,
          current_interval_days: preset.baseInterval, last_strength: null as null,
          review_count: 0, last_mistake_level: null as null, initial_memory_state: activeState,
          stability_days: preset.stability, difficulty: preset.difficulty,
          review_stage: preset.stage, warm_up_count: preset.warmUp,
          lapses: 0, consecutive_good: 0, risk_score: 0,
          memorized_at: memorizedAt || null, last_read_at: null, reading_count: 0,
        }
        const result        = scheduleReview(virtualPage, resolvedLevel, today)
        const finalCap      = calcFinalCap(activeState, memorizedAt, today)
        const finalInterval = Math.min(result.newInterval, finalCap)
        const finalNextDate = addDays(today, finalInterval)

        const { error: pageErr } = await supabase.from('pages').insert({
          id: pageId, user_id: user.id, page_number: num, created_at: today,
          last_reviewed_at: today, next_review_date: finalNextDate,
          current_interval_days: finalInterval, last_strength: null, review_count: 1,
          last_mistake_level: resolvedLevel, initial_memory_state: activeState,
          memorized_at: memorizedAt || null, stability_days: result.stabilityAfter,
          difficulty: result.difficultyAfter, review_stage: result.stageAfter,
          lapses: result.newLapses, risk_score: result.riskScore,
          warm_up_count: result.newWarmUpCount, consecutive_good: result.newConsecutiveGood,
        })
        if (pageErr) throw pageErr

        const logId = uid()
        const { error: logErr } = await supabase.from('review_logs').insert({
          id: logId, user_id: user.id, page_id: pageId, reviewed_at: today,
          next_review_date: finalNextDate, previous_interval_days: preset.baseInterval,
          new_interval_days: finalInterval, mistake_level: resolvedLevel,
          strength: MISTAKE_TO_STRENGTH[resolvedLevel], stability_before: preset.stability,
          stability_after: result.stabilityAfter, retrievability_before: result.retrievabilityBefore,
        })
        if (logErr) { console.error('[add] review_log insert failed:', logErr.message); router.push('/dashboard?added=1'); return }

        if (addReviewMode === 'words' && addSelectedWords.length > 0) {
          const { error: we } = await saveWordMistakes({ userId: user.id, pageId, pageNumber: num, reviewLogId: logId, selectedWords: addSelectedWords, allWords: addAllWords })
          if (we) console.error('[add] word_mistakes failed:', we)
        }
        router.push('/dashboard?added=1')
        return
      }

      const lastReviewedAt = (mode === 'old' && lastDate) ? lastDate : null
      const rawNextDate    = calcNextDate(preset.baseInterval, lastDate, today, activeState)
      const finalCap       = mode === 'old' ? calcFinalCap(activeState, memorizedAt, today) : Infinity
      const daysFromToday  = Math.max(0, Math.round((new Date(rawNextDate).getTime() - new Date(today).getTime()) / 86400000))
      const cappedDays     = Math.min(daysFromToday, finalCap)
      const finalNextDate  = addDays(today, cappedDays)
      const finalInterval  = lastReviewedAt
        ? Math.max(1, Math.round((new Date(finalNextDate).getTime() - new Date(lastReviewedAt).getTime()) / 86400000))
        : Math.max(1, cappedDays || preset.baseInterval)

      const { error: insertErr } = await supabase.from('pages').insert({
        id: pageId, user_id: user.id, page_number: num, created_at: today,
        last_reviewed_at: lastReviewedAt, next_review_date: finalNextDate,
        current_interval_days: finalInterval, last_strength: null, review_count: 0,
        last_mistake_level: null, stability_days: preset.stability, difficulty: preset.difficulty,
        review_stage: preset.stage, lapses: 0, risk_score: 0,
        warm_up_count: preset.warmUp, consecutive_good: 0, initial_memory_state: activeState,
        memorized_at: mode === 'old' && memorizedAt ? memorizedAt : null,
      })
      if (insertErr) throw insertErr
      router.push('/dashboard?added=1')

    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('addErrGeneric'))
    } finally {
      setLoading(false)
    }
  }

  const today = todayStr()

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', background:'var(--bg)' }}>
      <div style={{ background:'var(--bg)', padding:'24px 16px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12 }}>
        <button onClick={() => router.back()} style={backBtn}>‹</button>
        <span style={{ fontSize:17, fontWeight:700, color:'var(--cream)' }}>{t('addTitle')}</span>
      </div>

      <div style={{ flex:1, padding:'24px 16px 48px', overflowY:'auto' }}>
        <div style={{ maxWidth:480, margin:'0 auto', display:'flex', flexDirection:'column', gap:20 }}>

          {/* Page number */}
          <div style={card}>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
              <div style={{ fontSize:32 }}>📖</div>
              <div style={{ fontSize:17, fontWeight:700, color:'var(--cream)' }}>{t('addPageNum')}</div>
              <div style={{ fontSize:12, color:'var(--sub)' }}>{t('addPageRange')}</div>
              <input
                type="number" min="1" max="604"
                value={value}
                onChange={e => { setValue(e.target.value); setError('') }}
                onKeyDown={e => e.key === 'Enter' && !saveDisabled && handleAdd()}
                placeholder={t('addPagePlaceholder')}
                autoFocus
                style={{ background:'#0F1210', border:`1.5px solid ${error ? 'var(--red)' : 'var(--border)'}`, borderRadius:12, padding:14, fontSize:28, color:'var(--cream)', textAlign:'center', width:'100%', outline:'none', fontFamily:'Amiri, serif' }}
              />
              {error && <div style={{ fontSize:12, color:'var(--red)', textAlign:'center' }}>{error}</div>}
            </div>
          </div>

          {/* Mode toggle */}
          <div>
            <div style={{ fontSize:12, color:'var(--sub)', marginBottom:10, fontWeight:600 }}>{t('addStatus')}</div>
            <div style={{ display:'flex', gap:8 }}>
              {(['new', 'old'] as const).map(m => {
                const active = mode === m
                return (
                  <button key={m} onClick={() => handleModeChange(m)} style={{ flex:1, padding:'12px 0', borderRadius:12, border:`1.5px solid ${active ? (m === 'new' ? '#22C55E' : '#38BDF8') : 'var(--border)'}`, background: active ? (m === 'new' ? '#22C55E18' : '#38BDF818') : '#0F1210', color: active ? (m === 'new' ? '#22C55E' : '#38BDF8') : 'var(--sub)', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'Amiri, serif', transition:'all .15s' }}>
                    {m === 'new' ? t('addNewPage') : t('addOldPage')}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Memory state options */}
          {mode === 'old' && !reviewedToday && (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              <div style={{ fontSize:12, color:'var(--sub)', marginBottom:2, fontWeight:600 }}>{t('addMemState')}</div>
              {OLD_OPTIONS.map(key => {
                const p   = PRESETS[key]
                const sel = memState === key
                return (
                  <button key={key} onClick={() => setMemState(key)} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', borderRadius:12, cursor:'pointer', border:`1.5px solid ${sel ? p.color : 'var(--border)'}`, background: sel ? `${p.color}12` : '#0F1210', fontFamily:'Amiri, serif', textAlign:'right', width:'100%', transition:'all .15s' }}>
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

          {/* Reviewed today toggle */}
          {mode === 'old' && (
            <button
              onClick={() => { setReviewedToday(p => !p); setTodayLevel(null); setAddReviewMode(null); setAddSelectedKeys(new Set()); setAddSelectedWords([]) }}
              style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', borderRadius:12, cursor:'pointer', border:`1.5px solid ${reviewedToday ? '#38BDF8' : 'var(--border)'}`, background: reviewedToday ? '#38BDF812' : '#0F1210', fontFamily:'Amiri, serif', textAlign:'right', width:'100%', transition:'all .15s' }}>
              <div style={{ width:20, height:20, borderRadius:6, flexShrink:0, border:`1.5px solid ${reviewedToday ? '#38BDF8' : 'var(--border)'}`, background: reviewedToday ? '#38BDF8' : 'transparent', display:'flex', alignItems:'center', justifyContent:'center' }}>
                {reviewedToday && <span style={{ color:'#000', fontSize:13, fontWeight:800 }}>✓</span>}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:700, color: reviewedToday ? '#38BDF8' : 'var(--cream)' }}>{t('addReviewedToday')}</div>
                <div style={{ fontSize:11, color:'var(--sub)', marginTop:2 }}>{t('addReviewedTodaySub')}</div>
              </div>
            </button>
          )}

          {/* Mode selector when reviewedToday */}
          {mode === 'old' && reviewedToday && !addReviewMode && (
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => setAddReviewMode('quick')} style={{ flex:1, padding:'16px 10px', borderRadius:12, cursor:'pointer', border:'1.5px solid var(--border)', background:'#0F1210', display:'flex', flexDirection:'column', alignItems:'center', gap:6, fontFamily:'Amiri, serif', transition:'all .15s' }}>
                <span style={{ fontSize:24 }}>⚡</span>
                <span style={{ fontSize:13, fontWeight:700, color:'var(--cream)' }}>{t('addQuickMode')}</span>
                <span style={{ fontSize:10, color:'var(--sub)' }}>{t('addQuickModeDesc')}</span>
              </button>
              <button onClick={() => setAddReviewMode('words')} disabled={!validPage} style={{ flex:1, padding:'16px 10px', borderRadius:12, cursor: validPage ? 'pointer' : 'not-allowed', border:'1.5px solid var(--border)', background:'#0F1210', display:'flex', flexDirection:'column', alignItems:'center', gap:6, fontFamily:'Amiri, serif', transition:'all .15s', opacity: validPage ? 1 : 0.4 }}>
                <span style={{ fontSize:24 }}>🔤</span>
                <span style={{ fontSize:13, fontWeight:700, color:'var(--cream)' }}>{t('addWordsMode')}</span>
                <span style={{ fontSize:10, color:'var(--sub)' }}>{t('addWordsModeDesc')}</span>
              </button>
            </div>
          )}

          {/* Quick mode options */}
          {mode === 'old' && reviewedToday && addReviewMode === 'quick' && (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2 }}>
                <button onClick={() => setAddReviewMode(null)} style={{ background:'none', border:'none', color:'var(--sub)', cursor:'pointer', fontSize:13, fontFamily:'Amiri, serif' }}>{t('addChange')}</button>
                <span style={{ fontSize:12, color:'var(--sub)', fontWeight:600 }}>{t('addHowWas')}</span>
              </div>
              {REVIEW_OPTIONS.map(opt => {
                const sel = todayLevel === opt.key
                return (
                  <button key={opt.key} onClick={() => setTodayLevel(opt.key)} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', borderRadius:12, cursor:'pointer', border:`1.5px solid ${sel ? opt.color : 'var(--border)'}`, background: sel ? `${opt.color}12` : '#0F1210', fontFamily:'Amiri, serif', textAlign:'right', width:'100%', transition:'all .15s' }}>
                    <span style={{ fontSize:20 }}>{opt.emoji}</span>
                    <span style={{ flex:1, fontSize:14, fontWeight:700, color: sel ? opt.color : 'var(--cream)' }}>{opt.label}</span>
                    {sel && <span style={{ color: opt.color, fontSize:16 }}>✓</span>}
                  </button>
                )
              })}
            </div>
          )}

          {/* Words mode */}
          {mode === 'old' && reviewedToday && addReviewMode === 'words' && (
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                <button onClick={() => { setAddReviewMode(null); setAddSelectedKeys(new Set()); setAddSelectedWords([]) }} style={{ background:'none', border:'none', color:'var(--sub)', cursor:'pointer', fontSize:13, fontFamily:'Amiri, serif' }}>{t('addChange')}</button>
                <span style={{ fontSize:12, color:'var(--sub)', fontWeight:600 }}>
                  {addSelectedWords.length > 0 ? `${addSelectedWords.length} ${t('wordsLabel')}` : t('addWordTap')}
                </span>
              </div>
              {addSelectedWords.length > 0 && (
                <div style={{ display:'flex', flexWrap:'wrap', gap:6, direction:'rtl', marginBottom:10 }}>
                  {addSelectedWords.map(w => (
                    <span key={`${w.s}:${w.a}:${w.wi}`} onClick={() => handleWordToggle(w)} style={{ fontFamily:'"Amiri Quran", serif', fontSize:16, color:'#EF4444', background:'rgba(239,68,68,0.12)', padding:'2px 8px', borderRadius:16, cursor:'pointer' }}>
                      {w.t}
                    </span>
                  ))}
                </div>
              )}
              <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, overflow:'hidden' }}>
                <QuranPage pageNumber={pageNum} interactive selectedKeys={addSelectedKeys} onWordToggle={handleWordToggle} />
              </div>
            </div>
          )}

          {/* Last review date */}
          {mode === 'old' && (
            <div>
              <div style={{ fontSize:12, color:'var(--sub)', marginBottom:8, fontWeight:600 }}>
                {reviewedToday ? t('addLastReviewBefore') : t('addLastReview')}
                {' '}<span style={{ fontWeight:400 }}>({t('optional')})</span>
              </div>
              <input type="date" max={today} value={lastDate} onChange={e => setLastDate(e.target.value)} style={{ background:'#0F1210', border:'1px solid var(--border)', borderRadius:10, padding:'10px 12px', color: lastDate ? 'var(--cream)' : 'var(--sub)', width:'100%', outline:'none', fontSize:14, fontFamily:'Amiri, serif', boxSizing:'border-box' }} />
            </div>
          )}

          {/* Memorized at */}
          {mode === 'old' && (
            <div>
              <div style={{ fontSize:12, color:'var(--sub)', marginBottom:8, fontWeight:600 }}>
                {t('addMemorizedAt')} <span style={{ fontWeight:400 }}>({t('optional')})</span>
              </div>
              <input type="month" max={today.slice(0, 7)} value={memorizedAt} onChange={e => setMemorizedAt(e.target.value)} style={{ background:'#0F1210', border:'1px solid var(--border)', borderRadius:10, padding:'10px 12px', color: memorizedAt ? 'var(--cream)' : 'var(--sub)', width:'100%', outline:'none', fontSize:14, fontFamily:'Amiri, serif', boxSizing:'border-box' }} />
            </div>
          )}

          {/* Save button */}
          <button onClick={handleAdd} disabled={saveDisabled} style={{ background: saveDisabled ? '#252B28' : '#16A34A', border:'none', color: saveDisabled ? 'var(--sub)' : '#fff', padding:14, borderRadius:14, cursor: saveDisabled ? 'not-allowed' : 'pointer', fontSize:15, fontWeight:700, width:'100%', fontFamily:'Amiri, serif', transition:'all .15s' }}>
            {saveLabel}
          </button>

        </div>
      </div>
    </div>
  )
}

const backBtn: React.CSSProperties = { width:36, height:36, borderRadius:10, background:'transparent', border:'1px solid var(--border)', color:'var(--sub)', cursor:'pointer', fontSize:18 }
const card: React.CSSProperties    = { background:'var(--card)', border:'1px solid var(--border)', borderRadius:20, padding:'24px 20px' }
