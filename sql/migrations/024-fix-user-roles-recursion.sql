-- ============================================
-- MIGRACIÓN URGENTE: Corregir recursión en user_roles
-- ============================================
-- PROBLEMA: Las políticas de user_roles consultan users,
-- y las políticas de users consultan user_roles → RECURSIÓN INFINITA
--
-- SOLUCIÓN: Cambiar políticas de user_roles para que NO consulten users
-- ============================================

-- Eliminar políticas problemáticas
DROP POLICY IF EXISTS "user_roles_select_admins" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_insert_admins" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_update_admins" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_delete_admins" ON public.user_roles;

-- Crear función helper que obtiene el rol SIN consultar users directamente
-- Esta función usa SECURITY DEFINER para bypass RLS
CREATE OR REPLACE FUNCTION public.is_user_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Bypass RLS usando SECURITY DEFINER
  SELECT COALESCE(active_role, role)::text INTO user_role
  FROM public.users
  WHERE id = auth.uid();
  
  RETURN user_role IN ('super_admin', 'admin');
END;
$$;

-- Política: Usuario puede ver sus propios roles (sin verificar si es admin primero)
CREATE POLICY "user_roles_select_own" ON public.user_roles
  FOR SELECT
  USING (user_id = auth.uid());

-- Política: Admins pueden ver todos los user_roles (usando función SECURITY DEFINER)
CREATE POLICY "user_roles_select_admins" ON public.user_roles
  FOR SELECT
  USING (public.is_user_admin());

-- Política: Admins pueden insertar user_roles
CREATE POLICY "user_roles_insert_admins" ON public.user_roles
  FOR INSERT
  WITH CHECK (public.is_user_admin());

-- Política: Super Admin puede actualizar user_roles
CREATE OR REPLACE FUNCTION public.is_user_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT COALESCE(active_role, role)::text INTO user_role
  FROM public.users
  WHERE id = auth.uid();
  
  RETURN user_role = 'super_admin';
END;
$$;

CREATE POLICY "user_roles_update_admins" ON public.user_roles
  FOR UPDATE
  USING (public.is_user_super_admin());

-- Política: Super Admin puede eliminar user_roles
CREATE POLICY "user_roles_delete_admins" ON public.user_roles
  FOR DELETE
  USING (public.is_user_super_admin());

