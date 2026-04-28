-- Quran Memory Scheduler v1 columns
-- Adds scheduler state to pages and extended log fields to review_logs.

ALTER TABLE pages
  ADD COLUMN IF NOT EXISTS stability_days     FLOAT   DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS difficulty         FLOAT   DEFAULT 0.3,
  ADD COLUMN IF NOT EXISTS review_stage       TEXT    DEFAULT 'learning',
  ADD COLUMN IF NOT EXISTS lapses             INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS risk_score         FLOAT   DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS warm_up_count      INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS consecutive_good   INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_mistake_level TEXT    DEFAULT NULL;

ALTER TABLE review_logs
  ADD COLUMN IF NOT EXISTS mistake_level          TEXT  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS stability_before       FLOAT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS stability_after        FLOAT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS retrievability_before  FLOAT DEFAULT NULL;

-- Backfill existing pages from old strength/interval data
UPDATE pages SET
  stability_days = LEAST(GREATEST(current_interval_days::FLOAT, 1), 90),
  difficulty     = CASE
                     WHEN last_strength = 'strong' THEN 0.25
                     WHEN last_strength = 'medium' THEN 0.45
                     WHEN last_strength = 'weak'   THEN 0.70
                     ELSE 0.3
                   END,
  review_stage   = CASE
                     WHEN review_count = 0               THEN 'learning'
                     WHEN current_interval_days <= 3     THEN 'learning'
                     WHEN current_interval_days <= 21    THEN 'review'
                     ELSE 'mature'
                   END,
  warm_up_count  = LEAST(review_count, 5)
WHERE stability_days IS NULL;

CREATE INDEX IF NOT EXISTS idx_pages_user_review_date
  ON pages (user_id, next_review_date);

CREATE INDEX IF NOT EXISTS idx_pages_user_date_risk
  ON pages (user_id, next_review_date, risk_score DESC);
