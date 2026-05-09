-- User language/UI preferences
CREATE TABLE user_preferences (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  language   VARCHAR(5) NOT NULL DEFAULT 'ar',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own prefs" ON user_preferences
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
