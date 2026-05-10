-- Follow-up to 008: grant table-level privileges to the authenticated role.
-- Required because the tables were created via raw SQL (RLS policies alone
-- aren't enough — the role also needs base INSERT/SELECT/UPDATE/DELETE rights).

GRANT USAGE ON SCHEMA public TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON user_preferences    TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON push_subscriptions  TO authenticated;
GRANT SELECT                          ON notification_logs   TO authenticated;

-- Service role used by the Edge Function — Supabase normally auto-grants this
-- for tables created via the dashboard, but tables created via raw SQL miss it.
GRANT ALL ON user_preferences    TO service_role;
GRANT ALL ON push_subscriptions  TO service_role;
GRANT ALL ON notification_logs   TO service_role;
