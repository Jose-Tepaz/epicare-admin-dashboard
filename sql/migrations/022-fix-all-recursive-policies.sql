-- ============================================
-- MIGRACIÓN URGENTE: Corregir TODAS las políticas recursivas en users
-- ============================================
-- PROBLEMA: Las políticas de la tabla 'users' usan get_my_role()
-- que internamente consulta la tabla 'users', causando recursión infinita.
--
-- SOLUCIÓN: Reemplazar get_my_role() por verificaciones directas
-- usando auth.uid() y la tabla user_roles o verificando role directamente
-- desde la fila del usuario actual.
--
-- EJECUTAR INMEDIATAMENTE EN SUPABASE SQL EDITOR
-- ============================================

-- ============================================
-- 1. ELIMINAR TODAS LAS POLÍTICAS PROBLEMÁTICAS
-- ============================================

DROP POLICY IF EXISTS "users_select_admins" ON public.users;
DROP POLICY IF EXISTS "users_select_support_staff" ON public.users;
DROP POLICY IF EXISTS "users_select_agent" ON public.users;
DROP POLICY IF EXISTS "users_delete_super_admin" ON public.users;
DROP POLICY IF EXISTS "users_update_admins" ON public.users;
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "users_insert_self" ON public.users;
DROP POLICY IF EXISTS "users_insert_super_admin" ON public.users;

-- ============================================
-- 2. CREAR POLÍTICAS CORREGIDAS (SIN RECURSIÓN)
-- ============================================

-- Política: Usuario puede ver su propio registro
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT
  USING (id = auth.uid());

-- Política: Usuario puede actualizar su propio registro
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Política: Usuario puede insertar su propio registro (registro inicial)
CREATE POLICY "users_insert_self" ON public.users
  FOR INSERT
  WITH CHECK (id = auth.uid());

-- Política: Admin/Super Admin pueden ver todos los usuarios
-- Verificamos el rol consultando la tabla user_roles (no users)
CREATE POLICY "users_select_admins" ON public.users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin')
    )
  );

-- Política: Admin/Super Admin pueden actualizar usuarios
CREATE POLICY "users_update_admins" ON public.users
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin')
    )
  );

-- Política: Super Admin puede eliminar usuarios (excepto a sí mismo)
CREATE POLICY "users_delete_super_admin" ON public.users
  FOR DELETE
  USING (
    id <> auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'super_admin'
    )
  );

-- Política: Super Admin puede insertar usuarios
CREATE POLICY "users_insert_super_admin" ON public.users
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin')
    )
  );

-- Política: Support Staff puede ver usuarios según scope
-- Verificamos si el usuario es support_staff via user_roles
CREATE POLICY "users_select_support_staff" ON public.users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      JOIN public.users current_user ON current_user.id = auth.uid()
      WHERE ur.user_id = auth.uid()
      AND r.name = 'support_staff'
      AND (
        current_user.scope = 'global'
        OR (
          current_user.scope = 'agent_specific'
          AND public.users.agent_profile_id = current_user.assigned_to_agent_id
        )
      )
    )
  );

-- Política: Agent puede ver sus clientes
-- Verificamos si el usuario tiene un agent_profile (es agent)
CREATE POLICY "users_select_agent" ON public.users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.agent_profiles ap
      WHERE ap.user_id = auth.uid()
    )
    AND (
      agent_profile_id = (
        SELECT id FROM public.agent_profiles 
        WHERE user_id = auth.uid()
      )
      OR created_by = auth.uid()
    )
  );

-- ============================================
-- VERIFICACIÓN
-- ============================================
-- Después de ejecutar, verifica que puedas hacer login

