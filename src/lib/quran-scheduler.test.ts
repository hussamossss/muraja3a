import { describe, it, expect } from 'vitest'
import {
  scheduleReview,
  createInitialState,
  MISTAKE_TO_STRENGTH,
} from './quran-scheduler'
import type { Page } from './types'
import type { MistakeLevel } from './types'

// ── Helper ────────────────────────────────────────────────────────────────────

function makePage(overrides: Partial<Page> = {}): Page {
  return {
    id:                   'test-id',
    user_id:              'test-user',
    page_number:          1,
    created_at:           '2026-01-01',
    last_reviewed_at:     null,
    next_review_date:     '2026-04-28',
    current_interval_days: 1,
    last_strength:        null,
    review_count:         0,
    stability_days:       1,
    difficulty:           0.3,
    review_stage:         'learning',
    lapses:               0,
    risk_score:           0,
    warm_up_count:        0,
    consecutive_good:     0,
    last_mistake_level:   null,
    initial_memory_state: 'new',
    memorized_at:         null,
    last_read_at:         null,
    reading_count:        0,
    ...overrides,
  }
}

const TODAY = '2026-04-28'

// ── Warm-up phase (warm_up_count < 5) ────────────────────────────────────────

describe('warm-up phase', () => {
  it('warm_up[0] + perfect → interval=1, stageAfter=learning, newWarmUpCount=1', () => {
    const page = makePage({ warm_up_count: 0, stability_days: 1 })
    const result = scheduleReview(page, 'perfect', TODAY)
    expect(result.newInterval).toBe(1)
    expect(result.stageAfter).toBe('learning')
    expect(result.newWarmUpCount).toBe(1)
    expect(result.newLapses).toBe(0)
    expect(result.stabilityAfter).toBe(1)
    expect(result.difficultyAfter).toBe(0.25)
  })

  it('warm_up[2] + perfect → interval=7, stageAfter=learning, newWarmUpCount=3', () => {
    const page = makePage({ warm_up_count: 2, stability_days: 1 })
    const result = scheduleReview(page, 'perfect', TODAY)
    expect(result.newInterval).toBe(7)
    expect(result.stageAfter).toBe('learning')
    expect(result.newWarmUpCount).toBe(3)
    expect(result.newLapses).toBe(0)
    expect(result.stabilityAfter).toBe(7)
  })

  it('warm_up[4] + perfect → interval=21, stageAfter=learning, newWarmUpCount=5', () => {
    const page = makePage({ warm_up_count: 4, stability_days: 1 })
    const result = scheduleReview(page, 'perfect', TODAY)
    expect(result.newInterval).toBe(21)
    expect(result.stageAfter).toBe('learning')
    expect(result.newWarmUpCount).toBe(5)
    expect(result.newLapses).toBe(0)
    expect(result.stabilityAfter).toBe(21)
  })

  it('warm_up[4] + lapse → interval=1, newLapses=1, stageAfter=learning, newWarmUpCount=5', () => {
    const page = makePage({ warm_up_count: 4, stability_days: 1, lapses: 0 })
    const result = scheduleReview(page, 'lapse', TODAY)
    expect(result.newInterval).toBe(1)
    expect(result.stageAfter).toBe('learning')
    expect(result.newWarmUpCount).toBe(5)
    expect(result.newLapses).toBe(1)
  })

  it('warm-up always keeps stageAfter as learning regardless of warm_up_count', () => {
    for (let wu = 0; wu < 5; wu++) {
      const page = makePage({ warm_up_count: wu })
      const result = scheduleReview(page, 'perfect', TODAY)
      expect(result.stageAfter).toBe('learning')
    }
  })

  it('warm-up newConsecutiveGood is always 0', () => {
    const page = makePage({ warm_up_count: 2, consecutive_good: 3 })
    const result = scheduleReview(page, 'perfect', TODAY)
    expect(result.newConsecutiveGood).toBe(0)
  })

  it('warm-up increments warm_up_count but caps at 5', () => {
    const page = makePage({ warm_up_count: 4 })
    const result = scheduleReview(page, 'perfect', TODAY)
    expect(result.newWarmUpCount).toBe(5)
  })
})

