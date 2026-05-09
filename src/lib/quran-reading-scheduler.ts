import type { Page } from './types'
import { addDays } from './spaced-rep'

// ── Result ────────────────────────────────────────────────────────────────────
export interface ReadingResult {
  nextReviewDate:  string   // today + postponeDays
  postponeDays:    number   // 1 | 2 | 3 — never more
  newRiskScore:    number   // risk_score - 0.05, floored at 0
  newReadingCount: number   // reading_count + 1
  lastReadAt:      string   // today

  // Unchanged fields — listed explicitly so callers don't guess
  stabilityDays:        number | null
  difficulty:           number
  reviewStage:          Page['review_stage']
  currentIntervalDays:  number
  reviewCount:          number
}

// ── Helper ────────────────────────────────────────────────────────────────────
function r2(n: number): number {
  return Math.round(n * 100) / 100
}

// ── Engine ────────────────────────────────────────────────────────────────────
export function scheduleReadingReview(page: Page, today: string): ReadingResult {
  // Days the page is overdue (0 if due today or in the future)
  const overdueDays = Math.max(0, Math.round(
    (new Date(today + 'T00:00:00').getTime() -
     new Date(page.next_review_date + 'T00:00:00').getTime()) / 86400000
  ))

  // The more overdue, the smaller the postponement:
  // very overdue pages need recitation urgently — reading barely helps.
  const postponeDays: 1 | 2 | 3 =
    overdueDays >= 7 ? 1 :
    overdueDays >= 3 ? 2 : 3

  const newRiskScore = r2(Math.max(0, (page.risk_score ?? 0) - 0.05))

  return {
    nextReviewDate:      addDays(today, postponeDays),
    postponeDays,
    newRiskScore,
    newReadingCount:     (page.reading_count ?? 0) + 1,
    lastReadAt:          today,

    // Carry through unchanged
    stabilityDays:       page.stability_days,
    difficulty:          page.difficulty,
    reviewStage:         page.review_stage,
    currentIntervalDays: page.current_interval_days,
    reviewCount:         page.review_count,
  }
}
