-- ============================================
-- POLÍTICAS DE STORAGE PARA DOCUMENTOS
-- ============================================
-- Bucket: documents (crear manualmente en Supabase Dashboard)
-- Configuración del bucket:
--   - Public: false (privado)
--   - File size limit: 10 MB
--   - Allowed MIME types: application/pdf, image/jpeg, image/png, image/jpg

-- ============================================
-- POLÍTICAS PARA SELECT (download/view)
-- ============================================

-- Admin/Super Admin pueden ver todos los documentos
DROP POLICY IF EXISTS "Admin can view all documents" ON storage.objects;
CREATE POLICY "Admin can view all documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents' 
  AND get_current_user_role() IN ('admin', 'super_admin')
);

-- Agent puede ver documentos de sus clientes
DROP POLICY IF EXISTS "Agent can view their clients documents" ON storage.objects;
CREATE POLICY "Agent can view their clients documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents'
  AND get_current_user_role() = 'agent'
  AND EXISTS (
    SELECT 1 FROM public.documents d
    INNER JOIN public.users u ON d.client_id = u.id
    WHERE d.file_url = storage.objects.name
    AND u.agent_id = (SELECT id FROM public.agents WHERE user_id = auth.uid())
  )
);

-- Support Staff (global) puede ver todos los documentos
DROP POLICY IF EXISTS "Support staff global can view all documents" ON storage.objects;
CREATE POLICY "Support staff global can view all documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents'
  AND get_current_user_role() = 'support_staff'
  AND (SELECT scope FROM public.users WHERE id = auth.uid()) = 'global'
);

-- Support Staff (agent-specific) puede ver documentos de clientes de su agente asignado
DROP POLICY IF EXISTS "Support staff agent specific can view documents" ON storage.objects;
CREATE POLICY "Support staff agent specific can view documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents'
  AND get_current_user_role() = 'support_staff'
  AND (SELECT scope FROM public.users WHERE id = auth.uid()) = 'agent_specific'
  AND EXISTS (
    SELECT 1 FROM public.documents d
    INNER JOIN public.users u ON d.client_id = u.id
    WHERE d.file_url = storage.objects.name
    AND u.agent_id = (SELECT assigned_to_agent_id FROM public.users WHERE id = auth.uid())
  )
);

-- Client puede ver sus propios documentos
DROP POLICY IF EXISTS "Client can view own documents" ON storage.objects;
CREATE POLICY "Client can view own documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents'
  AND EXISTS (
    SELECT 1 FROM public.documents
    WHERE file_url = storage.objects.name
    AND client_id = auth.uid()
  )
);

-- ============================================
-- POLÍTICAS PARA INSERT (upload)
-- ============================================

-- Admin/Super Admin pueden subir documentos
DROP POLICY IF EXISTS "Admin can upload documents" ON storage.objects;
CREATE POLICY "Admin can upload documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents'
  AND get_current_user_role() IN ('admin', 'super_admin')
);

-- Agent puede subir documentos
DROP POLICY IF EXISTS "Agent can upload documents" ON storage.objects;
CREATE POLICY "Agent can upload documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents'
  AND get_current_user_role() = 'agent'
);

-- Support Staff puede subir documentos
DROP POLICY IF EXISTS "Support staff can upload documents" ON storage.objects;
CREATE POLICY "Support staff can upload documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents'
  AND get_current_user_role() = 'support_staff'
);

-- Client puede subir sus propios documentos
DROP POLICY IF EXISTS "Client can upload own documents" ON storage.objects;
CREATE POLICY "Client can upload own documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents'
  AND auth.uid() IS NOT NULL
);

-- ============================================
-- POLÍTICAS PARA DELETE
-- ============================================

-- Solo Admin/Super Admin pueden eliminar documentos
DROP POLICY IF EXISTS "Admin can delete documents" ON storage.objects;
CREATE POLICY "Admin can delete documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'documents'
  AND get_current_user_role() IN ('admin', 'super_admin')
);

-- ============================================
-- NOTAS DE CONFIGURACIÓN
-- ============================================
-- 
-- 1. Crear bucket "documents" en Supabase Dashboard:
--    Storage → New bucket → Name: documents, Public: false
--
-- 2. Configurar en Supabase Dashboard:
--    - File size limit: 10485760 (10 MB)
--    - Allowed MIME types: application/pdf,image/jpeg,image/png,image/jpg
--
-- 3. Ejecutar este script en el SQL Editor de Supabase
--
-- 4. Verificar que la función get_current_user_role() existe
--    (debería estar creada en 00-admin-global-access-fixed.sql)

