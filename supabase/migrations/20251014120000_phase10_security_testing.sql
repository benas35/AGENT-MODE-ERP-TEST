-- Phase 10: Security & testing hardening
-- Ensure org-scoped RLS coverage and helper audit surface

DO $$
DECLARE
  r RECORD;
  policy_name TEXT;
BEGIN
  FOR r IN (
    SELECT table_schema, table_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name = 'org_id'
  ) LOOP
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY;', r.table_schema, r.table_name);
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY;', r.table_schema, r.table_name);

    policy_name := format('%I_org_guard', r.table_name);

    IF NOT EXISTS (
      SELECT 1
      FROM pg_policy p
      JOIN pg_class c ON p.polrelid = c.oid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE p.polname = policy_name
        AND c.relname = r.table_name
        AND n.nspname = r.table_schema
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I.%I USING (org_id = get_user_org_id()) WITH CHECK (org_id = get_user_org_id());',
        policy_name,
        r.table_schema,
        r.table_name
      );
    END IF;
  END LOOP;
END $$;

CREATE OR REPLACE VIEW org_rls_audit AS
SELECT
  c.table_schema,
  c.table_name,
  COUNT(p.*) FILTER (WHERE p.policyname IS NOT NULL) AS policy_count,
  BOOL_OR(relrowsecurity) AS rls_enabled,
  BOOL_OR(relforcerowsecurity) AS rls_forced
FROM information_schema.tables c
LEFT JOIN pg_class pc ON pc.relname = c.table_name
LEFT JOIN pg_namespace pn ON pn.oid = pc.relnamespace AND pn.nspname = c.table_schema
LEFT JOIN pg_policies p ON p.schemaname = c.table_schema AND p.tablename = c.table_name
WHERE c.table_schema = 'public'
GROUP BY c.table_schema, c.table_name
ORDER BY c.table_name;

COMMENT ON VIEW org_rls_audit IS 'Lists RLS coverage for public tables to verify multi-tenant isolation';
