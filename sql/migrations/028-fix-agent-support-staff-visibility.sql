-- ============================================
-- MIGRACIÓN: Support Staff usa agent_profile_id (igual que clientes)
-- ============================================
-- CAMBIO: Support staff ahora usa agent_profile_id para vincularse al agente
--         (igual que los clientes), en lugar de assigned_to_agent_id
-- BENEFICIO: Sistema más simple y consistente
-- ============================================

-- ============================================
-- 1. Política para AGENTS: Ver usuarios
-- ============================================

-- Eliminar política actual
DROP POLICY IF EXISTS "users_select_agent" ON public.users;

-- Crear política simplificada para agents
CREATE POLICY "users_select_agent" ON public.users
  FOR SELECT
  USING (
    -- Verificar que el usuario actual es agent
    public.get_my_role() = 'agent'
    AND (
      -- 1. Su propio usuario
      id = auth.uid()
      OR
      -- 2. Usuarios asignados a él (clientes Y support_staff)
      -- Ambos usan agent_profile_id para la vinculación
      agent_profile_id = public.get_my_agent_profile_id()
    )
  );

COMMENT ON POLICY "users_select_agent" ON public.users IS 
'Permite a agents ver: su propio usuario, sus clientes y su support staff (vinculados via agent_profile_id)';

-- ============================================
-- 2. Política para SUPPORT_STAFF: Ver usuarios
-- ============================================

-- Eliminar política actual
DROP POLICY IF EXISTS "support_staff_scoped_users" ON public.users;

-- Crear política para support_staff con scope
CREATE POLICY "support_staff_scoped_users" ON public.users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role = 'support_staff'
      AND (
        -- Scope global: puede ver todos los usuarios
        u.scope = 'global'
        OR
        -- Scope agent_specific: solo ve usuarios del mismo agente
        (
          u.scope = 'agent_specific'
          AND users.agent_profile_id = u.agent_profile_id
        )
      )
    )
  );

COMMENT ON POLICY "support_staff_scoped_users" ON public.users IS 
'Support staff global ve todos, support staff agent_specific solo ve usuarios del mismo agente';

-- ============================================
-- 3. Política para SUPPORT_STAFF: Ver applications
-- ============================================

-- Eliminar política actual  
DROP POLICY IF EXISTS "support_staff_scoped_applications" ON public.applications;

-- Crear política para applications
CREATE POLICY "support_staff_scoped_applications" ON public.applications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role = 'support_staff'
      AND (
        -- Scope global: puede ver todas
        u.scope = 'global'
        OR
        -- Scope agent_specific: solo apps del mismo agente
        (
          u.scope = 'agent_specific'
          -- Comparar con el agent_profile_id del cliente
          AND EXISTS (
            SELECT 1 FROM public.users client
            WHERE client.id = applications.user_id
            AND client.agent_profile_id = u.agent_profile_id
          )
        )
      )
    )
  );

COMMENT ON POLICY "support_staff_scoped_applications" ON public.applications IS 
'Support staff ve applications según su scope y agent_profile_id';

-- ============================================
-- 4. Política para SUPPORT_STAFF: Ver documents
-- ============================================

-- Eliminar política actual
DROP POLICY IF EXISTS "support_staff_scoped_documents" ON public.documents;

-- Crear política para documents
CREATE POLICY "support_staff_scoped_documents" ON public.documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role = 'support_staff'
      AND (
        -- Scope global: puede ver todos
        u.scope = 'global'
        OR
        -- Scope agent_specific: solo docs del mismo agente
        (
          u.scope = 'agent_specific'
          AND EXISTS (
            SELECT 1 FROM public.users client
            WHERE client.id = documents.client_id
            AND client.agent_profile_id = u.agent_profile_id
          )
        )
      )
    )
  );

COMMENT ON POLICY "support_staff_scoped_documents" ON public.documents IS 
'Support staff ve documentos según su scope y agent_profile_id';

-- ============================================
-- 5. Política para SUPPORT_STAFF: Ver tickets
-- ============================================

-- Eliminar política actual
DROP POLICY IF EXISTS "support_staff_scoped_tickets" ON public.support_tickets;

-- Crear política para tickets
CREATE POLICY "support_staff_scoped_tickets" ON public.support_tickets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role = 'support_staff'
      AND (
        -- Scope global: puede ver todos
        u.scope = 'global'
        OR
        -- Scope agent_specific: tickets del mismo agente O asignados/creados por él
        (
          u.scope = 'agent_specific'
          AND (
            -- Tickets de clientes del mismo agente
            EXISTS (
              SELECT 1 FROM public.users client
              WHERE client.id = support_tickets.client_id
              AND client.agent_profile_id = u.agent_profile_id
            )
            OR
            -- Tickets asignados al support staff
            support_tickets.assigned_to = u.id
            OR
            -- Tickets creados por el support staff
            support_tickets.created_by = u.id
          )
        )
      )
    )
  );

COMMENT ON POLICY "support_staff_scoped_tickets" ON public.support_tickets IS 
'Support staff ve tickets según su scope, agent_profile_id, o si están asignados/creados por él';
