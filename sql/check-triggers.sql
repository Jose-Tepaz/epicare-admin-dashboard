-- Query para verificar triggers relacionados con auth.users
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
  OR action_statement LIKE '%handle_new_user%'
  OR action_statement LIKE '%on_auth_user_created%';

-- También verificar funciones relacionadas
SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND (
    routine_name LIKE '%handle_new_user%'
    OR routine_name LIKE '%on_auth_user%'
  );

