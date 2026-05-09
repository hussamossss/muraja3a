import { describe, it, expect } from 'vitest'
import { scheduleReadingReview } from './quran-reading-scheduler'
import type { Page } from './types'

const TODAY = '2026-05-09'

function makePage(overrides: Partial<Page> = {}): Page {
  return {
    id:                    'test-id',
    user_id:               'test-user',
    page_number:           1,
    created_at:            '2026-01-01',
    last_reviewed_at:      null,
    next_review_date:      TODAY,
    current_interval_days: 14,
    last_strength:         null,
    review_count:          5,
    stability_days:        14,
    difficulty:            0.3,
    review_stage:          'review',
    lapses:                0,
    risk_score:            0.2,
    warm_up_count:         5,
    consecutive_good:      3,
    last_mistake_level:    null,
    initial_memory_state:  'good_old',
    memorized_at:          null,
    last_read_at:          null,
    reading_count:         0,
    ...overrides,
  }
}

// ── Postponement rules ────────────────────────────────────────────────────────

describe('scheduleReadingReview — postponement', () => {
  it('due today → postpone 3 days', () => {
    const page = makePage({ next_review_date: TODAY })
    const r = scheduleReadingReview(page, TODAY)
    expect(r.postponeDays).toBe(3)
    expect(r.nextReviewDate).toBe('2026-05-12')
  })

  it('overdue 2 days → postpone 3 days', () => {
    const page = makePage({ next_review_date: '2026-05-07' })
    const r = scheduleReadingReview(page, TODAY)
    expect(r.postponeDays).toBe(3)
  })

  it('overdue 3 days → postpone 2 days', () => {
    const page = makePage({ next_review_date: '2026-05-06' })
    const r = scheduleReadingReview(page, TODAY)
    expect(r.postponeDays).toBe(2)
  })

  it('overdue 5 days → postpone 2 days', () => {
    const page = makePage({ next_review_date: '2026-05-04' })
    const r = scheduleReadingReview(page, TODAY)
    expect(r.postponeDays).toBe(2)
  })

  it('overdue 7 days → postpone 1 day', () => {
    const page = makePage({ next_review_date: '2026-05-02' })
    const r = scheduleReadingReview(page, TODAY)
    expect(r.postponeDays).toBe(1)
  })

  it('overdue 30 days → postpone 1 day (never exceeds 1)', () => {
    const page = makePage({ next_review_date: '2026-04-09' })
    const r = scheduleReadingReview(page, TODAY)
    expect(r.postponeDays).toBe(1)
    expect(r.nextReviewDate).toBe('2026-05-10')
  })
})

// ── Risk score ────────────────────────────────────────────────────────────────

describe('scheduleReadingReview — risk score', () => {
  it('decreases risk by 0.05', () => {
    const page = makePage({ risk_score: 0.20 })
    const r = scheduleReadingReview(page, TODAY)
    expect(r.newRiskScore).toBe(0.15)
  })

  it('risk never goes below 0', () => {
    const page = makePage({ risk_score: 0.02 })
    const r = scheduleReadingReview(page, TODAY)
    expect(r.newRiskScore).toBe(0)
  })

  it('risk already 0 stays 0', () => {
    const page = makePage({ risk_score: 0 })
    const r = scheduleReadingReview(page, TODAY)
    expect(r.newRiskScore).toBe(0)
  })
})

// ── Fields that must NOT change ───────────────────────────────────────────────

describe('scheduleReadingReview — unchanged fields', () => {
  it('stability_days unchanged', () => {
    const page = makePage({ stability_days: 21 })
    expect(scheduleReadingReview(page, TODAY).stabilityDays).toBe(21)
  })

  it('difficulty unchanged', () => {
    const page = makePage({ difficulty: 0.6 })
    expect(scheduleReadingReview(page, TODAY).difficulty).toBe(0.6)
  })

  it('review_count unchanged', () => {
    const page = makePage({ review_count: 8 })
    expect(scheduleReadingReview(page, TODAY).reviewCount).toBe(8)
  })

  it('current_interval_days unchanged', () => {
    const page = makePage({ current_interval_days: 30 })
    expect(scheduleReadingReview(page, TODAY).currentIntervalDays).toBe(30)
  })

  it('fragile page stays fragile', () => {
    const page = makePage({ review_stage: 'fragile' })
    expect(scheduleReadingReview(page, TODAY).reviewStage).toBe('fragile')
  })

  it('mature page stays mature', () => {
    const page = makePage({ review_stage: 'mature' })
    expect(scheduleReadingReview(page, TODAY).reviewStage).toBe('mature')
  })

  it('learning page stays learning', () => {
    const page = makePage({ review_stage: 'learning' })
    expect(scheduleReadingReview(page, TODAY).reviewStage).toBe('learning')
  })
})

// ── Reading counters ──────────────────────────────────────────────────────────

describe('scheduleReadingReview — reading counters', () => {
  it('reading_count increments by 1', () => {
    const page = makePage({ reading_count: 4 })
    expect(scheduleReadingReview(page, TODAY).newReadingCount).toBe(5)
  })

  it('reading_count starts from 0 if missing', () => {
    const page = makePage({ reading_count: 0 })
    expect(scheduleReadingReview(page, TODAY).newReadingCount).toBe(1)
  })

  it('last_read_at = today', () => {
    const page = makePage()
    expect(scheduleReadingReview(page, TODAY).lastReadAt).toBe(TODAY)
  })
})
