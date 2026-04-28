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