// ── Full algorithm (warm_up_count = 5) ───────────────────────────────────────

describe('full algorithm', () => {
  it('mature(stability=60) + perfect + 30d elapsed → stability grows, stageAfter=mature, newInterval≤90', () => {
    const page = makePage({
      warm_up_count:    5,
      stability_days:   60,
      difficulty:       0.3,
      review_stage:     'mature',
      lapses:           0,
      consecutive_good: 0,
      last_reviewed_at: '2026-03-29', // 30 days before TODAY
    })
    const result = scheduleReview(page, 'perfect', TODAY)
    expect(result.stageAfter).toBe('mature')
    expect(result.stabilityAfter).toBeGreaterThan(60)
    expect(result.newInterval).toBeLessThanOrEqual(90)
    expect(result.newInterval).toBeGreaterThanOrEqual(1)
    // exact values from algorithm trace
    expect(result.stabilityAfter).toBe(90)
    expect(result.newInterval).toBe(90)
    expect(result.difficultyAfter).toBe(0.25)
    expect(result.newConsecutiveGood).toBe(1)
    expect(result.newLapses).toBe(0)
  })

  it('mature(stability=90) + few + 60d elapsed → stageAfter=fragile, newInterval≤7', () => {
    const page = makePage({
      warm_up_count:    5,
      stability_days:   90,
      difficulty:       0.3,
      review_stage:     'mature',
      lapses:           0,
      consecutive_good: 0,
      last_reviewed_at: '2026-02-27', // 60 days before TODAY
    })
    const result = scheduleReview(page, 'few', TODAY)
    expect(result.stageAfter).toBe('fragile')
    expect(result.newInterval).toBeLessThanOrEqual(7)
    expect(result.newInterval).toBeGreaterThanOrEqual(1)
    // exact values from algorithm trace
    expect(result.newInterval).toBe(7)
    expect(result.stabilityAfter).toBe(63)
    expect(result.difficultyAfter).toBe(0.38)
    expect(result.newConsecutiveGood).toBe(0)
    expect(result.newLapses).toBe(0)
  })

  it('mature(stability=90) + lapse + 60d elapsed → newInterval≤3, newLapses=1, stageAfter=learning', () => {
    const page = makePage({
      warm_up_count:    5,
      stability_days:   90,
      difficulty:       0.3,
      review_stage:     'mature',
      lapses:           0,
      consecutive_good: 0,
      last_reviewed_at: '2026-02-27', // 60 days before TODAY
    })
    const result = scheduleReview(page, 'lapse', TODAY)
    expect(result.stageAfter).toBe('learning')
    expect(result.newInterval).toBeLessThanOrEqual(3)
    expect(result.newInterval).toBeGreaterThanOrEqual(1)
    expect(result.newLapses).toBe(1)
    // exact values from algorithm trace
    expect(result.newInterval).toBe(3)
    expect(result.stabilityAfter).toBe(9)
    expect(result.difficultyAfter).toBe(0.5)
  })

  it('fragile(stability=5, consecutive_good=1) + minor → consecutive_good becomes 2, stageAfter=review', () => {
    const page = makePage({
      warm_up_count:    5,
      stability_days:   5,
      difficulty:       0.3,
      review_stage:     'fragile',
      lapses:           0,
      consecutive_good: 1,
      last_reviewed_at: '2026-04-21', // 7 days before TODAY
    })
    const result = scheduleReview(page, 'minor', TODAY)
    expect(result.newConsecutiveGood).toBe(2)
    expect(result.stageAfter).toBe('review')
    // exact values from algorithm trace
    expect(result.stabilityAfter).toBe(11.39)
    expect(result.difficultyAfter).toBe(0.28)
    expect(result.newInterval).toBe(11)
    expect(result.newLapses).toBe(0)
  })

  it('fragile(stability=5, lapses=3) + lapse → stageAfter=fragile (lapses>2, not learning)', () => {
    const page = makePage({
      warm_up_count:    5,
      stability_days:   5,
      difficulty:       0.3,
      review_stage:     'fragile',
      lapses:           3,
      consecutive_good: 0,
      last_reviewed_at: '2026-04-21', // 7 days before TODAY
    })
    const result = scheduleReview(page, 'lapse', TODAY)
    expect(result.stageAfter).toBe('fragile')
    expect(result.newLapses).toBe(4)
    expect(result.newInterval).toBeGreaterThanOrEqual(1)
    expect(result.newInterval).toBeLessThanOrEqual(3)
  })

  it('review(stability=21) + perfect + on-time (21d elapsed) → stageAfter=mature', () => {
    const page = makePage({
      warm_up_count:    5,
      stability_days:   21,
      difficulty:       0.3,
      review_stage:     'review',
      lapses:           0,
      consecutive_good: 0,
      last_reviewed_at: '2026-04-07', // 21 days before TODAY
    })
    const result = scheduleReview(page, 'perfect', TODAY)
    expect(result.stageAfter).toBe('mature')
    // exact values from algorithm trace
    expect(result.stabilityAfter).toBe(52.5)
    expect(result.newInterval).toBe(53)
    expect(result.difficultyAfter).toBe(0.25)
    expect(result.newConsecutiveGood).toBe(1)
    expect(result.newLapses).toBe(0)
  })

  it('mature(stability=60) + impactful + 30d elapsed → stability DECAYS to 60×0.85=51, stage=fragile', () => {
    // Regression guard: an `impactful` error means the user actually failed
    // (stopped or changed the meaning). Stability must shrink, not grow.
    const page = makePage({
      warm_up_count:    5,
      stability_days:   60,
      difficulty:       0.3,
      review_stage:     'mature',
      lapses:           0,
      consecutive_good: 0,
      last_reviewed_at: '2026-03-29', // 30 days before TODAY
    })
    const result = scheduleReview(page, 'impactful', TODAY)
    expect(result.stabilityAfter).toBeLessThan(60)
    expect(result.stabilityAfter).toBe(51)
    expect(result.stageAfter).toBe('fragile')
    expect(result.newConsecutiveGood).toBe(0)
    expect(result.newLapses).toBe(0)
  })

  it('fragile + many → stays fragile (not demoted to learning)', () => {
    // Regression guard: `many` should match the behaviour of `lapse` with
    // lapses>2 — fragile pages don't get demoted further.
    const page = makePage({
      warm_up_count:    5,
      stability_days:   5,
      difficulty:       0.3,
      review_stage:     'fragile',
      lapses:           1,
      consecutive_good: 0,
      last_reviewed_at: '2026-04-21',
    })
    const result = scheduleReview(page, 'many', TODAY)
    expect(result.stageAfter).toBe('fragile')
  })
})

