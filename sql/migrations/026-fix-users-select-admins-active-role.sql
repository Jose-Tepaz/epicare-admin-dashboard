-- ============================================
-- MIGRACIÓN: Corregir users_select_admins para usar active_role
-- ============================================
-- PROBLEMA: users_select_admins verifica roles disponibles en user_roles
-- en lugar del active_role, permitiendo que agents vean todos los usuarios
-- si tienen rol de admin disponible.
--
-- SOLUCIÓN: Cambiar la política para usar get_my_role() que respeta active_role
-- ============================================

-- Eliminar política actual
DROP POLICY IF EXISTS "users_select_admins" ON public.users;

-- Crear política que usa get_my_role() (que respeta active_role)
CREATE POLICY "users_select_admins" ON public.users
  FOR SELECT
  USING (
    public.get_my_role() IN ('super_admin', 'admin')
  );

-- También actualizar users_update_admins
DROP POLICY IF EXISTS "users_update_admins" ON public.users;

CREATE POLICY "users_update_admins" ON public.users
  FOR UPDATE
  USING (
    public.get_my_role() IN ('super_admin', 'admin')
  );

-- Actualizar users_delete_super_admin
DROP POLICY IF EXISTS "users_delete_super_admin" ON public.users;

CREATE POLICY "users_delete_super_admin" ON public.users
  FOR DELETE
  USING (
    id <> auth.uid()
    AND public.get_my_role() = 'super_admin'
  );

-- Actualizar users_insert_super_admin
DROP POLICY IF EXISTS "users_insert_super_admin" ON public.users;

CREATE POLICY "users_insert_super_admin" ON public.users
  FOR INSERT
  WITH CHECK (
    public.get_my_role() IN ('super_admin', 'admin')
  );

