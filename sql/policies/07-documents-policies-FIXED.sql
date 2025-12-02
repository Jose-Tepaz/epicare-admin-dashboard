-- ============================================
-- RLS POLICIES FOR DOCUMENTS TABLE - VERSIÓN CORREGIDA
-- ============================================
-- Basado en la propuesta del usuario con mejoras
-- Admin/Super Admin: see all
-- Agent: only documents of their clients + CAN DELETE
-- Support Staff: based on scope + CAN UPDATE with agent_specific scope
-- Client: only their own documents
-- ============================================

-- ============================================
-- ENABLE RLS (IMPORTANTE: Ejecutar primero)
-- ============================================
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- ============================================
-- LIMPIAR POLÍTICAS EXISTENTES
-- ============================================

-- Políticas del Script 7 (si se ejecutó antes)
DROP POLICY IF EXISTS "super_admin_all_documents" ON public.documents;
DROP POLICY IF EXISTS "admin_all_documents" ON public.documents;
DROP POLICY IF EXISTS "agent_view_client_documents" ON public.documents;
DROP POLICY IF EXISTS "agent_manage_client_documents" ON public.documents;
DROP POLICY IF EXISTS "support_view_documents" ON public.documents;
DROP POLICY IF EXISTS "support_manage_documents" ON public.documents;
DROP POLICY IF EXISTS "support_update_documents" ON public.documents;
DROP POLICY IF EXISTS "client_view_own_documents" ON public.documents;

-- Políticas de versiones anteriores de este archivo
DROP POLICY IF EXISTS "Admin can view all documents" ON public.documents;
DROP POLICY IF EXISTS "Agent can view their clients documents" ON public.documents;
DROP POLICY IF EXISTS "Support staff global can view all documents" ON public.documents;
DROP POLICY IF EXISTS "Support staff agent specific can view documents" ON public.documents;
DROP POLICY IF EXISTS "Client can view own documents" ON public.documents;
DROP POLICY IF EXISTS "Admin can upload documents" ON public.documents;
DROP POLICY IF EXISTS "Agent can upload documents" ON public.documents;
DROP POLICY IF EXISTS "Support staff global can upload documents" ON public.documents;
DROP POLICY IF EXISTS "Support staff agent specific can upload documents" ON public.documents;
DROP POLICY IF EXISTS "Client can upload own documents" ON public.documents;
DROP POLICY IF EXISTS "Admin can update documents" ON public.documents;
DROP POLICY IF EXISTS "Agent can update their clients documents" ON public.documents;
DROP POLICY IF EXISTS "Support staff global can update documents" ON public.documents;
DROP POLICY IF EXISTS "Support staff agent specific can update documents" ON public.documents;
DROP POLICY IF EXISTS "Admin can delete documents" ON public.documents;
DROP POLICY IF EXISTS "Agent can delete documents" ON public.documents;

-- ============================================
-- SELECT POLICIES (View documents)
-- ============================================

-- Admin/Super Admin can view all documents
-- MEJORA: Usa get_current_user_role() para consistencia con otras políticas
CREATE POLICY "Admin can view all documents"
ON public.documents FOR SELECT
USING (
  get_current_user_role() IN ('admin', 'super_admin')
);

-- Agent can view documents of their clients
-- MEJORA: Simplificado y más eficiente, usa la misma lógica que otras tablas
CREATE POLICY "Agent can view their clients documents"
ON public.documents FOR SELECT
USING (
  get_current_user_role() = 'agent'
  AND EXISTS (
    SELECT 1 FROM public.users u
    INNER JOIN public.agents a ON u.agent_id = a.id
    WHERE u.id = documents.client_id
    AND a.user_id = auth.uid()
  )
);

-- Support Staff can view documents based on scope
-- MEJORA: Una sola política unificada en lugar de dos separadas (más eficiente)
-- MEJORA: Usa get_current_user_scope() si existe, sino consulta directa
CREATE POLICY "Support staff can view documents"
ON public.documents FOR SELECT
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
        WHERE client.id = documents.client_id
        AND client.agent_id = (SELECT assigned_to_agent_id FROM public.users WHERE id = auth.uid())
      )
    )
  )
);

-- Client can view their own documents
-- MEJORA: Usa get_current_user_role() para consistencia
CREATE POLICY "Client can view own documents"
ON public.documents FOR SELECT
USING (
  get_current_user_role() = 'client'
  AND documents.client_id = auth.uid()
);

-- ============================================
-- INSERT POLICIES (Upload documents)
-- ============================================

-- Admin/Super Admin can upload documents
CREATE POLICY "Admin can upload documents"
ON public.documents FOR INSERT
WITH CHECK (
  get_current_user_role() IN ('admin', 'super_admin')
);

