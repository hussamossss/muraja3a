export type Strength = 'strong' | 'medium' | 'weak'

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
}
