-- ============================================
-- POLÍTICAS RLS PARA DOCUMENTS
-- ============================================
-- Control de acceso, versioning y permisos granulares
-- para gestión de documentos por rol
--
-- ⚠️ IMPORTANTE: Siempre usar users.role directamente
-- ✅ CORRECTO:   WHERE u.role = 'agent'
-- ❌ INCORRECTO: JOIN user_roles ur ... JOIN roles r ...
-- Ver USER-ROLE.MD para más detalles
-- ============================================

-- ============================================
-- POLÍTICAS DE INSERT (Upload)
-- ============================================

-- Super Admin y Admin pueden subir para cualquier cliente
-- (Ya existe en supabase-admin-policies.sql)

-- Agent puede subir documents para sus clients
DROP POLICY IF EXISTS "agent_insert_documents" ON public.documents;
CREATE POLICY "agent_insert_documents" ON public.documents
  FOR INSERT
  WITH CHECK (
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

-- Support Staff puede subir documents (según scope)
DROP POLICY IF EXISTS "support_staff_insert_documents" ON public.documents;
CREATE POLICY "support_staff_insert_documents" ON public.documents
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role = 'support_staff'
      AND (
        u.scope = 'global'
        OR
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
-- POLÍTICAS DE UPDATE (Replace/Expire)
-- ============================================

-- Admin puede actualizar cualquier document
-- (Ya existe)

-- Agent puede actualizar documents de sus clients
DROP POLICY IF EXISTS "agent_update_documents" ON public.documents;
CREATE POLICY "agent_update_documents" ON public.documents
  FOR UPDATE
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

-- Support Staff puede actualizar (replace/expire, pero NO delete)
DROP POLICY IF EXISTS "support_staff_update_documents" ON public.documents;
CREATE POLICY "support_staff_update_documents" ON public.documents
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
-- POLÍTICAS DE DELETE
-- ============================================

-- Solo Admin y Super Admin pueden eliminar
DROP POLICY IF EXISTS "admin_delete_documents" ON public.documents;
CREATE POLICY "admin_delete_documents" ON public.documents
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('super_admin', 'admin')
    )
  );

-- Agent puede eliminar documents de sus clients
DROP POLICY IF EXISTS "agent_delete_documents" ON public.documents;
CREATE POLICY "agent_delete_documents" ON public.documents
  FOR DELETE
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

-- ============================================
-- FUNCIÓN: Expirar documento
-- ============================================

CREATE OR REPLACE FUNCTION expire_document(
  p_document_id UUID,
  p_expired_by UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
  doc_status TEXT;
BEGIN
  -- Obtener rol del usuario
  SELECT role INTO user_role
  FROM public.users
  WHERE id = p_expired_by;
  
  -- Verificar permisos
  IF user_role NOT IN ('super_admin', 'admin', 'agent', 'support_staff') THEN
    RAISE EXCEPTION 'User does not have permission to expire documents';
  END IF;
  
  -- Obtener estado actual del documento
  SELECT status INTO doc_status
  FROM public.documents
  WHERE id = p_document_id;
  
  IF doc_status IS NULL THEN
    RAISE EXCEPTION 'Document not found';
  END IF;
  
  IF doc_status = 'expired' THEN
    RAISE EXCEPTION 'Document is already expired';
  END IF;
  
  -- Actualizar documento
  UPDATE public.documents
  SET 
    status = 'expired',
    expired_by = p_expired_by,
    expired_at = NOW(),
    expiration_reason = p_reason
  WHERE id = p_document_id;
  
  -- Log en activity logs
  INSERT INTO public.admin_activity_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    metadata,
    old_values,
    new_values
  ) VALUES (
    p_expired_by,
    'document_expired',
    'document',
    p_document_id,
    jsonb_build_object('reason', p_reason),
    jsonb_build_object('status', doc_status),
    jsonb_build_object('status', 'expired')
  );
  
  RETURN TRUE;
END;
$$;

-- ============================================
-- FUNCIÓN: Reemplazar documento (versioning)
-- ============================================

