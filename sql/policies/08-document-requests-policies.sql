-- ============================================
-- RLS POLICIES FOR DOCUMENT_REQUESTS TABLE
-- ============================================
-- Admin/Super Admin: acceso total
-- Agent: solo solicitudes de sus clientes
-- Support Staff: según scope (global o agent_specific)
-- Client: solo sus propias solicitudes (SELECT)
-- ============================================

-- ============================================
-- ENABLE RLS
-- ============================================

ALTER TABLE public.document_requests ENABLE ROW LEVEL SECURITY;

-- ============================================
-- LIMPIAR POLÍTICAS EXISTENTES
-- ============================================

DROP POLICY IF EXISTS "Admin can view all document requests" ON public.document_requests;
DROP POLICY IF EXISTS "Agent can view their clients document requests" ON public.document_requests;
DROP POLICY IF EXISTS "Support staff can view document requests" ON public.document_requests;
DROP POLICY IF EXISTS "Client can view own document requests" ON public.document_requests;
DROP POLICY IF EXISTS "Admin can create document requests" ON public.document_requests;
DROP POLICY IF EXISTS "Agent can create document requests" ON public.document_requests;
DROP POLICY IF EXISTS "Support staff can create document requests" ON public.document_requests;
DROP POLICY IF EXISTS "Admin can update document requests" ON public.document_requests;
DROP POLICY IF EXISTS "Agent can update document requests" ON public.document_requests;
DROP POLICY IF EXISTS "Support staff can update document requests" ON public.document_requests;
DROP POLICY IF EXISTS "Client can update own document requests" ON public.document_requests;
DROP POLICY IF EXISTS "Admin can delete document requests" ON public.document_requests;
DROP POLICY IF EXISTS "Agent can delete document requests" ON public.document_requests;

-- ============================================
-- SELECT POLICIES (View document requests)
-- ============================================

-- Admin/Super Admin can view all document requests
CREATE POLICY "Admin can view all document requests"
ON public.document_requests FOR SELECT
USING (
  get_current_user_role() IN ('admin', 'super_admin')
);

-- Agent can view document requests of their clients
CREATE POLICY "Agent can view their clients document requests"
ON public.document_requests FOR SELECT
USING (
  get_current_user_role() = 'agent'
  AND EXISTS (
    SELECT 1 FROM public.users client
    INNER JOIN public.agents a ON client.agent_id = a.id
    WHERE client.id = document_requests.client_id
    AND a.user_id = auth.uid()
  )
);

-- Support Staff can view document requests based on scope
CREATE POLICY "Support staff can view document requests"
ON public.document_requests FOR SELECT
USING (
  get_current_user_role() = 'support_staff'
  AND (
    -- Global scope: ve todo
    (SELECT scope FROM public.users WHERE id = auth.uid()) = 'global'
    OR
    -- Agent specific scope: solo de su agent asignado
    (
      (SELECT scope FROM public.users WHERE id = auth.uid()) = 'agent_specific'
      AND EXISTS (
        SELECT 1 FROM public.users client
        WHERE client.id = document_requests.client_id
        AND client.agent_id = (SELECT assigned_to_agent_id FROM public.users WHERE id = auth.uid())
      )
    )
  )
);

-- Client can view their own document requests
CREATE POLICY "Client can view own document requests"
ON public.document_requests FOR SELECT
USING (
  get_current_user_role() = 'client'
  AND document_requests.client_id = auth.uid()
);

-- ============================================
-- INSERT POLICIES (Create document requests)
-- ============================================

-- Admin/Super Admin can create document requests
CREATE POLICY "Admin can create document requests"
ON public.document_requests FOR INSERT
WITH CHECK (
  get_current_user_role() IN ('admin', 'super_admin')
);

-- Agent can create document requests for their clients
CREATE POLICY "Agent can create document requests"
ON public.document_requests FOR INSERT
WITH CHECK (
  get_current_user_role() = 'agent'
  AND EXISTS (
    SELECT 1 FROM public.users client
    INNER JOIN public.agents a ON client.agent_id = a.id
    WHERE client.id = client_id
    AND a.user_id = auth.uid()
  )
);