// ── Edge cases ────────────────────────────────────────────────────────────────

describe('edge cases', () => {
  it('elapsed=0 (no last_reviewed_at) → newInterval≥1', () => {
    const page = makePage({
      warm_up_count:    5,
      stability_days:   21,
      difficulty:       0.3,
      review_stage:     'mature',
      last_reviewed_at: null,
    })
    const result = scheduleReview(page, 'perfect', TODAY)
    expect(result.newInterval).toBeGreaterThanOrEqual(1)
    // exact value: stability grows from R=1 (no forgetting)
    expect(result.newInterval).toBe(38)
  })

  it('stability never exceeds 90 in any scenario', () => {
    const scenarios: Array<{ stability: number; level: MistakeLevel; lastReviewed: string | null }> = [
      { stability: 90, level: 'perfect', lastReviewed: '2026-01-01' },
      { stability: 80, level: 'perfect', lastReviewed: '2026-04-01' },
      { stability: 60, level: 'minor',   lastReviewed: '2026-03-01' },
    ]
    for (const s of scenarios) {
      const page = makePage({
        warm_up_count:    5,
        stability_days:   s.stability,
        difficulty:       0.3,
        review_stage:     'mature',
        last_reviewed_at: s.lastReviewed,
      })
      const result = scheduleReview(page, s.level, TODAY)
      expect(result.stabilityAfter).toBeLessThanOrEqual(90)
    }
  })

  it('difficulty always stays in [0.1, 1.0] across all mistake levels', () => {
    const levels: MistakeLevel[] = ['perfect', 'minor', 'impactful', 'few', 'many', 'lapse']
    for (const level of levels) {
      // Start at extremes to stress-test clamping
      const pageHigh = makePage({ warm_up_count: 5, stability_days: 10, difficulty: 0.9, review_stage: 'mature' })
      const pageLow  = makePage({ warm_up_count: 5, stability_days: 10, difficulty: 0.1, review_stage: 'mature' })
      const r1 = scheduleReview(pageHigh, level, TODAY)
      const r2 = scheduleReview(pageLow, level, TODAY)
      expect(r1.difficultyAfter).toBeGreaterThanOrEqual(0.1)
      expect(r1.difficultyAfter).toBeLessThanOrEqual(1.0)
      expect(r2.difficultyAfter).toBeGreaterThanOrEqual(0.1)
      expect(r2.difficultyAfter).toBeLessThanOrEqual(1.0)
    }
  })

  it('newInterval is always ≥1 across all scenarios', () => {
    const levels: MistakeLevel[] = ['perfect', 'minor', 'impactful', 'few', 'many', 'lapse']
    const stages = ['learning', 'review', 'mature', 'fragile'] as const
    for (const stage of stages) {
      for (const level of levels) {
        const page = makePage({
          warm_up_count:    5,
          stability_days:   1,
          difficulty:       0.3,
          review_stage:     stage,
          lapses:           0,
          consecutive_good: 0,
          last_reviewed_at: TODAY,
        })
        const result = scheduleReview(page, level, TODAY)
        expect(result.newInterval).toBeGreaterThanOrEqual(1)
      }
    }
  })

  it('warm-up newInterval always ≥1 for all levels and counts', () => {
    const levels: MistakeLevel[] = ['perfect', 'minor', 'impactful', 'few', 'many', 'lapse']
    for (let wu = 0; wu < 5; wu++) {
      for (const level of levels) {
        const page = makePage({ warm_up_count: wu })
        const result = scheduleReview(page, level, TODAY)
        expect(result.newInterval).toBeGreaterThanOrEqual(1)
      }
    }
  })
})

