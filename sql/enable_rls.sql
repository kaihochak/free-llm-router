-- PostgreSQL Row-Level Security (RLS) Setup for Free Models API
-- Run this manually via Neon console SQL Editor as neondb_owner
-- DO NOT run via db:push or Drizzle migrations
--
-- IMPORTANT:
-- - Replace <secure> placeholders with strong unique passwords before running.
-- - This script is idempotent - safe to re-run (uses IF NOT EXISTS / OR REPLACE / IF EXISTS)

-- ============================================
-- PART 1: CREATE DATABASE ROLES
-- ============================================

-- App role (restricted, enforces RLS)
DO $$ BEGIN
  CREATE ROLE fma_app LOGIN PASSWORD '<secure>' NOINHERIT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Admin role (for Better Auth, cleanup, bypasses RLS)
DO $$ BEGIN
  CREATE ROLE fma_admin LOGIN PASSWORD '<secure>' NOINHERIT BYPASSRLS;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Stats role (EXECUTE on SECURITY DEFINER functions + SELECT on free_models for public aggregates)
-- NO BYPASSRLS - calls functions owned by fma_admin which bypass RLS internally
DO $$ BEGIN
  CREATE ROLE fma_stats LOGIN PASSWORD '<secure>' NOINHERIT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Allow neondb_owner to transfer ownership to fma_admin (needed for SECURITY DEFINER functions)
GRANT fma_admin TO neondb_owner;

-- Grant schema usage
GRANT USAGE ON SCHEMA public TO fma_app;
GRANT USAGE ON SCHEMA public TO fma_admin;
GRANT USAGE ON SCHEMA public TO fma_stats;

-- fma_admin needs CREATE on schema to own functions in it
GRANT CREATE ON SCHEMA public TO fma_admin;

-- fma_app: user-scoped tables (RLS enforced)
GRANT SELECT, INSERT, UPDATE, DELETE ON users, sessions, accounts, api_keys, api_request_logs, model_feedback TO fma_app;
-- fma_app: public/system tables
GRANT SELECT, INSERT, UPDATE ON free_models, sync_meta TO fma_app;
GRANT SELECT, INSERT ON site_feedback TO fma_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON verifications TO fma_app;

-- fma_admin: full access (for Better Auth OAuth flows, cleanup, migrations)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO fma_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO fma_admin;

-- Sequences for app role
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO fma_app;

-- Default privileges for future tables created by neondb_owner (Drizzle migrations)
-- Run as neondb_owner; omitting FOR ROLE defaults to current role
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO fma_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO fma_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO fma_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO fma_admin;

-- ============================================
-- PART 2: ENABLE RLS ON USER-SCOPED TABLES
-- ============================================

-- Enable RLS on all user-scoped tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_request_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_feedback ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owner (defense-in-depth)
ALTER TABLE users FORCE ROW LEVEL SECURITY;
ALTER TABLE sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE accounts FORCE ROW LEVEL SECURITY;
ALTER TABLE api_keys FORCE ROW LEVEL SECURITY;
ALTER TABLE api_request_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE model_feedback FORCE ROW LEVEL SECURITY;

-- ============================================
-- PART 3: CREATE RLS POLICIES
-- ============================================

-- ============================================
-- USERS TABLE (ownership by id)
-- Column types: id is TEXT (not UUID)
-- ============================================
DROP POLICY IF EXISTS users_select ON users;
DROP POLICY IF EXISTS users_update ON users;
CREATE POLICY users_select ON users FOR SELECT
  USING (id = NULLIF(current_setting('app.user_id', true), ''));
CREATE POLICY users_update ON users FOR UPDATE
  USING (id = NULLIF(current_setting('app.user_id', true), ''))
  WITH CHECK (id = NULLIF(current_setting('app.user_id', true), ''));
