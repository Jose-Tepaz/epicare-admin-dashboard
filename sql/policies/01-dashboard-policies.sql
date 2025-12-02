-- ============================================
-- POLÍTICAS RLS PARA DASHBOARD Y MÉTRICAS
-- ============================================
-- Este archivo contiene las políticas para filtrar métricas
-- según el rol del usuario (admin, agent, support_staff)
--
-- ⚠️ IMPORTANTE: Siempre usar users.role directamente
-- ✅ CORRECTO:   WHERE u.role = 'agent'
-- ❌ INCORRECTO: JOIN user_roles ur ... JOIN roles r ...
-- Ver USER-ROLE.MD para más detalles
-- ============================================

-- NOTA: Las políticas para usuarios ya existen en supabase-admin-policies.sql
-- Este archivo complementa con vistas y helpers para métricas filtradas

-- ============================================
-- FUNCIÓN HELPER: Obtener Agent ID de un usuario
-- ============================================

CREATE OR REPLACE FUNCTION get_user_agent_id(user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  agent_uuid UUID;
BEGIN
  SELECT id INTO agent_uuid
  FROM public.agents
  WHERE agents.user_id = get_user_agent_id.user_id
  LIMIT 1;
  
  RETURN agent_uuid;
END;
$$;

-- ============================================
-- FUNCIÓN HELPER: Verificar si user es Agent
-- ============================================

CREATE OR REPLACE FUNCTION is_agent(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM public.users
  WHERE id = is_agent.user_id;
  
  RETURN user_role = 'agent';
END;
$$;

-- ============================================
-- FUNCIÓN HELPER: Obtener scope de Support Staff
-- ============================================

CREATE OR REPLACE FUNCTION get_support_staff_scope(user_id UUID)
RETURNS TABLE(scope TEXT, assigned_agent_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(u.scope, 'global')::TEXT as scope,
    u.assigned_to_agent_id
  FROM public.users u
  WHERE u.id = get_support_staff_scope.user_id
  AND u.role = 'support_staff';
END;
$$;

-- ============================================
-- POLÍTICAS ADICIONALES PARA APPLICATIONS
-- (Complementan las políticas existentes)
-- ============================================

-- Policy para agents: solo ver applications con su agent_id
DROP POLICY IF EXISTS "agent_select_own_applications" ON public.applications;
CREATE POLICY "agent_select_own_applications" ON public.applications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role = 'agent'
      AND applications.agent_id = get_user_agent_id(auth.uid())
    )
  );

-- Policy para support_staff con scope agent_specific
DROP POLICY IF EXISTS "support_staff_scoped_applications" ON public.applications;
CREATE POLICY "support_staff_scoped_applications" ON public.applications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role = 'support_staff'
      AND (
        -- Scope global: puede ver todo
        u.scope = 'global'
        OR
        -- Scope agent_specific: solo del agent asignado
        (u.scope = 'agent_specific' AND applications.agent_id = u.assigned_to_agent_id)
      )
    )
  );

-- ============================================
-- POLÍTICAS ADICIONALES PARA USERS
-- (Complementan las políticas existentes)
-- ============================================

-- Policy para agents: solo ver sus clients y support staff que crearon
DROP POLICY IF EXISTS "agent_select_own_clients" ON public.users;
CREATE POLICY "agent_select_own_clients" ON public.users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role = 'agent'
      AND (
        -- Clients asignados al agent
        users.agent_id = get_user_agent_id(auth.uid())
        OR
        -- Users creados por el agent (support_staff)
        users.created_by = auth.uid()
      )
    )
  );

-- Policy para support_staff con scope agent_specific: solo ver users de su agent
DROP POLICY IF EXISTS "support_staff_scoped_users" ON public.users;
CREATE POLICY "support_staff_scoped_users" ON public.users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role = 'support_staff'
      AND (
        -- Scope global: puede ver todo
        u.scope = 'global'
        OR
        -- Scope agent_specific: solo del agent asignado
        (u.scope = 'agent_specific' AND users.agent_id = u.assigned_to_agent_id)
      )
    )
  );

-- ============================================
-- POLÍTICAS PARA SUPPORT TICKETS
-- ============================================

-- Policy para agents: ver tickets de sus clients y tickets que crearon
DROP POLICY IF EXISTS "agent_select_own_tickets" ON public.support_tickets;
CREATE POLICY "agent_select_own_tickets" ON public.support_tickets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role = 'agent'
      AND (
        -- Tickets de clients del agent
        EXISTS (
          SELECT 1 FROM public.users client
          WHERE client.id = support_tickets.client_id
          AND client.agent_id = get_user_agent_id(auth.uid())
        )
        OR
        -- Tickets creados por el agent
        support_tickets.created_by = auth.uid()
      )
    )
  );

-- Policy para support_staff con scope
DROP POLICY IF EXISTS "support_staff_scoped_tickets" ON public.support_tickets;
CREATE POLICY "support_staff_scoped_tickets" ON public.support_tickets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role = 'support_staff'
      AND (
        -- Scope global: puede ver todo
        u.scope = 'global'
        OR
        -- Scope agent_specific: solo del agent asignado
        (
          u.scope = 'agent_specific' 
          AND EXISTS (
            SELECT 1 FROM public.users client
            WHERE client.id = support_tickets.client_id
            AND client.agent_id = u.assigned_to_agent_id
          )
        )
      )
    )
  );

-- ============================================
-- POLÍTICAS PARA DOCUMENTS
-- ============================================

-- Policy para agents: solo documents de sus clients
DROP POLICY IF EXISTS "agent_select_own_documents" ON public.documents;
CREATE POLICY "agent_select_own_documents" ON public.documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role = 'agent'
      AND EXISTS (
        SELECT 1 FROM public.users client
        WHERE client.id = documents.client_id
        AND client.agent_id = get_user_agent_id(auth.uid())
      )
    )
  );

-- Policy para support_staff con scope
DROP POLICY IF EXISTS "support_staff_scoped_documents" ON public.documents;
CREATE POLICY "support_staff_scoped_documents" ON public.documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role = 'support_staff'
      AND (
        -- Scope global: puede ver todo
        u.scope = 'global'
        OR
        -- Scope agent_specific: solo del agent asignado
        (
          u.scope = 'agent_specific' 
          AND EXISTS (
            SELECT 1 FROM public.users client
            WHERE client.id = documents.client_id
            AND client.agent_id = u.assigned_to_agent_id
          )
        )
      )
    )
  );

-- ============================================
-- COMENTARIOS Y NOTAS
-- ============================================

-- Estas políticas complementan las existentes en supabase-admin-policies.sql
-- NO reemplazan las políticas de admin y super_admin que ya existen

-- Para verificar que las políticas están activas:
-- SELECT * FROM pg_policies WHERE tablename IN ('applications', 'users', 'support_tickets', 'documents');

-- Para probar como agent:
-- SET LOCAL role TO authenticated;
-- SET LOCAL request.jwt.claim.sub TO '<agent_user_id>';

COMMENT ON FUNCTION get_user_agent_id IS 'Obtiene el agent_id de un usuario que tiene rol agent';
COMMENT ON FUNCTION is_agent IS 'Verifica si un usuario tiene el rol agent';
COMMENT ON FUNCTION get_support_staff_scope IS 'Obtiene el scope y agent asignado de un support_staff';

