import type { QuranWord, MistakeLevel } from './types'
import { supabase } from './supabase'
import { todayStr } from './spaced-rep'

// ── mistake_level from selected word count (pure, no DB) ─────────────────────
// Word history is still saved separately for future analytics — it does not
// affect the score here, keeping the two concerns cleanly apart.
export function calcMistakeLevel(selectedWords: QuranWord[]): MistakeLevel {
  const n = selectedWords.length
  if (n === 0) return 'perfect'
  if (n === 1) return 'minor'
  if (n === 2) return 'impactful'
  if (n <= 4)  return 'few'
  if (n <= 6)  return 'many'
  return 'lapse'
}

// ── 2 words before + 2 words after a target word ─────────────────────────────
export function buildContext(
  allWords: QuranWord[],
  word: QuranWord,
): { before: string; after: string } {
  const idx = allWords.findIndex(
    w => w.s === word.s && w.a === word.a && w.wi === word.wi
  )
  if (idx === -1) return { before: '', after: '' }
  const before = allWords.slice(Math.max(0, idx - 2), idx).map(w => w.t).join(' ')
  const after  = allWords.slice(idx + 1, idx + 3).map(w => w.t).join(' ')
  return { before, after }
}

// ── save selected words to word_mistakes ─────────────────────────────────────
export async function saveWordMistakes(params: {
  userId:        string
  pageId:        string
  pageNumber:    number
  reviewLogId:   string | null
  selectedWords: QuranWord[]
  allWords:      QuranWord[]
}): Promise<{ error: string | null }> {
  const { userId, pageId, pageNumber, reviewLogId, selectedWords, allWords } = params
  if (selectedWords.length === 0) return { error: null }

  const today = todayStr()
  const rows = selectedWords.map(w => {
    const { before, after } = buildContext(allWords, w)
    return {
      user_id:        userId,
      page_id:        pageId,
      review_log_id:  reviewLogId,
      page_number:    pageNumber,
      surah_number:   w.s,
      ayah_number:    w.a,
      word_index:     w.wi,
      word_text:      w.t,
      normalized_word: w.n,
      context_before: before || null,
      context_after:  after  || null,
      created_at:     today,
    }
  })

  const { error } = await supabase.from('word_mistakes').insert(rows)
  return { error: error?.message ?? null }
}
