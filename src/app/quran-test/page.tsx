'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import QuranPage from '@/components/QuranPage'
import { loadPageWords } from '@/lib/quran-data'
import { saveWordMistakes, calcMistakeLevel } from '@/lib/word-scorer'
import { supabase } from '@/lib/supabase'
import type { QuranWord } from '@/lib/types'

const TEST_PAGE = 604

export default function QuranTestPage() {
  const router = useRouter()

  // auth
  const [userId,  setUserId]  = useState<string | null>(null)
  const [pageId,  setPageId]  = useState<string | null>(null)
  const [pageNum, setPageNum] = useState<number | null>(null)

  // word selection
  const [selectedKeys,  setSelectedKeys]  = useState<Set<string>>(new Set())
  const [selectedWords, setSelectedWords] = useState<QuranWord[]>([])
  const [allWords,      setAllWords]      = useState<QuranWord[]>([])

  // save state
  const [saving,    setSaving]    = useState(false)
  const [saveResult, setSaveResult] = useState<string | null>(null)

  // load auth + first page + all words
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      setUserId(session.user.id)
      supabase.from('pages').select('id, page_number')
        .eq('user_id', session.user.id)
        .eq('page_number', TEST_PAGE)
        .maybeSingle()
        .then(({ data }) => {
          if (data) { setPageId(data.id); setPageNum(data.page_number) }
        })
    })
    loadPageWords(TEST_PAGE).then(setAllWords)
  }, [])

  const handleToggle = useCallback((word: QuranWord) => {
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

  function clearAll() {
    setSelectedKeys(new Set())
    setSelectedWords([])
    setSaveResult(null)
  }

  async function handleSave() {
    if (!userId) {
      setSaveResult('⚠️ غير مسجّل دخول')
      return
    }
    if (!pageId || !pageNum) {
      setSaveResult('⚠️ أضف صفحة 604 أولاً لاختبار الحفظ')
      return
    }
    setSaving(true); setSaveResult(null)
    try {
      const level = await calcMistakeLevel(selectedWords, userId)
      const { error } = await saveWordMistakes({
        userId,
        pageId,
        pageNumber:    pageNum,
        reviewLogId:   null,
        selectedWords,
        allWords,
      })
      if (error) throw new Error(error)
      const count = selectedWords.length
      setSelectedKeys(new Set())
      setSelectedWords([])
      setSaveResult(`✅ حُفظت ${count} كلمة — mistake_level: ${level}`)
    } catch (e: unknown) {
      setSaveResult('❌ ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', flexDirection:'column' }}>

      {/* Header */}
      <div style={{ background:'var(--bg)', padding:'24px 16px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12 }}>
        <button onClick={() => router.back()} style={backBtn}>‹</button>
        <span style={{ fontSize:17, fontWeight:700, color:'var(--cream)' }}>
          Phase 3 — حفظ الكلمات
        </span>
        {selectedKeys.size > 0 && (
          <span style={{ marginRight:'auto', fontSize:13, fontWeight:700, color:'#EF4444', background:'rgba(239,68,68,0.12)', padding:'4px 12px', borderRadius:20 }}>
            {selectedKeys.size} كلمة
          </span>
        )}
      </div>

      <div style={{ flex:1, padding:'16px 16px 40px', overflowY:'auto' }}>

        {/* Debug info */}
        <div style={{ fontSize:11, color:'var(--sub)', marginBottom:12, direction:'ltr' }}>
          userId: {userId?.slice(0,8) ?? '—'} | pageId: {pageId?.slice(0,8) ?? '—'} | pageNum: {pageNum ?? '—'}
        </div>

        {/* Selected words */}
        {selectedWords.length > 0 && (
          <div style={{ background:'rgba(239,68,68,0.07)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:14, padding:'12px 16px', marginBottom:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <span style={{ fontSize:11, fontWeight:600, color:'#EF4444' }}>الكلمات المحددة</span>
              <button onClick={clearAll} style={{ background:'none', border:'none', color:'var(--sub)', fontSize:12, cursor:'pointer', fontFamily:'Amiri, serif' }}>
                مسح ✕
              </button>
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, direction:'rtl' }}>
              {selectedWords.map(w => (
                <span key={`${w.s}:${w.a}:${w.wi}`} onClick={() => handleToggle(w)}
                  style={{ fontFamily:'"Amiri Quran", serif', fontSize:18, color:'#EF4444', background:'rgba(239,68,68,0.12)', padding:'3px 10px', borderRadius:20, cursor:'pointer' }}>
                  {w.t}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Save result */}
        {saveResult && (
          <div style={{ fontSize:13, padding:'10px 14px', borderRadius:10, marginBottom:16,
            background: saveResult.startsWith('✅') ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
            color: saveResult.startsWith('✅') ? '#22C55E' : '#EF4444',
            border: `1px solid ${saveResult.startsWith('✅') ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
          }}>
            {saveResult}
          </div>
        )}

        {/* Warning: page 604 not added */}
        {userId && !pageId && (
          <div style={{ fontSize:13, color:'#F97316', background:'rgba(249,115,22,0.08)', border:'1px solid rgba(249,115,22,0.2)', borderRadius:10, padding:'10px 14px', marginBottom:12 }}>
            ⚠️ أضف صفحة 604 أولاً لاختبار الحفظ
          </div>
        )}

        {/* Save button */}
        <button onClick={handleSave} disabled={saving || selectedWords.length === 0 || !pageId}
          style={{
            background: selectedWords.length > 0 ? '#EF4444' : '#252B28',
            border:'none', color: selectedWords.length > 0 ? '#fff' : 'var(--sub)',
            padding:'12px 0', borderRadius:12, fontSize:14, fontWeight:700,
            width:'100%', fontFamily:'Amiri, serif', cursor: selectedWords.length > 0 ? 'pointer' : 'not-allowed',
            marginBottom:20, transition:'all .15s',
          }}>
          {saving ? 'جارٍ الحفظ...' : `حفظ ${selectedWords.length} كلمة في قاعدة البيانات`}
        </button>

        {/* Quran page */}
        <div style={section}>
          <div style={sectionTitle}>صفحة {TEST_PAGE} — حدد الكلمات الخاطئة</div>
          <QuranPage pageNumber={TEST_PAGE} interactive selectedKeys={selectedKeys} onWordToggle={handleToggle} />
        </div>

      </div>
    </div>
  )
}

const backBtn: React.CSSProperties = { width:36, height:36, borderRadius:10, background:'transparent', border:'1px solid var(--border)', color:'var(--sub)', cursor:'pointer', fontSize:18 }
const section: React.CSSProperties = { background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, overflow:'hidden' }
const sectionTitle: React.CSSProperties = { fontSize:12, fontWeight:600, color:'var(--sub)', padding:'10px 16px', borderBottom:'1px solid var(--border)', letterSpacing:0.5 }