// ── createInitialState() ──────────────────────────────────────────────────────

describe('createInitialState', () => {
  it('returns correct initial values for all fields', () => {
    const state = createInitialState()
    expect(state.stability_days).toBe(1)
    expect(state.difficulty).toBe(0.3)
    expect(state.review_stage).toBe('learning')
    expect(state.lapses).toBe(0)
    expect(state.warm_up_count).toBe(0)
    expect(state.consecutive_good).toBe(0)
    expect(state.last_mistake_level).toBeNull()
  })

  it('returns a fresh object each call (not the same reference)', () => {
    const a = createInitialState()
    const b = createInitialState()
    a.lapses = 99
    expect(b.lapses).toBe(0)
  })
})

// ── MISTAKE_TO_STRENGTH mapping ───────────────────────────────────────────────

describe('MISTAKE_TO_STRENGTH', () => {
  it('perfect → strong', () => {
    expect(MISTAKE_TO_STRENGTH['perfect']).toBe('strong')
  })

  it('minor → strong', () => {
    expect(MISTAKE_TO_STRENGTH['minor']).toBe('strong')
  })

  it('impactful → medium', () => {
    expect(MISTAKE_TO_STRENGTH['impactful']).toBe('medium')
  })

  it('few → medium', () => {
    expect(MISTAKE_TO_STRENGTH['few']).toBe('medium')
  })

  it('many → weak', () => {
    expect(MISTAKE_TO_STRENGTH['many']).toBe('weak')
  })

  it('lapse → weak', () => {
    expect(MISTAKE_TO_STRENGTH['lapse']).toBe('weak')
  })

  it('covers all 6 MistakeLevels', () => {
    const levels: MistakeLevel[] = ['perfect', 'minor', 'impactful', 'few', 'many', 'lapse']
    for (const level of levels) {
      expect(['strong', 'medium', 'weak']).toContain(MISTAKE_TO_STRENGTH[level])
    }
  })
})

