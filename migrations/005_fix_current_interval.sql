-- DATA FIX: correct current_interval_days for imported pages.
--
-- Bug: pages added via "محفوظة سابقًا + lastDate" stored
--   current_interval_days = (next_review_date - created_at)   ← WRONG
-- Fix: should be
--   current_interval_days = (next_review_date - last_reviewed_at) ← CORRECT
--
-- Safe: only touches pages not yet reviewed (review_count = 0)
-- with a real last_reviewed_at from an import.

-- STEP 1: preview rows before changing (run this first, verify output)
/*
SELECT
  page_number,
  last_reviewed_at,
  next_review_date,
  current_interval_days                                  AS current_wrong,
  (next_review_date::date - last_reviewed_at::date)      AS correct_value
FROM pages
WHERE
  last_reviewed_at IS NOT NULL
  AND initial_memory_state IN ('strong_old', 'good_old', 'hesitant_old', 'weak_old')
  AND review_count = 0;
*/

-- STEP 2: apply fix
UPDATE pages
SET current_interval_days = GREATEST(1,
  (next_review_date::date - last_reviewed_at::date)
)
WHERE
  last_reviewed_at IS NOT NULL
  AND initial_memory_state IN ('strong_old', 'good_old', 'hesitant_old', 'weak_old')
  AND review_count = 0;

-- STEP 3: verify (should return 0)
/*
SELECT count(*) FROM pages
WHERE
  last_reviewed_at IS NOT NULL
  AND initial_memory_state IN ('strong_old', 'good_old', 'hesitant_old', 'weak_old')
  AND review_count = 0
  AND current_interval_days != (next_review_date::date - last_reviewed_at::date);
*/
