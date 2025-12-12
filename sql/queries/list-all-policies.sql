-- ============================================
-- CONSULTA: Listar todas las políticas RLS existentes
-- ============================================
-- Ejecuta esta consulta en Supabase SQL Editor para ver
-- todas las políticas activas en las tablas relevantes
-- ============================================

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual AS using_expression,
  with_check
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename IN ('users', 'applications', 'documents', 'support_tickets', 'document_requests', 'ticket_messages', 'notifications')
ORDER BY tablename, policyname;

