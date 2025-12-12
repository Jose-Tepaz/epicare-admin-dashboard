-- ============================================
-- MIGRACIÓN: Actualizar funciones de rol para usar active_role
-- ============================================
-- Esta migración actualiza las funciones helper existentes para que
-- respeten el rol activo (active_role) en lugar del rol principal (role).
--
-- SOLUCIÓN SIMPLE: Solo modificamos las funciones, no las políticas.
-- Las políticas seguirán funcionando porque llaman a estas funciones.
--
-- IMPORTANTE: Ejecutar en Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. ACTUALIZAR get_my_role() para usar active_role
-- ============================================
-- Esta función es usada por las políticas de: users, applications
-- Ahora retorna COALESCE(active_role, role) para respetar el rol activo

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(active_role, role)::text
  FROM public.users
  WHERE id = auth.uid()
$$;

COMMENT ON FUNCTION public.get_my_role() IS 
'Retorna el rol activo del usuario actual. Usa active_role si existe, sino fallback a role.';

-- ============================================
-- 2. ACTUALIZAR get_current_user_role() para usar active_role
-- ============================================
-- Esta función es usada por las políticas de: documents, document_requests, 
-- support_tickets, ticket_messages
-- Ahora retorna COALESCE(active_role, role) para respetar el rol activo

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS VARCHAR
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(active_role, role)::varchar
  FROM public.users
  WHERE id = auth.uid()
$$;

COMMENT ON FUNCTION public.get_current_user_role() IS 
'Retorna el rol activo del usuario actual. Usa active_role si existe, sino fallback a role.';

-- ============================================
-- VERIFICACIÓN
-- ============================================
-- Ejecuta estas consultas para verificar que las funciones funcionan:

-- SELECT 
--   public.get_my_role() as my_role,
--   public.get_current_user_role() as current_user_role;

-- También puedes verificar directamente en la tabla users:
-- SELECT id, email, role, active_role, 
--        COALESCE(active_role, role) as effective_role
-- FROM users 
-- WHERE id = auth.uid();

