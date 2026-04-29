-- Phase 3 — Word Mistake Tracking
CREATE TABLE word_mistakes (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID    NOT NULL,
  page_id         TEXT    NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  review_log_id   TEXT    REFERENCES review_logs(id),
  page_number     INTEGER NOT NULL,
  surah_number    INTEGER NOT NULL,
  ayah_number     INTEGER NOT NULL,
  word_index      INTEGER NOT NULL,
  word_text       TEXT    NOT NULL,
  normalized_word TEXT    NOT NULL,
  context_before  TEXT,
  context_after   TEXT,
  created_at      TEXT    NOT NULL
);

ALTER TABLE word_mistakes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "word_mistakes: user can read own rows"
  ON word_mistakes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "word_mistakes: user can insert own rows"
  ON word_mistakes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "word_mistakes: user can delete own rows"
  ON word_mistakes FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_wm_user_norm
  ON word_mistakes (user_id, normalized_word);

CREATE INDEX idx_wm_user_pos
  ON word_mistakes (user_id, surah_number, ayah_number, word_index);
