import { MistakeLevel, ReviewStage, Strength, Page } from './types'
import { addDays } from './spaced-rep'

// ── Constants ─────────────────────────────────────────────────────────────────
const MAX_STABILITY      = 90
const MIN_STABILITY      = 0.5
const MAX_GROWTH         = 2.5
const WARM_UP_THRESHOLD  = 5

// ── Warm-up lookup ────────────────────────────────────────────────────────────
const WARM_UP_INTERVALS: Record<number, Record<MistakeLevel, number>> = {
  0: { perfect:1,  minor:1,  impactful:1,  few:1, many:1, lapse:1 },
  1: { perfect:3,  minor:2,  impactful:1,  few:1, many:1, lapse:1 },
  2: { perfect:7,  minor:5,  impactful:3,  few:2, many:1, lapse:1 },
  3: { perfect:14, minor:10, impactful:7,  few:3, many:2, lapse:1 },
  4: { perfect:21, minor:14, impactful:10, few:5, many:3, lapse:1 },
}

const STAGE_MAX_INTERVAL: Record<ReviewStage, number> = {
  learning: 14,
  review:   90,
  mature:   90,
  fragile:  7,
}

// ── MistakeLevel → Strength mapping (for backward compat in review_logs) ─────
export const MISTAKE_TO_STRENGTH: Record<MistakeLevel, Strength> = {
  perfect:   'strong',
  minor:     'strong',
  impactful: 'medium',
  few:       'medium',
  many:      'weak',
  lapse:     'weak',
}

// ── Result type ───────────────────────────────────────────────────────────────
export interface ReviewResult {
  newInterval:          number
  nextReviewDate:       string
  stabilityAfter:       number
  difficultyAfter:      number
  stageAfter:           ReviewStage
  newLapses:            number
  newConsecutiveGood:   number
  newWarmUpCount:       number
  riskScore:            number
  retrievabilityBefore: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

function r2(n: number): number {
  return Math.round(n * 100) / 100
}

function calcRetrievability(elapsed: number, stability: number): number {
  if (elapsed <= 0 || stability <= 0) return 1
  return Math.exp(-elapsed / stability)
}

function updateDifficulty(d: number, level: MistakeLevel): number {
  const delta: Record<MistakeLevel, number> = {
    perfect: -0.05, minor: -0.02, impactful: 0.05,
    few: 0.08, many: 0.12, lapse: 0.20,
  }
  return r2(clamp(d + delta[level], 0.1, 1.0))
}

function updateStability(stability: number, level: MistakeLevel, R: number, diff: number): number {
  let raw: number
  switch (level) {
    case 'lapse':
      raw = Math.max(1, stability * 0.1)
      break
    case 'many':
      raw = Math.max(Math.max(1, stability * 0.3), stability * 0.5)
      break
    case 'few':
      raw = Math.max(1, stability * 0.7)
      break
    default: {
      const baseMult: Record<MistakeLevel, number> = { perfect: 2.0, minor: 1.6, impactful: 1.2, few: 0, many: 0, lapse: 0 }
      const fi   = 1 + (1 - R) * 0.8
      const df   = 1 - diff * 0.4
      const gf   = Math.min(baseMult[level] * fi * df, MAX_GROWTH)
      raw = stability * gf
    }
  }
  return r2(clamp(raw, MIN_STABILITY, MAX_STABILITY))
}

function updateStage(
  current: ReviewStage,
  level: MistakeLevel,
  stability: number,
  lapses: number,
  consecGood: number,
): ReviewStage {
  if (level === 'lapse') return lapses > 2 ? 'fragile' : 'learning'
  if (level === 'many')  return current === 'mature' || current === 'review' ? 'fragile' : 'learning'
  if (current === 'fragile' && consecGood >= 2) return 'review'
  if (stability >= 21 && (level === 'perfect' || level === 'minor')) return 'mature'
  if (current === 'learning' && stability >= 7) return 'review'
  if (current === 'mature' && (level === 'impactful' || level === 'few')) return 'fragile'
  return current
}

// ── Main export ───────────────────────────────────────────────────────────────
export function scheduleReview(page: Page, level: MistakeLevel, today: string): ReviewResult {
  const stability  = page.stability_days ?? page.current_interval_days ?? 1
  const difficulty = page.difficulty ?? 0.3
  const stage      = page.review_stage ?? 'learning'
  const warmUp     = page.warm_up_count ?? 0
  const lapses     = page.lapses ?? 0
  const consec     = page.consecutive_good ?? 0

  // elapsed days since last review
  const elapsed = page.last_reviewed_at
    ? Math.max(0, Math.round((new Date(today).getTime() - new Date(page.last_reviewed_at).getTime()) / 86400000))
    : 0

  const R = calcRetrievability(elapsed, stability)

  // warm-up branch
  if (warmUp < WARM_UP_THRESHOLD) {
    const interval      = WARM_UP_INTERVALS[warmUp][level]
    const newDiff       = updateDifficulty(difficulty, level)
    const newLapses     = level === 'lapse' ? lapses + 1 : lapses
    const newWarmUp     = Math.min(warmUp + 1, WARM_UP_THRESHOLD)
    const newStability  = r2(clamp(interval, MIN_STABILITY, MAX_STABILITY))
    const risk          = r2(clamp(newDiff * 0.5 + newLapses * 0.15 + (1 - R) * 0.35, 0, 1))
    return {
      newInterval:          interval,
      nextReviewDate:       addDays(today, interval),
      stabilityAfter:       newStability,
      difficultyAfter:      newDiff,
      stageAfter:           'learning',
      newLapses,
      newConsecutiveGood:   0,
      newWarmUpCount:       newWarmUp,
      riskScore:            risk,
      retrievabilityBefore: R,
    }
  }

  // full algorithm
  const newDiff      = updateDifficulty(difficulty, level)
  const newLapses    = level === 'lapse' ? lapses + 1 : lapses
  const newStability = updateStability(stability, level, R, newDiff)
  const isGood       = level === 'perfect' || level === 'minor'
  const newConsec    = isGood ? consec + 1 : 0
  const newStage     = updateStage(stage, level, newStability, newLapses, newConsec)
  const rawInterval  = clamp(Math.round(newStability), 1, STAGE_MAX_INTERVAL[newStage])
  const interval     = level === 'lapse' ? clamp(rawInterval, 1, 3) : rawInterval
  const risk         = r2(clamp(newDiff * 0.5 + newLapses * 0.15 + (1 - R) * 0.35, 0, 1))

  return {
    newInterval:          interval,
    nextReviewDate:       addDays(today, interval),
    stabilityAfter:       newStability,
    difficultyAfter:      newDiff,
    stageAfter:           newStage,
    newLapses,
    newConsecutiveGood:   newConsec,
    newWarmUpCount:       warmUp,
    riskScore:            risk,
    retrievabilityBefore: R,
  }
}

export function createInitialState() {
  return {
    stability_days:    1,
    difficulty:        0.3,
    review_stage:      'learning' as ReviewStage,
    lapses:            0,
    risk_score:        0.0,
    warm_up_count:     0,
    consecutive_good:  0,
    last_mistake_level: null,
  }
}
