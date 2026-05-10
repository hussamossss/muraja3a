-- Notifications: user preferences, push subscriptions, send log
-- Channels: email (Resend) + Web Push (npm:web-push)
-- Dispatcher: supabase/functions/send-due-reminders (triggered hourly by pg_cron — see 009)

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id           UUID     PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  timezone          TEXT     NOT NULL DEFAULT 'UTC',           -- IANA name, e.g. "Asia/Riyadh"
  reminder_hour     SMALLINT NOT NULL DEFAULT 8 CHECK (reminder_hour BETWEEN 0 AND 23),
  email_enabled     BOOLEAN  NOT NULL DEFAULT TRUE,
  push_enabled      BOOLEAN  NOT NULL DEFAULT FALSE,
  lang              TEXT     NOT NULL DEFAULT 'ar' CHECK (lang IN ('ar','en')),
  created_at        TEXT     NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::TEXT,
  updated_at        TEXT     NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::TEXT
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint    TEXT NOT NULL,
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  user_agent  TEXT,
  created_at  TEXT NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::TEXT,
  UNIQUE (user_id, endpoint)
);

CREATE TABLE IF NOT EXISTS notification_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sent_date   TEXT NOT NULL,                                   -- YYYY-MM-DD in user's local tz
  channel     TEXT NOT NULL CHECK (channel IN ('email','push')),
  due_count   INTEGER NOT NULL,
  status      TEXT NOT NULL CHECK (status IN ('sent','failed','skipped')),
  error       TEXT,
  created_at  TEXT NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::TEXT,
  UNIQUE (user_id, sent_date, channel)
);

CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_notif_logs_user_date ON notification_logs (user_id, sent_date);

ALTER TABLE user_preferences    ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_preferences: owner rw" ON user_preferences
  USING       (auth.uid() = user_id)
  WITH CHECK  (auth.uid() = user_id);

CREATE POLICY "push_subscriptions: owner rw" ON push_subscriptions
  USING       (auth.uid() = user_id)
  WITH CHECK  (auth.uid() = user_id);

CREATE POLICY "notification_logs: owner read" ON notification_logs
  FOR SELECT USING (auth.uid() = user_id);
-- Inserts/updates only via service-role from the Edge Function (RLS bypassed).

-- Table-level grants (RLS alone is not enough — the role also needs base privileges)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_preferences    TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON push_subscriptions  TO authenticated;
GRANT SELECT                          ON notification_logs   TO authenticated;
