-- Initial schema — applied at project start
-- Managed in Supabase dashboard; documented here for version control.

CREATE TABLE IF NOT EXISTS pages (
  id                    TEXT PRIMARY KEY,
  user_id               UUID NOT NULL,
  page_number           INTEGER NOT NULL,
  created_at            TEXT NOT NULL,
  last_reviewed_at      TEXT DEFAULT NULL,
  next_review_date      TEXT NOT NULL,
  current_interval_days INTEGER NOT NULL DEFAULT 1,
  last_strength         TEXT DEFAULT NULL,
  review_count          INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS review_logs (
  id                     TEXT PRIMARY KEY,
  user_id                UUID NOT NULL,
  page_id                TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  reviewed_at            TEXT NOT NULL,
  strength               TEXT NOT NULL,
  previous_interval_days INTEGER NOT NULL,
  new_interval_days      INTEGER NOT NULL,
  next_review_date       TEXT NOT NULL
);

-- RLS: each user sees only their own rows
ALTER TABLE pages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pages: user owns rows" ON pages
  USING (auth.uid() = user_id);

CREATE POLICY "review_logs: user owns rows" ON review_logs
  USING (auth.uid() = user_id);
