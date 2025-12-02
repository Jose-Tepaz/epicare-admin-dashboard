-- ============================================
-- POLÍTICAS PARA SUPPORT_STAFF
-- ============================================
-- Implementa RN-002: Support Staff Scope
-- - scope='global' → ve TODO
-- - scope='agent_specific' → solo ve datos del agent asignado
-- ============================================

-- ============================================
-- HELPER FUNCTION: Obtener scope del usuario actual
-- ============================================

CREATE OR REPLACE FUNCTION get_current_user_scope()
RETURNS VARCHAR AS $$
  SELECT scope FROM public.users WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_current_user_assigned_agent()
RETURNS UUID AS $$
  SELECT assigned_to_agent_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================
-- USERS - Support Staff según scope
-- ============================================

DROP POLICY IF EXISTS "support_staff_select_users" ON public.users;
CREATE POLICY "support_staff_select_users" ON public.users
  FOR SELECT
  USING (
    get_current_user_role() = 'support_staff'
    AND (
      -- Scope global: ve todos los usuarios
      get_current_user_scope() = 'global'
      OR
      -- Scope agent_specific: solo ve clientes del agent asignado
      (
        get_current_user_scope() = 'agent_specific'
        AND users.agent_id = get_current_user_assigned_agent()
      )
    )
  );

-- Support staff NO puede crear, editar o eliminar usuarios
-- Solo lectura según scope

-- ============================================
-- APPLICATIONS - Support Staff según scope
-- ============================================

DROP POLICY IF EXISTS "support_staff_select_applications" ON public.applications;
CREATE POLICY "support_staff_select_applications" ON public.applications
  FOR SELECT
  USING (
    get_current_user_role() = 'support_staff'
    AND (
      -- Scope global: ve todas las aplicaciones
      get_current_user_scope() = 'global'
      OR
      -- Scope agent_specific: solo ve aplicaciones del agent asignado
      (
        get_current_user_scope() = 'agent_specific'
        AND applications.agent_id = get_current_user_assigned_agent()
      )
    )
  );

-- Support staff puede actualizar campos NO sensibles (RN del documento)
DROP POLICY IF EXISTS "support_staff_update_applications" ON public.applications;
CREATE POLICY "support_staff_update_applications" ON public.applications
  FOR UPDATE
  USING (
    get_current_user_role() = 'support_staff'
    AND (
      get_current_user_scope() = 'global'
      OR
      (
        get_current_user_scope() = 'agent_specific'
        AND applications.agent_id = get_current_user_assigned_agent()
      )
    )
  )
  WITH CHECK (
    get_current_user_role() = 'support_staff'
    AND (
      get_current_user_scope() = 'global'
      OR
      (
        get_current_user_scope() = 'agent_specific'
        AND applications.agent_id = get_current_user_assigned_agent()
      )
    )
  );

-- ============================================
-- DOCUMENTS - Support Staff según scope
-- ============================================

DROP POLICY IF EXISTS "support_staff_select_documents" ON public.documents;
CREATE POLICY "support_staff_select_documents" ON public.documents
  FOR SELECT
  USING (
    get_current_user_role() = 'support_staff'
    AND (
      -- Scope global: ve todos los documentos
      get_current_user_scope() = 'global'
      OR
      -- Scope agent_specific: solo ve documentos de clientes del agent asignado
      (
        get_current_user_scope() = 'agent_specific'
        AND EXISTS (
          SELECT 1 FROM public.users u
          WHERE u.id = documents.client_id
          AND u.agent_id = get_current_user_assigned_agent()
        )
      )
    )
  );

DROP POLICY IF EXISTS "support_staff_insert_documents" ON public.documents;
CREATE POLICY "support_staff_insert_documents" ON public.documents
  FOR INSERT
  WITH CHECK (
    get_current_user_role() = 'support_staff'
    AND (
      get_current_user_scope() = 'global'
      OR
      (
        get_current_user_scope() = 'agent_specific'
        AND EXISTS (
          SELECT 1 FROM public.users u
          WHERE u.id = documents.client_id
          AND u.agent_id = get_current_user_assigned_agent()
        )
      )
    )
  );

DROP POLICY IF EXISTS "support_staff_update_documents" ON public.documents;
CREATE POLICY "support_staff_update_documents" ON public.documents
  FOR UPDATE
  USING (
    get_current_user_role() = 'support_staff'
    AND (
      get_current_user_scope() = 'global'
      OR
      (
        get_current_user_scope() = 'agent_specific'
        AND EXISTS (
          SELECT 1 FROM public.users u
          WHERE u.id = documents.client_id
          AND u.agent_id = get_current_user_assigned_agent()
        )
      )
    )
  );

-- Support staff NO puede eliminar documentos (según documento de permisos)

-- ============================================
-- SUPPORT_TICKETS - Support Staff según scope
-- ============================================

