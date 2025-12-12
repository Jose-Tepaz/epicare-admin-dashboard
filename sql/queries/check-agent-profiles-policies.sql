-- Ver políticas de agent_profiles
SELECT 
  polname as policy_name,
  polcmd as command,
  pg_get_expr(polqual, polrelid) as using_expression
FROM pg_policy
JOIN pg_class ON pg_class.oid = pg_policy.polrelid
WHERE relname = 'agent_profiles';

