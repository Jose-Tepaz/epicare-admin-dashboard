-- ============================================
-- LIMPIEZA COMPLETA Y RECREACIÓN DE POLÍTICAS RLS PARA DOCUMENTS
-- ============================================
-- Este script elimina TODAS las políticas existentes (incluyendo duplicadas)
-- y recrea solo las políticas correctas
-- ============================================

-- ============================================
-- ENABLE RLS
-- ============================================
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- ============================================
-- LIMPIAR TODAS LAS POLÍTICAS EXISTENTES
-- ============================================
-- Eliminar TODAS las políticas para empezar limpio

-- Políticas del script 7 (versiones anteriores)
DROP POLICY IF EXISTS "super_admin_all_documents" ON public.documents;
DROP POLICY IF EXISTS "admin_all_documents" ON public.documents;
DROP POLICY IF EXISTS "agent_view_client_documents" ON public.documents;
DROP POLICY IF EXISTS "agent_manage_client_documents" ON public.documents;
DROP POLICY IF EXISTS "support_view_documents" ON public.documents;
DROP POLICY IF EXISTS "support_manage_documents" ON public.documents;
DROP POLICY IF EXISTS "support_update_documents" ON public.documents;
DROP POLICY IF EXISTS "client_view_own_documents" ON public.documents;

-- Políticas con nombres descriptivos (versión actual)
DROP POLICY IF EXISTS "Admin can view all documents" ON public.documents;
DROP POLICY IF EXISTS "Agent can view their clients documents" ON public.documents;
DROP POLICY IF EXISTS "Support staff global can view all documents" ON public.documents;
DROP POLICY IF EXISTS "Support staff agent specific can view documents" ON public.documents;
DROP POLICY IF EXISTS "Support staff can view documents" ON public.documents;
DROP POLICY IF EXISTS "Client can view own documents" ON public.documents;
DROP POLICY IF EXISTS "Admin can upload documents" ON public.documents;
DROP POLICY IF EXISTS "Agent can upload documents" ON public.documents;
DROP POLICY IF EXISTS "Support staff global can upload documents" ON public.documents;
DROP POLICY IF EXISTS "Support staff agent specific can upload documents" ON public.documents;
DROP POLICY IF EXISTS "Support staff can upload documents" ON public.documents;
DROP POLICY IF EXISTS "Client can upload own documents" ON public.documents;
DROP POLICY IF EXISTS "Admin can update documents" ON public.documents;
DROP POLICY IF EXISTS "Agent can update their clients documents" ON public.documents;
DROP POLICY IF EXISTS "Support staff global can update documents" ON public.documents;
DROP POLICY IF EXISTS "Support staff agent specific can update documents" ON public.documents;
DROP POLICY IF EXISTS "Support staff can update documents" ON public.documents;
DROP POLICY IF EXISTS "Admin can delete documents" ON public.documents;
DROP POLICY IF EXISTS "Agent can delete documents" ON public.documents;

-- Políticas con nombres cortos (de otros scripts)
DROP POLICY IF EXISTS "admin_select_all_documents" ON public.documents;
DROP POLICY IF EXISTS "admin_insert_documents" ON public.documents;
DROP POLICY IF EXISTS "admin_update_documents" ON public.documents;
DROP POLICY IF EXISTS "admin_delete_documents" ON public.documents;
DROP POLICY IF EXISTS "support_staff_select_documents" ON public.documents;
DROP POLICY IF EXISTS "support_staff_insert_documents" ON public.documents;
DROP POLICY IF EXISTS "support_staff_update_documents" ON public.documents;

-- Verificar que no quedan políticas (opcional, para debugging)
-- SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'documents';

-- ============================================
-- SELECT POLICIES (View documents)
-- ============================================

-- Admin/Super Admin can view all documents
CREATE POLICY "Admin can view all documents"
ON public.documents FOR SELECT
USING (
  get_current_user_role() IN ('admin', 'super_admin')
);

-- Agent can view documents of their clients
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
-- VERIFICACIÓN POST-EJECUCIÓN
-- ============================================

-- Después de ejecutar, verifica que solo hay estas políticas:
-- SELECT policyname, cmd FROM pg_policies 
-- WHERE schemaname = 'public' AND tablename = 'documents'
-- ORDER BY cmd, policyname;
--
-- Deberías ver exactamente 12 políticas:
-- SELECT: Admin can view all documents, Agent can view their clients documents, Support staff can view documents, Client can view own documents
-- INSERT: Admin can upload documents, Agent can upload documents, Support staff can upload documents, Client can upload own documents
-- UPDATE: Admin can update documents, Agent can update their clients documents, Support staff can update documents
-- DELETE: Admin can delete documents, Agent can delete documents

-- Verificar que RLS está habilitado
-- SELECT tablename, rowsecurity FROM pg_tables 
-- WHERE schemaname = 'public' AND tablename = 'documents';
-- Debe retornar rowsecurity = true

-- Verificar que get_current_user_role() existe
-- SELECT proname FROM pg_proc WHERE proname = 'get_current_user_role';
-- Debe retornar al menos una fila

