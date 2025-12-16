-- ============================================
-- POLÍTICAS RLS PARA NOTIFICACIONES EN ADMIN DASHBOARD
-- ============================================
-- Permite a cada rol ver solo sus notificaciones relevantes:
-- - super_admin/admin: Ven todas las notificaciones
-- - agent: Solo notificaciones de sus clientes
-- - support_staff: Según scope (global = todas, agent_specific = solo de clientes del agent asignado)
--
-- ⚠️ IMPORTANTE: Estas políticas complementan las políticas del cliente
-- Las políticas del cliente permiten a los clientes ver sus propias notificaciones
-- Estas políticas permiten al staff ver notificaciones relevantes para ellos
-- ============================================

-- ============================================
-- POLÍTICAS DE SELECT (Ver notificaciones)
-- ============================================

-- Cada usuario ve solo sus propias notificaciones
-- Las notificaciones se crean específicamente para cada usuario (user_id)
DROP POLICY IF EXISTS "users_select_own_notifications" ON public.notifications;
CREATE POLICY "users_select_own_notifications" ON public.notifications
  FOR SELECT
  USING (
    user_id = auth.uid()
  );



-- ============================================
-- POLÍTICAS DE UPDATE (Marcar como leída)
-- ============================================

-- Cada usuario puede marcar sus propias notificaciones como leídas
DROP POLICY IF EXISTS "users_update_own_notifications" ON public.notifications;
CREATE POLICY "users_update_own_notifications" ON public.notifications
  FOR UPDATE
  USING (
    user_id = auth.uid()
  );



-- ============================================
-- COMENTARIOS
-- ============================================

COMMENT ON POLICY "users_select_own_notifications" ON public.notifications IS 
'Permite a cada usuario ver solo sus propias notificaciones';

COMMENT ON POLICY "users_update_own_notifications" ON public.notifications IS 
'Permite a cada usuario marcar sus propias notificaciones como leídas';