-- Agent can upload documents for their clients
-- MEJORA: Misma lógica que SELECT para consistencia
CREATE POLICY "Agent can upload documents"
ON public.documents FOR INSERT
WITH CHECK (
  get_current_user_role() = 'agent'
  AND EXISTS (
    SELECT 1 FROM public.users u
    INNER JOIN public.agents a ON u.agent_id = a.id
    WHERE u.id = client_id
    AND a.user_id = auth.uid()
  )
);

-- Support Staff can upload documents based on scope
-- MEJORA: Una sola política unificada
CREATE POLICY "Support staff can upload documents"
ON public.documents FOR INSERT
WITH CHECK (
  get_current_user_role() = 'support_staff'
  AND (
    -- Global scope: puede subir para cualquier cliente
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

-- Client can upload their own documents
CREATE POLICY "Client can upload own documents"
ON public.documents FOR INSERT
WITH CHECK (
  get_current_user_role() = 'client'
  AND client_id = auth.uid()
);

-- ============================================
-- UPDATE POLICIES (Mark documents as expired, etc.)
-- ============================================

-- Admin/Super Admin can update any document
CREATE POLICY "Admin can update documents"
ON public.documents FOR UPDATE
USING (
  get_current_user_role() IN ('admin', 'super_admin')
);

-- Agent can update documents of their clients
CREATE POLICY "Agent can update their clients documents"
ON public.documents FOR UPDATE
USING (
  get_current_user_role() = 'agent'
  AND EXISTS (
    SELECT 1 FROM public.users u
    INNER JOIN public.agents a ON u.agent_id = a.id
    WHERE u.id = documents.client_id
    AND a.user_id = auth.uid()
  )
);

-- Support Staff can update documents based on scope
-- NUEVO: Según requisitos, support staff con agent_specific puede UPDATE
CREATE POLICY "Support staff can update documents"
ON public.documents FOR UPDATE
USING (
  get_current_user_role() = 'support_staff'
  AND (
    -- Global scope: puede actualizar cualquier documento
    (SELECT scope FROM public.users WHERE id = auth.uid()) = 'global'
    OR
    -- Agent specific scope: solo documentos de su agent asignado
    (
      (SELECT scope FROM public.users WHERE id = auth.uid()) = 'agent_specific'
      AND EXISTS (
        SELECT 1 FROM public.users client
        WHERE client.id = documents.client_id
        AND client.agent_id = (SELECT assigned_to_agent_id FROM public.users WHERE id = auth.uid())
      )
    )
  )
);

-- ============================================
-- DELETE POLICIES
-- ============================================

-- Admin/Super Admin can delete documents
CREATE POLICY "Admin can delete documents"
ON public.documents FOR DELETE
USING (
  get_current_user_role() IN ('admin', 'super_admin')
);

-- Agent can delete documents of their clients
-- NUEVO: Según requisitos del usuario, agents pueden DELETE
CREATE POLICY "Agent can delete documents"
ON public.documents FOR DELETE
USING (
  get_current_user_role() = 'agent'
  AND EXISTS (
    SELECT 1 FROM public.users u
    INNER JOIN public.agents a ON u.agent_id = a.id
    WHERE u.id = documents.client_id
    AND a.user_id = auth.uid()
  )
);

-- ============================================
-- COMENTARIOS Y VERIFICACIÓN
-- ============================================

COMMENT ON POLICY "Admin can view all documents" ON public.documents IS 
  'Admin y Super Admin pueden ver todos los documentos sin restricciones';

COMMENT ON POLICY "Agent can view their clients documents" ON public.documents IS 
  'Agents solo ven documentos de clientes que tienen su agent_id';

COMMENT ON POLICY "Support staff can view documents" ON public.documents IS 
  'Support staff ve según scope: global (todo) o agent_specific (solo su agent asignado)';

COMMENT ON POLICY "Client can view own documents" ON public.documents IS 
  'Clientes solo ven sus propios documentos';

COMMENT ON POLICY "Agent can delete documents" ON public.documents IS 
  'Agents pueden eliminar documentos de sus clientes (según requisitos)';

COMMENT ON POLICY "Support staff can update documents" ON public.documents IS 
  'Support staff puede actualizar documentos según scope (global o agent_specific)';

-- ============================================
-- VERIFICACIÓN POST-EJECUCIÓN
-- ============================================

-- Verificar que RLS está habilitado
-- SELECT tablename, rowsecurity FROM pg_tables 
-- WHERE schemaname = 'public' AND tablename = 'documents';
-- Debe retornar rowsecurity = true

-- Ver todas las políticas activas
-- SELECT policyname, cmd FROM pg_policies 
-- WHERE schemaname = 'public' AND tablename = 'documents'
-- ORDER BY cmd, policyname;

-- Verificar que get_current_user_role() existe
-- SELECT proname FROM pg_proc WHERE proname = 'get_current_user_role';
-- Debe retornar al menos una fila

