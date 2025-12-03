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

-- Super Admin y Admin pueden ver todas las notificaciones
DROP POLICY IF EXISTS "admin_select_all_notifications" ON public.notifications;
CREATE POLICY "admin_select_all_notifications" ON public.notifications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('super_admin', 'admin')
    )
  );

-- Agent puede ver notificaciones de sus clientes
DROP POLICY IF EXISTS "agent_select_client_notifications" ON public.notifications;
CREATE POLICY "agent_select_client_notifications" ON public.notifications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role = 'agent'
      AND EXISTS (
        SELECT 1 FROM public.agents a
        WHERE a.user_id = u.id
        AND EXISTS (
          SELECT 1 FROM public.users client
          WHERE client.id = notifications.user_id
          AND client.agent_id = a.id
        )
      )
    )
  );

-- Support Staff puede ver notificaciones según su scope
DROP POLICY IF EXISTS "support_staff_select_notifications" ON public.notifications;
CREATE POLICY "support_staff_select_notifications" ON public.notifications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role = 'support_staff'
      AND (
        -- Scope global: ve todas las notificaciones
        u.scope = 'global'
        OR
        -- Scope agent_specific: solo notificaciones de clientes del agent asignado
        (
          u.scope = 'agent_specific'
          AND u.assigned_to_agent_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM public.users client
            WHERE client.id = notifications.user_id
            AND client.agent_id = u.assigned_to_agent_id
          )
        )
      )
    )
  );

-- ============================================
-- POLÍTICAS DE UPDATE (Marcar como leída)
-- ============================================

-- Super Admin y Admin pueden marcar cualquier notificación como leída
DROP POLICY IF EXISTS "admin_update_all_notifications" ON public.notifications;
CREATE POLICY "admin_update_all_notifications" ON public.notifications
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('super_admin', 'admin')
    )
  );

-- Agent puede marcar notificaciones de sus clientes como leídas
DROP POLICY IF EXISTS "agent_update_client_notifications" ON public.notifications;
CREATE POLICY "agent_update_client_notifications" ON public.notifications
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role = 'agent'
      AND EXISTS (
        SELECT 1 FROM public.agents a
        WHERE a.user_id = u.id
        AND EXISTS (
          SELECT 1 FROM public.users client
          WHERE client.id = notifications.user_id
          AND client.agent_id = a.id
        )
      )
    )
  );

-- Support Staff puede marcar notificaciones según su scope como leídas
DROP POLICY IF EXISTS "support_staff_update_notifications" ON public.notifications;
CREATE POLICY "support_staff_update_notifications" ON public.notifications
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role = 'support_staff'
      AND (
        u.scope = 'global'
        OR
        (
          u.scope = 'agent_specific'
          AND u.assigned_to_agent_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM public.users client
            WHERE client.id = notifications.user_id
            AND client.agent_id = u.assigned_to_agent_id
          )
        )
      )
    )
  );

-- ============================================
-- COMENTARIOS
-- ============================================

COMMENT ON POLICY "admin_select_all_notifications" ON public.notifications IS 
'Permite a super_admin y admin ver todas las notificaciones del sistema';

COMMENT ON POLICY "agent_select_client_notifications" ON public.notifications IS 
'Permite a agents ver solo notificaciones de sus clientes asignados';

COMMENT ON POLICY "support_staff_select_notifications" ON public.notifications IS 
'Permite a support_staff ver notificaciones según su scope (global = todas, agent_specific = solo de clientes del agent asignado)';

COMMENT ON POLICY "admin_update_all_notifications" ON public.notifications IS 
'Permite a super_admin y admin marcar cualquier notificación como leída';

COMMENT ON POLICY "agent_update_client_notifications" ON public.notifications IS 
'Permite a agents marcar como leídas las notificaciones de sus clientes';

COMMENT ON POLICY "support_staff_update_notifications" ON public.notifications IS 
'Permite a support_staff marcar como leídas las notificaciones según su scope';