DROP POLICY IF EXISTS "support_staff_select_tickets" ON public.support_tickets;
CREATE POLICY "support_staff_select_tickets" ON public.support_tickets
  FOR SELECT
  USING (
    get_current_user_role() = 'support_staff'
    AND (
      -- Scope global: ve todos los tickets
      get_current_user_scope() = 'global'
      OR
      -- Scope agent_specific: solo ve tickets de clientes del agent asignado
      (
        get_current_user_scope() = 'agent_specific'
        AND (
          -- Tickets de clientes del agent
          EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = support_tickets.client_id
            AND u.agent_id = get_current_user_assigned_agent()
          )
          OR
          -- Tickets asignados al support staff
          support_tickets.assigned_to = auth.uid()
          OR
          -- Tickets creados por el support staff
          support_tickets.created_by = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS "support_staff_insert_tickets" ON public.support_tickets;
CREATE POLICY "support_staff_insert_tickets" ON public.support_tickets
  FOR INSERT
  WITH CHECK (
    get_current_user_role() = 'support_staff'
    AND (
      get_current_user_scope() = 'global'
      OR
      (
        get_current_user_scope() = 'agent_specific'
        AND (
          -- Solo puede crear tickets para clientes del agent asignado
          support_tickets.client_id IS NULL -- Tickets internos
          OR EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = support_tickets.client_id
            AND u.agent_id = get_current_user_assigned_agent()
          )
        )
      )
    )
  );

DROP POLICY IF EXISTS "support_staff_update_tickets" ON public.support_tickets;
CREATE POLICY "support_staff_update_tickets" ON public.support_tickets
  FOR UPDATE
  USING (
    get_current_user_role() = 'support_staff'
    AND (
      get_current_user_scope() = 'global'
      OR
      (
        get_current_user_scope() = 'agent_specific'
        AND (
          EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = support_tickets.client_id
            AND u.agent_id = get_current_user_assigned_agent()
          )
          OR support_tickets.assigned_to = auth.uid()
          OR support_tickets.created_by = auth.uid()
        )
      )
    )
  );

-- ============================================
-- TICKET_MESSAGES - Support Staff según scope
-- ============================================

DROP POLICY IF EXISTS "support_staff_select_ticket_messages" ON public.ticket_messages;
CREATE POLICY "support_staff_select_ticket_messages" ON public.ticket_messages
  FOR SELECT
  USING (
    get_current_user_role() = 'support_staff'
    AND (
      get_current_user_scope() = 'global'
      OR
      (
        get_current_user_scope() = 'agent_specific'
        AND EXISTS (
          SELECT 1 FROM public.support_tickets st
          INNER JOIN public.users u ON u.id = st.client_id
          WHERE st.id = ticket_messages.ticket_id
          AND (
            u.agent_id = get_current_user_assigned_agent()
            OR st.assigned_to = auth.uid()
            OR st.created_by = auth.uid()
          )
        )
      )
    )
  );

DROP POLICY IF EXISTS "support_staff_insert_ticket_messages" ON public.ticket_messages;
CREATE POLICY "support_staff_insert_ticket_messages" ON public.ticket_messages
  FOR INSERT
  WITH CHECK (
    get_current_user_role() = 'support_staff'
    AND (
      get_current_user_scope() = 'global'
      OR
      (
        get_current_user_scope() = 'agent_specific'
        AND EXISTS (
          SELECT 1 FROM public.support_tickets st
          LEFT JOIN public.users u ON u.id = st.client_id
          WHERE st.id = ticket_messages.ticket_id
          AND (
            u.agent_id = get_current_user_assigned_agent()
            OR st.assigned_to = auth.uid()
            OR st.created_by = auth.uid()
            OR st.client_id IS NULL -- Tickets internos
          )
        )
      )
    )
  );

-- ============================================
-- APPLICANTS - Support Staff según scope
-- ============================================

DROP POLICY IF EXISTS "support_staff_select_applicants" ON public.applicants;
CREATE POLICY "support_staff_select_applicants" ON public.applicants
  FOR SELECT
  USING (
    get_current_user_role() = 'support_staff'
    AND (
      get_current_user_scope() = 'global'
      OR
      (
        get_current_user_scope() = 'agent_specific'
        AND EXISTS (
          SELECT 1 FROM public.applications app
          WHERE app.id = applicants.application_id
          AND app.agent_id = get_current_user_assigned_agent()
        )
      )
    )
  );

-- ============================================
-- FIN POLÍTICAS SUPPORT_STAFF
-- ============================================

COMMENT ON POLICY "support_staff_select_users" ON public.users IS 
'RN-002: Support staff con scope=global ve todos los usuarios. Con scope=agent_specific solo ve clientes del agent asignado.';

COMMENT ON POLICY "support_staff_select_applications" ON public.applications IS 
'RN-002: Support staff con scope=global ve todas las aplicaciones. Con scope=agent_specific solo ve aplicaciones del agent asignado.';

COMMENT ON POLICY "support_staff_select_documents" ON public.documents IS 
'RN-002: Support staff con scope=global ve todos los documentos. Con scope=agent_specific solo ve documentos de clientes del agent asignado.';

COMMENT ON POLICY "support_staff_select_tickets" ON public.support_tickets IS 
'RN-002: Support staff con scope=global ve todos los tickets. Con scope=agent_specific solo ve tickets de clientes del agent asignado o asignados a ellos.';

