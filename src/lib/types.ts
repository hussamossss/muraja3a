export type Strength = 'strong' | 'medium' | 'weak'  // deprecated — kept for backward compat

export type MistakeLevel =
  | 'perfect'     // لا أخطاء
  | 'minor'       // خطأ بسيط
  | 'impactful'   // خطأ مؤثر
  | 'few'         // 2-3 أخطاء
  | 'many'        // 4-6 أخطاء
  | 'lapse'       // نسيت تقريبًا

export type ReviewStage = 'learning' | 'review' | 'mature' | 'fragile'

export type InitialMemoryState = 'new' | 'strong_old' | 'good_old' | 'hesitant_old' | 'weak_old'

// ── Quran word data (static JSON, not user data) ──────────────────────────────
export interface QuranWord {
  s:  number  // surah number
  a:  number  // ayah number
  wi: number  // word index within ayah (1-based)
  t:  string  // text_uthmani — Uthmani script with diacritics
  n:  string  // normalized — without diacritics, for comparison
  ln: number  // line number within the page (for mushaf-accurate rendering)
}

export interface WordMistake {
  id:              string
  user_id:         string
  page_id:         string
  review_log_id:   string | null
  page_number:     number
  surah_number:    number
  ayah_number:     number
  word_index:      number
  word_text:       string
  normalized_word: string
  context_before:  string | null
  context_after:   string | null
  created_at:      string
}

export interface Page {
  id: string
  user_id: string
  page_number: number
  created_at: string
  last_reviewed_at: string | null
  next_review_date: string
  current_interval_days: number
  last_strength: Strength | null
  review_count: number
  // Quran Memory Scheduler v1
  stability_days:    number | null
  difficulty:        number
  review_stage:      ReviewStage
  lapses:            number
  risk_score:        number
  warm_up_count:     number
  consecutive_good:  number
  last_mistake_level:    MistakeLevel | null
  initial_memory_state:  InitialMemoryState
  memorized_at:          string | null
}

export interface ReviewLog {
  id: string
  user_id: string
  page_id: string
  reviewed_at: string
  strength: Strength
  previous_interval_days: number
  new_interval_days: number
  next_review_date: string
  // Quran Memory Scheduler v1
  mistake_level:          MistakeLevel | null
  stability_before:       number | null
  stability_after:        number | null
  retrievability_before:  number | null
}
