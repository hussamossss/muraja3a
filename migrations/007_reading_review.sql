-- Phase 4 — Reading Review (Quran Reading Stabilizer)
-- Adds lightweight reading-review support without touching recitation engine.

-- pages: track when the user last read a page and how many times
ALTER TABLE pages
  ADD COLUMN IF NOT EXISTS last_read_at   TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS reading_count  INTEGER NOT NULL DEFAULT 0;

-- review_logs: distinguish reading reviews from recitation reviews
-- Existing rows default to 'recitation' — no backfill needed.
ALTER TABLE review_logs
  ADD COLUMN IF NOT EXISTS review_type TEXT NOT NULL DEFAULT 'recitation';