CREATE OR REPLACE FUNCTION replace_document(
  p_old_document_id UUID,
  p_new_file_url TEXT,
  p_new_file_name TEXT,
  p_replaced_by UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
  old_doc RECORD;
  new_document_id UUID;
BEGIN
  -- Obtener rol del usuario
  SELECT role INTO user_role
  FROM public.users
  WHERE id = p_replaced_by;
  
  -- Verificar permisos
  IF user_role NOT IN ('super_admin', 'admin', 'agent', 'support_staff') THEN
    RAISE EXCEPTION 'User does not have permission to replace documents';
  END IF;
  
  -- Obtener documento anterior
  SELECT * INTO old_doc
  FROM public.documents
  WHERE id = p_old_document_id;
  
  IF old_doc IS NULL THEN
    RAISE EXCEPTION 'Document not found';
  END IF;
  
  -- Crear nuevo documento
  INSERT INTO public.documents (
    client_id,
    document_type,
    file_name,
    file_url,
    file_size,
    mime_type,
    status,
    uploaded_by,
    replaces_document_id,
    replacement_reason
  ) VALUES (
    old_doc.client_id,
    old_doc.document_type,
    p_new_file_name,
    p_new_file_url,
    old_doc.file_size, -- Se actualizará después del upload
    old_doc.mime_type,
    'active',
    p_replaced_by,
    p_old_document_id,
    p_reason
  )
  RETURNING id INTO new_document_id;
  
  -- Marcar documento anterior como replaced
  UPDATE public.documents
  SET 
    status = 'replaced',
    replaced_by_document_id = new_document_id,
    replaced_at = NOW()
  WHERE id = p_old_document_id;
  
  -- Log en activity logs
  INSERT INTO public.admin_activity_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    metadata,
    old_values,
    new_values
  ) VALUES (
    p_replaced_by,
    'document_replaced',
    'document',
    p_old_document_id,
    jsonb_build_object(
      'reason', p_reason,
      'new_document_id', new_document_id,
      'new_file_name', p_new_file_name
    ),
    jsonb_build_object('file_name', old_doc.file_name),
    jsonb_build_object('file_name', p_new_file_name)
  );
  
  RETURN new_document_id;
END;
$$;

-- ============================================
-- TRIGGER: Auto-set uploaded_by
-- ============================================

CREATE OR REPLACE FUNCTION set_document_uploaded_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.uploaded_by IS NULL THEN
    NEW.uploaded_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_uploaded_by ON public.documents;
CREATE TRIGGER trigger_set_uploaded_by
  BEFORE INSERT ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION set_document_uploaded_by();

-- ============================================
-- FUNCIÓN: Obtener historial de versiones de un documento
-- ============================================

CREATE OR REPLACE FUNCTION get_document_version_history(p_document_id UUID)
RETURNS TABLE (
  id UUID,
  file_name TEXT,
  file_url TEXT,
  status TEXT,
  uploaded_by UUID,
  uploaded_at TIMESTAMPTZ,
  replaced_at TIMESTAMPTZ,
  replacement_reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE version_chain AS (
    -- Documento inicial
    SELECT 
      d.id,
      d.file_name,
      d.file_url,
      d.status,
      d.uploaded_by,
      d.created_at as uploaded_at,
      d.replaced_at,
      d.replacement_reason
    FROM public.documents d
    WHERE d.id = p_document_id
    
    UNION ALL
    
    -- Documentos anteriores
    SELECT 
      d.id,
      d.file_name,
      d.file_url,
      d.status,
      d.uploaded_by,
      d.created_at,
      d.replaced_at,
      d.replacement_reason
    FROM public.documents d
    INNER JOIN version_chain vc ON d.replaced_by_document_id = vc.id
  )
  SELECT * FROM version_chain
  ORDER BY uploaded_at DESC;
END;
$$;

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================

-- Índice para búsquedas por client_id y status
CREATE INDEX IF NOT EXISTS idx_documents_client_status 
  ON public.documents(client_id, status);

-- Índice para búsquedas por document_type
CREATE INDEX IF NOT EXISTS idx_documents_type 
  ON public.documents(document_type);

-- Índice para versioning
CREATE INDEX IF NOT EXISTS idx_documents_replaces 
  ON public.documents(replaces_document_id) 
  WHERE replaces_document_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_documents_replaced_by 
  ON public.documents(replaced_by_document_id) 
  WHERE replaced_by_document_id IS NOT NULL;

-- Índice para búsquedas por fecha
CREATE INDEX IF NOT EXISTS idx_documents_created 
  ON public.documents(created_at DESC);

-- ============================================
-- COMENTARIOS
-- ============================================

COMMENT ON FUNCTION expire_document IS 
  'Marca un documento como expirado con razón y logging automático';

COMMENT ON FUNCTION replace_document IS 
  'Reemplaza un documento creando una nueva versión y manteniendo historial';

COMMENT ON FUNCTION set_document_uploaded_by IS 
  'Trigger function que auto-asigna uploaded_by al usuario actual';

COMMENT ON FUNCTION get_document_version_history IS 
  'Obtiene el historial completo de versiones de un documento';

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Para verificar las políticas:
-- SELECT * FROM pg_policies WHERE tablename = 'documents';

-- Para verificar historial de versiones:
-- SELECT * FROM get_document_version_history('<document_id>');

