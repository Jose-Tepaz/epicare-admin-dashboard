-- Ver TODAS las políticas de users con sus definiciones completas
SELECT 
  polname as policy_name,
  polcmd as command,
  pg_get_expr(polqual, polrelid) as using_expression,
  pg_get_expr(polwithcheck, polrelid) as with_check_expression
FROM pg_policy
JOIN pg_class ON pg_class.oid = pg_policy.polrelid
WHERE relname = 'users'
ORDER BY polname;