// ── nextReviewDate format ─────────────────────────────────────────────────────

describe('nextReviewDate', () => {
  it('returns a valid YYYY-MM-DD date string', () => {
    const page = makePage({ warm_up_count: 0 })
    const result = scheduleReview(page, 'perfect', TODAY)
    expect(result.nextReviewDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('nextReviewDate is today + newInterval days', () => {
    const page = makePage({ warm_up_count: 0 })
    const result = scheduleReview(page, 'perfect', '2026-04-28')
    // interval=1, so nextReviewDate should be 2026-04-29
    expect(result.nextReviewDate).toBe('2026-04-29')
  })

  it('warm_up[4]+perfect gives nextReviewDate 21 days out', () => {
    const page = makePage({ warm_up_count: 4 })
    const result = scheduleReview(page, 'perfect', '2026-04-28')
    expect(result.nextReviewDate).toBe('2026-05-19')
  })
})

// ── retrievabilityBefore ──────────────────────────────────────────────────────

describe('retrievabilityBefore', () => {
  it('is 1 when there is no last_reviewed_at (elapsed=0)', () => {
    const page = makePage({ warm_up_count: 5, stability_days: 21, last_reviewed_at: null })
    const result = scheduleReview(page, 'perfect', TODAY)
    expect(result.retrievabilityBefore).toBe(1)
  })

  it('is 1 when reviewed the same day (elapsed=0)', () => {
    const page = makePage({ warm_up_count: 5, stability_days: 21, last_reviewed_at: TODAY })
    const result = scheduleReview(page, 'perfect', TODAY)
    expect(result.retrievabilityBefore).toBe(1)
  })

  it('is between 0 and 1 when some time has elapsed', () => {
    const page = makePage({
      warm_up_count:    5,
      stability_days:   21,
      last_reviewed_at: '2026-04-07', // 21d before TODAY
    })
    const result = scheduleReview(page, 'perfect', TODAY)
    expect(result.retrievabilityBefore).toBeGreaterThan(0)
    expect(result.retrievabilityBefore).toBeLessThan(1)
    // exp(-21/21) = exp(-1) ≈ 0.3679
    expect(result.retrievabilityBefore).toBeCloseTo(Math.exp(-1), 5)
  })
})

// ── riskScore bounds ──────────────────────────────────────────────────────────

describe('riskScore', () => {
  it('is always in [0, 1]', () => {
    const levels: MistakeLevel[] = ['perfect', 'minor', 'impactful', 'few', 'many', 'lapse']
    for (const level of levels) {
      const page = makePage({
        warm_up_count:    5,
        stability_days:   5,
        difficulty:       0.5,
        lapses:           3,
        last_reviewed_at: '2026-01-01',
      })
      const result = scheduleReview(page, level, TODAY)
      expect(result.riskScore).toBeGreaterThanOrEqual(0)
      expect(result.riskScore).toBeLessThanOrEqual(1)
    }
  })
})
