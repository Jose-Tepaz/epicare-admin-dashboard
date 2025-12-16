-- ============================================
-- MIGRACIÓN: Corregir políticas de notificaciones para considerar active_role
-- ============================================
-- PROBLEMA: Las políticas de notificaciones usan u.role directamente,
--           no consideran active_role (role switching)
-- SOLUCIÓN: Actualizar políticas para usar get_current_user_role_safe()
-- ============================================

-- ============================================
-- POLÍTICAS DE SELECT (Ver notificaciones)
-- ============================================

-- Super Admin y Admin pueden ver todas las notificaciones
-- IMPORTANTE: Usar get_current_user_role_safe() para considerar active_role (role switching)
DROP POLICY IF EXISTS "admin_select_all_notifications" ON public.notifications;
CREATE POLICY "admin_select_all_notifications" ON public.notifications
  FOR SELECT
  USING (
    public.get_current_user_role_safe() IN ('super_admin', 'admin')
  );

-- ============================================
-- POLÍTICAS DE UPDATE (Marcar como leída)
-- ============================================

-- Super Admin y Admin pueden marcar cualquier notificación como leída
-- IMPORTANTE: Usar get_current_user_role_safe() para considerar active_role (role switching)
DROP POLICY IF EXISTS "admin_update_all_notifications" ON public.notifications;
CREATE POLICY "admin_update_all_notifications" ON public.notifications
  FOR UPDATE
  USING (
    public.get_current_user_role_safe() IN ('super_admin', 'admin')
  );

-- ============================================
-- COMENTARIOS
-- ============================================

COMMENT ON POLICY "admin_select_all_notifications" ON public.notifications IS 
'Permite a super_admin y admin ver todas las notificaciones del sistema (considera active_role)';

COMMENT ON POLICY "admin_update_all_notifications" ON public.notifications IS 
'Permite a super_admin y admin marcar cualquier notificación como leída (considera active_role)';

