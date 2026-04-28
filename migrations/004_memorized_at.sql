-- Adds memorized_at (YYYY-MM) to pages.
-- Stores the approximate month the user first memorized the page.
-- Used as an upper cap for the first review interval of imported pages.

ALTER TABLE pages
  ADD COLUMN IF NOT EXISTS memorized_at TEXT DEFAULT NULL;