-- Support Staff can create document requests based on scope
CREATE POLICY "Support staff can create document requests"
ON public.document_requests FOR INSERT
WITH CHECK (
  get_current_user_role() = 'support_staff'
  AND (
    -- Global scope: puede crear para cualquier cliente
    (SELECT scope FROM public.users WHERE id = auth.uid()) = 'global'
    OR
    -- Agent specific scope: solo para clientes de su agent asignado
    (
      (SELECT scope FROM public.users WHERE id = auth.uid()) = 'agent_specific'
      AND EXISTS (
        SELECT 1 FROM public.users client
        WHERE client.id = client_id
        AND client.agent_id = (SELECT assigned_to_agent_id FROM public.users WHERE id = auth.uid())
      )
    )
  )
);

-- ============================================
-- UPDATE POLICIES (Fulfill, cancel requests)
-- ============================================

-- Admin/Super Admin can update any document request
CREATE POLICY "Admin can update document requests"
ON public.document_requests FOR UPDATE
USING (
  get_current_user_role() IN ('admin', 'super_admin')
);

-- Agent can update document requests of their clients
CREATE POLICY "Agent can update document requests"
ON public.document_requests FOR UPDATE
USING (
  get_current_user_role() = 'agent'
  AND EXISTS (
    SELECT 1 FROM public.users client
    INNER JOIN public.agents a ON client.agent_id = a.id
    WHERE client.id = document_requests.client_id
    AND a.user_id = auth.uid()
  )
);

-- Support Staff can update document requests based on scope
CREATE POLICY "Support staff can update document requests"
ON public.document_requests FOR UPDATE
USING (
  get_current_user_role() = 'support_staff'
  AND (
    -- Global scope: puede actualizar cualquier solicitud
    (SELECT scope FROM public.users WHERE id = auth.uid()) = 'global'
    OR
    -- Agent specific scope: solo solicitudes de su agent asignado
    (
      (SELECT scope FROM public.users WHERE id = auth.uid()) = 'agent_specific'
      AND EXISTS (
        SELECT 1 FROM public.users client
        WHERE client.id = document_requests.client_id
        AND client.agent_id = (SELECT assigned_to_agent_id FROM public.users WHERE id = auth.uid())
      )
    )
  )
);

-- Client can update their own document requests (to mark as fulfilled when uploading)
CREATE POLICY "Client can update own document requests"
ON public.document_requests FOR UPDATE
USING (
  get_current_user_role() = 'client'
  AND document_requests.client_id = auth.uid()
);

-- ============================================
-- DELETE POLICIES
-- ============================================

-- Admin/Super Admin can delete document requests
CREATE POLICY "Admin can delete document requests"
ON public.document_requests FOR DELETE
USING (
  get_current_user_role() IN ('admin', 'super_admin')
);

-- Agent can delete document requests of their clients
CREATE POLICY "Agent can delete document requests"
ON public.document_requests FOR DELETE
USING (
  get_current_user_role() = 'agent'
  AND EXISTS (
    SELECT 1 FROM public.users client
    INNER JOIN public.agents a ON client.agent_id = a.id
    WHERE client.id = document_requests.client_id
    AND a.user_id = auth.uid()
  )
);

-- ============================================
-- COMENTARIOS FINALES
-- ============================================

COMMENT ON POLICY "Admin can view all document requests" ON public.document_requests IS
  'Admin y Super Admin pueden ver todas las solicitudes de documentos sin restricciones';

COMMENT ON POLICY "Agent can view their clients document requests" ON public.document_requests IS
  'Agents solo ven solicitudes de documentos de clientes que tienen su agent_id';

COMMENT ON POLICY "Support staff can view document requests" ON public.document_requests IS
  'Support staff ve según scope: global (todo) o agent_specific (solo su agent asignado)';

COMMENT ON POLICY "Client can view own document requests" ON public.document_requests IS
  'Clientes solo ven sus propias solicitudes de documentos';

COMMENT ON POLICY "Client can update own document requests" ON public.document_requests IS
  'Clientes pueden actualizar sus propias solicitudes (para marcar como cumplida al subir documento)';

-- ============================================
-- VERIFICACIÓN POST-EJECUCIÓN
-- ============================================

-- Verificar que RLS está habilitado
-- SELECT tablename, rowsecurity FROM pg_tables
-- WHERE schemaname = 'public' AND tablename = 'document_requests';

-- Ver todas las políticas activas
-- SELECT policyname, cmd FROM pg_policies
-- WHERE schemaname = 'public' AND tablename = 'document_requests'
-- ORDER BY cmd, policyname;

