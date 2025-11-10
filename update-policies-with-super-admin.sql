-- ============================================
-- ACTUALIZAR POLÍTICAS RLS PARA INCLUIR SUPER_ADMIN
-- ============================================
-- Este script ELIMINA las políticas existentes y las RECREA
-- con soporte para el rol 'super_admin'
--
-- IMPORTANTE: Ejecutar este script en Supabase SQL Editor
-- 
-- NOTA: Las políticas de user_roles usan una función helper
-- para evitar recursión infinita
-- ============================================

-- ============================================
-- 0. CREAR FUNCIÓN HELPER PARA USER_ROLES
-- ============================================
-- Esta función evita recursión infinita en políticas de user_roles
CREATE OR REPLACE FUNCTION public.is_admin_or_super_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = is_admin_or_super_admin.user_id
    AND r.name IN ('super_admin', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 1. ELIMINAR POLÍTICAS EXISTENTES DE `users`
-- ============================================
DROP POLICY IF EXISTS "admin_support_select_all_users" ON public.users;
DROP POLICY IF EXISTS "admin_update_users" ON public.users;
DROP POLICY IF EXISTS "admin_insert_users" ON public.users;

-- ============================================
-- 2. RECREAR POLÍTICAS PARA TABLA `users`
-- ============================================

-- Permitir a super_admin, admin y support_staff ver todos los usuarios
CREATE POLICY "admin_support_select_all_users" ON public.users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin', 'support_staff')
    )
  );

-- Solo super_admin y admin pueden actualizar usuarios
CREATE POLICY "admin_update_users" ON public.users
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin')
    )
  );

-- Solo super_admin y admin pueden insertar usuarios (crear nuevos)
CREATE POLICY "admin_insert_users" ON public.users
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin')
    )
  );

-- ============================================
-- 3. ELIMINAR Y RECREAR POLÍTICAS DE `applications`
-- ============================================
DROP POLICY IF EXISTS "admin_support_select_all_applications" ON public.applications;
DROP POLICY IF EXISTS "admin_support_update_applications" ON public.applications;
DROP POLICY IF EXISTS "admin_delete_applications" ON public.applications;
DROP POLICY IF EXISTS "admin_insert_applications" ON public.applications;

-- Permitir a super_admin, admin y support_staff ver todas las applications
CREATE POLICY "admin_support_select_all_applications" ON public.applications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin', 'support_staff')
    )
  );

-- Permitir a super_admin, admin y support_staff actualizar applications
CREATE POLICY "admin_support_update_applications" ON public.applications
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin', 'support_staff')
    )
  );

-- Solo super_admin y admin pueden eliminar applications
CREATE POLICY "admin_delete_applications" ON public.applications
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin')
    )
  );

-- Solo super_admin y admin pueden crear applications manualmente
CREATE POLICY "admin_insert_applications" ON public.applications
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin')
    )
  );

-- ============================================
-- 4. ELIMINAR Y RECREAR POLÍTICAS DE `applicants`
-- ============================================
DROP POLICY IF EXISTS "admin_support_select_all_applicants" ON public.applicants;

CREATE POLICY "admin_support_select_all_applicants" ON public.applicants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin', 'support_staff')
    )
  );

-- ============================================
-- 5. ELIMINAR Y RECREAR POLÍTICAS DE `coverages`
-- ============================================
DROP POLICY IF EXISTS "admin_support_select_all_coverages" ON public.coverages;

CREATE POLICY "admin_support_select_all_coverages" ON public.coverages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin', 'support_staff')
    )
  );

-- ============================================
-- 6. ELIMINAR Y RECREAR POLÍTICAS DE `beneficiaries`
-- ============================================
DROP POLICY IF EXISTS "admin_support_select_all_beneficiaries" ON public.beneficiaries;

CREATE POLICY "admin_support_select_all_beneficiaries" ON public.beneficiaries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin', 'support_staff')
    )
  );

-- ============================================
-- 7. ELIMINAR Y RECREAR POLÍTICAS DE `application_status_history`
-- ============================================
DROP POLICY IF EXISTS "admin_support_select_all_status_history" ON public.application_status_history;

CREATE POLICY "admin_support_select_all_status_history" ON public.application_status_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin', 'support_staff')
    )
  );

-- ============================================
-- 8. ELIMINAR Y RECREAR POLÍTICAS DE `user_roles`
-- ============================================
-- IMPORTANTE: Estas políticas usan la función helper para evitar recursión infinita
DROP POLICY IF EXISTS "admin_select_all_user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "admin_insert_user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "admin_delete_user_roles" ON public.user_roles;

-- Permitir a super_admin y admin ver todos los user_roles
-- Usamos la función SECURITY DEFINER para evitar recursión
CREATE POLICY "admin_select_all_user_roles" ON public.user_roles
  FOR SELECT
  USING (public.is_admin_or_super_admin(auth.uid()));

-- Solo super_admin y admin pueden asignar roles
CREATE POLICY "admin_insert_user_roles" ON public.user_roles
  FOR INSERT
  WITH CHECK (public.is_admin_or_super_admin(auth.uid()));

-- Solo super_admin y admin pueden remover roles
CREATE POLICY "admin_delete_user_roles" ON public.user_roles
  FOR DELETE
  USING (public.is_admin_or_super_admin(auth.uid()));

-- ============================================
-- 9. ELIMINAR Y RECREAR POLÍTICAS DE `insurance_companies`
-- ============================================
DROP POLICY IF EXISTS "admin_support_select_all_insurance_companies" ON public.insurance_companies;

CREATE POLICY "admin_support_select_all_insurance_companies" ON public.insurance_companies
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin', 'support_staff')
    )
  );

-- ============================================
-- 10. ELIMINAR Y RECREAR POLÍTICAS DE `agents`
-- ============================================
DROP POLICY IF EXISTS "admin_select_all_agents" ON public.agents;

CREATE POLICY "admin_select_all_agents" ON public.agents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin')
    )
  );

-- ============================================
-- 11. ELIMINAR Y RECREAR POLÍTICAS DE `application_notes`
-- ============================================
DROP POLICY IF EXISTS "admin_support_select_all_application_notes" ON public.application_notes;
DROP POLICY IF EXISTS "admin_support_insert_application_notes" ON public.application_notes;

-- Políticas: super_admin, admin y support_staff pueden ver todas las notas
CREATE POLICY "admin_support_select_all_application_notes" ON public.application_notes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin', 'support_staff')
    )
  );

-- super_admin, admin y support_staff pueden crear notas
CREATE POLICY "admin_support_insert_application_notes" ON public.application_notes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin', 'support_staff')
    )
  );

-- ============================================
-- 12. ELIMINAR Y RECREAR POLÍTICAS DE `admin_activity_logs`
-- ============================================
DROP POLICY IF EXISTS "admin_select_all_activity_logs" ON public.admin_activity_logs;

-- Políticas: Solo super_admin y admin pueden ver logs
CREATE POLICY "admin_select_all_activity_logs" ON public.admin_activity_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin')
    )
  );

-- ============================================
-- VERIFICACIÓN
-- ============================================
-- Para verificar que las políticas fueron actualizadas correctamente:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies
-- WHERE tablename IN ('users', 'applications', 'user_roles')
-- ORDER BY tablename, policyname;