-- No INSERT (users created via OAuth with admin role)
-- No DELETE (users shouldn't self-delete via API)

-- ============================================
-- SESSIONS TABLE (ownership by user_id)
-- Note: Better Auth INSERTs here during OAuth - uses admin role
-- ============================================
DROP POLICY IF EXISTS sessions_select ON sessions;
DROP POLICY IF EXISTS sessions_insert ON sessions;
DROP POLICY IF EXISTS sessions_update ON sessions;
DROP POLICY IF EXISTS sessions_delete ON sessions;
CREATE POLICY sessions_select ON sessions FOR SELECT
  USING (user_id = NULLIF(current_setting('app.user_id', true), ''));
CREATE POLICY sessions_insert ON sessions FOR INSERT
  WITH CHECK (user_id = NULLIF(current_setting('app.user_id', true), ''));
CREATE POLICY sessions_update ON sessions FOR UPDATE
  USING (user_id = NULLIF(current_setting('app.user_id', true), ''))
  WITH CHECK (user_id = NULLIF(current_setting('app.user_id', true), ''));
CREATE POLICY sessions_delete ON sessions FOR DELETE
  USING (user_id = NULLIF(current_setting('app.user_id', true), ''));

-- ============================================
-- ACCOUNTS TABLE (ownership by user_id)
-- Note: Better Auth INSERTs here during OAuth - uses admin role
-- ============================================
DROP POLICY IF EXISTS accounts_select ON accounts;
DROP POLICY IF EXISTS accounts_insert ON accounts;
DROP POLICY IF EXISTS accounts_update ON accounts;
DROP POLICY IF EXISTS accounts_delete ON accounts;
CREATE POLICY accounts_select ON accounts FOR SELECT
  USING (user_id = NULLIF(current_setting('app.user_id', true), ''));
CREATE POLICY accounts_insert ON accounts FOR INSERT
  WITH CHECK (user_id = NULLIF(current_setting('app.user_id', true), ''));
CREATE POLICY accounts_update ON accounts FOR UPDATE
  USING (user_id = NULLIF(current_setting('app.user_id', true), ''))
  WITH CHECK (user_id = NULLIF(current_setting('app.user_id', true), ''));
CREATE POLICY accounts_delete ON accounts FOR DELETE
  USING (user_id = NULLIF(current_setting('app.user_id', true), ''));

-- ============================================
-- API_KEYS TABLE (auth bootstrap via key hash session var)
-- VERIFIED: Column name is "key" (not "key_hash")
-- Source: src/db/auth-schema.ts line 67: key: text('key').notNull().unique()
-- Type: TEXT, stores SHA-256 hash (base64url encoded, no padding)
-- ============================================
-- SELECT: Allow lookup by key hash (auth bootstrap) OR by owner
-- SECURITY NOTE: withUserContext only accepts userId from validated auth
-- (session.user.id or validation.userId from validateApiKey), never from
-- request params. See history.ts line 27-29, api-auth.ts validateApiKey.
-- NOTE: Key hash lookup requires enabled = true (matches app-layer enabled check in validateApiKey)
DROP POLICY IF EXISTS api_keys_select ON api_keys;
DROP POLICY IF EXISTS api_keys_insert ON api_keys;
DROP POLICY IF EXISTS api_keys_update ON api_keys;
DROP POLICY IF EXISTS api_keys_delete ON api_keys;
CREATE POLICY api_keys_select ON api_keys FOR SELECT
  USING (
    (key = NULLIF(current_setting('app.api_key_hash', true), '') AND enabled = true)
    OR user_id = NULLIF(current_setting('app.user_id', true), '')
  );
-- INSERT/UPDATE/DELETE: owner-scoped only
CREATE POLICY api_keys_insert ON api_keys FOR INSERT
  WITH CHECK (user_id = NULLIF(current_setting('app.user_id', true), ''));
CREATE POLICY api_keys_update ON api_keys FOR UPDATE
  USING (user_id = NULLIF(current_setting('app.user_id', true), ''))
  WITH CHECK (user_id = NULLIF(current_setting('app.user_id', true), ''));
CREATE POLICY api_keys_delete ON api_keys FOR DELETE
  USING (user_id = NULLIF(current_setting('app.user_id', true), ''));

-- ============================================
-- API_REQUEST_LOGS TABLE (ownership by user_id)
-- ============================================
DROP POLICY IF EXISTS logs_select ON api_request_logs;
DROP POLICY IF EXISTS logs_insert ON api_request_logs;
CREATE POLICY logs_select ON api_request_logs FOR SELECT
  USING (user_id = NULLIF(current_setting('app.user_id', true), ''));
CREATE POLICY logs_insert ON api_request_logs FOR INSERT
  WITH CHECK (user_id = NULLIF(current_setting('app.user_id', true), ''));
-- No UPDATE/DELETE (logs are immutable for users)

-- ============================================
-- MODEL_FEEDBACK TABLE (ownership by source field)
-- source stores userId as TEXT string
-- ============================================
-- SELECT: Owner-only (no public aggregates via app role)
DROP POLICY IF EXISTS feedback_select ON model_feedback;
DROP POLICY IF EXISTS feedback_insert ON model_feedback;
CREATE POLICY feedback_select ON model_feedback FOR SELECT
  USING (source = NULLIF(current_setting('app.user_id', true), ''));
-- INSERT: Must set source to current user (enforced)
CREATE POLICY feedback_insert ON model_feedback FOR INSERT
  WITH CHECK (source = NULLIF(current_setting('app.user_id', true), ''));
-- No UPDATE/DELETE (feedback is immutable)
-- Note: Public aggregates use fma_stats role via SECURITY DEFINER functions (see Part 4)

-- ============================================
-- PART 4: CREATE SECURITY DEFINER FUNCTIONS
-- ============================================

-- STATS FUNCTIONS: Return aggregates only
-- Runs as owner (fma_admin), bypasses RLS internally
-- But output is hard-limited to aggregates

-- Feedback counts by model/issue/success
CREATE OR REPLACE FUNCTION public.get_feedback_counts(
  start_ts timestamptz,
  end_ts timestamptz
)
RETURNS TABLE(model_id text, issue text, is_success boolean, count bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT model_id, issue, is_success, COUNT(*)
  FROM model_feedback
  WHERE created_at >= start_ts AND created_at < end_ts
  GROUP BY model_id, issue, is_success;
$$;

-- Error timeline (for charts)
-- Note: bucket_interval parameter allows flexible time bucketing
-- Requires PostgreSQL 14+ for date_bin() (Neon supports this)
CREATE OR REPLACE FUNCTION public.get_error_timeline(
  start_ts timestamptz,
  end_ts timestamptz,
  bucket_interval interval DEFAULT '1 hour'
)
RETURNS TABLE(bucket timestamptz, model_id text, error_count bigint, total_count bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    date_bin(bucket_interval, created_at, start_ts) AS bucket,
    model_id,
    COUNT(*) FILTER (WHERE is_success = false) AS error_count,
    COUNT(*) AS total_count
  FROM model_feedback
  WHERE created_at >= start_ts AND created_at < end_ts
  GROUP BY bucket, model_id
  ORDER BY bucket;
$$;

-- Grant execute to fma_stats only (PUBLIC doesn't get execute by default on Neon)
GRANT EXECUTE ON FUNCTION public.get_feedback_counts(timestamptz, timestamptz) TO fma_stats;
GRANT EXECUTE ON FUNCTION public.get_error_timeline(timestamptz, timestamptz, interval) TO fma_stats;

-- Set function ownership to fma_admin (required for BYPASSRLS to work)
-- SECURITY DEFINER runs as owner, so owner must have BYPASSRLS
ALTER FUNCTION public.get_feedback_counts(timestamptz, timestamptz) OWNER TO fma_admin;
ALTER FUNCTION public.get_error_timeline(timestamptz, timestamptz, interval) OWNER TO fma_admin;

-- fma_stats needs free_models for JOINs (no sensitive data in this table)
GRANT SELECT ON free_models TO fma_stats;

-- ============================================
-- VERIFICATION QUERIES (run after setup)
-- ============================================

-- Check RLS is enabled:
-- SELECT relname, relrowsecurity, relforcerowsecurity
-- FROM pg_class
-- WHERE relname IN ('users', 'sessions', 'accounts', 'api_keys', 'api_request_logs', 'model_feedback');

-- Check policies exist:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public';

-- Check role grants:
-- SELECT grantee, table_name, privilege_type
-- FROM information_schema.table_privileges
-- WHERE grantee IN ('fma_app', 'fma_admin', 'fma_stats');
