-- ============================================
-- POLÍTICAS GLOBALES PARA ADMIN Y SUPER_ADMIN
-- ============================================
-- Estas políticas permiten que admin y super_admin
-- tengan acceso COMPLETO a todas las tablas
-- ============================================

-- ============================================
-- USERS - Admin/Super Admin ven TODO
-- ============================================

DROP POLICY IF EXISTS "admin_select_all_users" ON public.users;
CREATE POLICY "admin_select_all_users" ON public.users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('super_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "admin_insert_users" ON public.users;
CREATE POLICY "admin_insert_users" ON public.users
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('super_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "admin_update_users" ON public.users;
CREATE POLICY "admin_update_users" ON public.users
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('super_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "admin_delete_users" ON public.users;
CREATE POLICY "admin_delete_users" ON public.users
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('super_admin', 'admin')
      -- Protección: super_admin no puede eliminarse a sí mismo
      AND (users.id != auth.uid() OR u.role != 'super_admin')
    )
  );

-- ============================================
-- APPLICATIONS - Admin/Super Admin ven TODO
-- ============================================

DROP POLICY IF EXISTS "admin_select_all_applications" ON public.applications;
CREATE POLICY "admin_select_all_applications" ON public.applications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('super_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "admin_insert_applications" ON public.applications;
CREATE POLICY "admin_insert_applications" ON public.applications
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('super_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "admin_update_applications" ON public.applications;
CREATE POLICY "admin_update_applications" ON public.applications
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('super_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "admin_delete_applications" ON public.applications;
CREATE POLICY "admin_delete_applications" ON public.applications
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('super_admin', 'admin')
    )
  );

-- ============================================
-- SUPPORT_TICKETS - Admin/Super Admin ven TODO
-- ============================================

DROP POLICY IF EXISTS "admin_select_all_tickets" ON public.support_tickets;
CREATE POLICY "admin_select_all_tickets" ON public.support_tickets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('super_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "admin_insert_tickets" ON public.support_tickets;
CREATE POLICY "admin_insert_tickets" ON public.support_tickets
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('super_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "admin_update_tickets" ON public.support_tickets;
CREATE POLICY "admin_update_tickets" ON public.support_tickets
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('super_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "admin_delete_tickets" ON public.support_tickets;
CREATE POLICY "admin_delete_tickets" ON public.support_tickets
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('super_admin', 'admin')
    )
  );

-- ============================================
-- DOCUMENTS - Admin/Super Admin ven TODO
-- ============================================

DROP POLICY IF EXISTS "admin_select_all_documents" ON public.documents;
CREATE POLICY "admin_select_all_documents" ON public.documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('super_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "admin_insert_documents" ON public.documents;
CREATE POLICY "admin_insert_documents" ON public.documents
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('super_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "admin_update_documents" ON public.documents;
CREATE POLICY "admin_update_documents" ON public.documents
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('super_admin', 'admin')
    )
  );

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

-- ============================================
-- AGENTS - Admin/Super Admin ven TODO
-- ============================================

DROP POLICY IF EXISTS "admin_select_all_agents" ON public.agents;
CREATE POLICY "admin_select_all_agents" ON public.agents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('super_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "admin_insert_agents" ON public.agents;
CREATE POLICY "admin_insert_agents" ON public.agents
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('super_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "admin_update_agents" ON public.agents;
CREATE POLICY "admin_update_agents" ON public.agents
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('super_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "admin_delete_agents" ON public.agents;
CREATE POLICY "admin_delete_agents" ON public.agents
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('super_admin', 'admin')
    )
  );

-- ============================================
-- CLIENT - Policy para que vea su propia información
-- ============================================

DROP POLICY IF EXISTS "client_select_own_user" ON public.users;
CREATE POLICY "client_select_own_user" ON public.users
  FOR SELECT
  USING (
    id = auth.uid()
  );

DROP POLICY IF EXISTS "client_update_own_user" ON public.users;
CREATE POLICY "client_update_own_user" ON public.users
  FOR UPDATE
  USING (
    id = auth.uid()
  );

-- ============================================
-- VERIFICACIÓN
-- ============================================
-- Para verificar que las políticas se crearon correctamente:
-- SELECT tablename, policyname, permissive, roles, cmd 
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('users', 'applications', 'support_tickets', 'documents', 'agents')
-- ORDER BY tablename, policyname;

