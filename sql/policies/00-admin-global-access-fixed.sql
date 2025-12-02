-- ============================================
-- POLÍTICAS GLOBALES PARA ADMIN Y SUPER_ADMIN
-- ============================================
-- VERSIÓN CORREGIDA - Sin recursión infinita
-- Usa funciones SECURITY DEFINER existentes
-- ============================================

-- ============================================
-- USERS - Admin/Super Admin ven TODO
-- ============================================

DROP POLICY IF EXISTS "admin_select_all_users" ON public.users;
CREATE POLICY "admin_select_all_users" ON public.users
  FOR SELECT
  USING (
    get_current_user_role() IN ('super_admin', 'admin')
  );

DROP POLICY IF EXISTS "admin_insert_users" ON public.users;
CREATE POLICY "admin_insert_users" ON public.users
  FOR INSERT
  WITH CHECK (
    get_current_user_role() IN ('super_admin', 'admin')
  );

DROP POLICY IF EXISTS "admin_update_users" ON public.users;
CREATE POLICY "admin_update_users" ON public.users
  FOR UPDATE
  USING (
    get_current_user_role() IN ('super_admin', 'admin')
  );

DROP POLICY IF EXISTS "admin_delete_users" ON public.users;
CREATE POLICY "admin_delete_users" ON public.users
  FOR DELETE
  USING (
    get_current_user_role() IN ('super_admin', 'admin')
    -- Protección: super_admin no puede eliminarse a sí mismo
    AND (users.id != auth.uid() OR get_current_user_role() != 'super_admin')
  );

-- ============================================
-- APPLICATIONS - Admin/Super Admin ven TODO
-- ============================================

DROP POLICY IF EXISTS "admin_select_all_applications" ON public.applications;
CREATE POLICY "admin_select_all_applications" ON public.applications
  FOR SELECT
  USING (
    get_current_user_role() IN ('super_admin', 'admin')
  );

DROP POLICY IF EXISTS "admin_insert_applications" ON public.applications;
CREATE POLICY "admin_insert_applications" ON public.applications
  FOR INSERT
  WITH CHECK (
    get_current_user_role() IN ('super_admin', 'admin')
  );

DROP POLICY IF EXISTS "admin_update_applications" ON public.applications;
CREATE POLICY "admin_update_applications" ON public.applications
  FOR UPDATE
  USING (
    get_current_user_role() IN ('super_admin', 'admin')
  );

DROP POLICY IF EXISTS "admin_delete_applications" ON public.applications;
CREATE POLICY "admin_delete_applications" ON public.applications
  FOR DELETE
  USING (
    get_current_user_role() IN ('super_admin', 'admin')
  );

-- ============================================
-- SUPPORT_TICKETS - Admin/Super Admin ven TODO
-- ============================================

DROP POLICY IF EXISTS "admin_select_all_tickets" ON public.support_tickets;
CREATE POLICY "admin_select_all_tickets" ON public.support_tickets
  FOR SELECT
  USING (
    get_current_user_role() IN ('super_admin', 'admin')
  );

DROP POLICY IF EXISTS "admin_insert_tickets" ON public.support_tickets;
CREATE POLICY "admin_insert_tickets" ON public.support_tickets
  FOR INSERT
  WITH CHECK (
    get_current_user_role() IN ('super_admin', 'admin')
  );

DROP POLICY IF EXISTS "admin_update_tickets" ON public.support_tickets;
CREATE POLICY "admin_update_tickets" ON public.support_tickets
  FOR UPDATE
  USING (
    get_current_user_role() IN ('super_admin', 'admin')
  );

DROP POLICY IF EXISTS "admin_delete_tickets" ON public.support_tickets;
CREATE POLICY "admin_delete_tickets" ON public.support_tickets
  FOR DELETE
  USING (
    get_current_user_role() IN ('super_admin', 'admin')
  );

-- ============================================
-- TICKET_MESSAGES - Admin/Super Admin ven TODO
-- ============================================

DROP POLICY IF EXISTS "admin_select_all_ticket_messages" ON public.ticket_messages;
CREATE POLICY "admin_select_all_ticket_messages" ON public.ticket_messages
  FOR SELECT
  USING (
    get_current_user_role() IN ('super_admin', 'admin')
  );

DROP POLICY IF EXISTS "admin_insert_ticket_messages" ON public.ticket_messages;
CREATE POLICY "admin_insert_ticket_messages" ON public.ticket_messages
  FOR INSERT
  WITH CHECK (
    get_current_user_role() IN ('super_admin', 'admin')
  );

DROP POLICY IF EXISTS "admin_update_ticket_messages" ON public.ticket_messages;
CREATE POLICY "admin_update_ticket_messages" ON public.ticket_messages
  FOR UPDATE
  USING (
    get_current_user_role() IN ('super_admin', 'admin')
  );

DROP POLICY IF EXISTS "admin_delete_ticket_messages" ON public.ticket_messages;
CREATE POLICY "admin_delete_ticket_messages" ON public.ticket_messages
  FOR DELETE
  USING (
    get_current_user_role() IN ('super_admin', 'admin')
  );

-- ============================================
-- DOCUMENTS - Admin/Super Admin ven TODO
-- ============================================

DROP POLICY IF EXISTS "admin_select_all_documents" ON public.documents;
CREATE POLICY "admin_select_all_documents" ON public.documents
  FOR SELECT
  USING (
    get_current_user_role() IN ('super_admin', 'admin')
  );

DROP POLICY IF EXISTS "admin_insert_documents" ON public.documents;
CREATE POLICY "admin_insert_documents" ON public.documents
  FOR INSERT
  WITH CHECK (
    get_current_user_role() IN ('super_admin', 'admin')
  );

DROP POLICY IF EXISTS "admin_update_documents" ON public.documents;
CREATE POLICY "admin_update_documents" ON public.documents
  FOR UPDATE
  USING (
    get_current_user_role() IN ('super_admin', 'admin')
  );

DROP POLICY IF EXISTS "admin_delete_documents" ON public.documents;
CREATE POLICY "admin_delete_documents" ON public.documents
  FOR DELETE
  USING (
    get_current_user_role() IN ('super_admin', 'admin')
  );

-- ============================================
-- AGENTS - Admin/Super Admin ven TODO
-- ============================================

DROP POLICY IF EXISTS "admin_select_all_agents" ON public.agents;
CREATE POLICY "admin_select_all_agents" ON public.agents
  FOR SELECT
  USING (
    get_current_user_role() IN ('super_admin', 'admin')
  );

DROP POLICY IF EXISTS "admin_insert_agents" ON public.agents;
CREATE POLICY "admin_insert_agents" ON public.agents
  FOR INSERT
  WITH CHECK (
    get_current_user_role() IN ('super_admin', 'admin')
  );

DROP POLICY IF EXISTS "admin_update_agents" ON public.agents;
CREATE POLICY "admin_update_agents" ON public.agents
  FOR UPDATE
  USING (
    get_current_user_role() IN ('super_admin', 'admin')
  );

DROP POLICY IF EXISTS "admin_delete_agents" ON public.agents;
CREATE POLICY "admin_delete_agents" ON public.agents
  FOR DELETE
  USING (
    get_current_user_role() IN ('super_admin', 'admin')
  );

-- ============================================
-- APPLICANTS - Admin/Super Admin ven TODO
-- ============================================

DROP POLICY IF EXISTS "admin_select_all_applicants" ON public.applicants;
CREATE POLICY "admin_select_all_applicants" ON public.applicants
  FOR SELECT
  USING (
    get_current_user_role() IN ('super_admin', 'admin')
  );

DROP POLICY IF EXISTS "admin_insert_applicants" ON public.applicants;
CREATE POLICY "admin_insert_applicants" ON public.applicants
  FOR INSERT
  WITH CHECK (
    get_current_user_role() IN ('super_admin', 'admin')
  );

DROP POLICY IF EXISTS "admin_update_applicants" ON public.applicants;
CREATE POLICY "admin_update_applicants" ON public.applicants
  FOR UPDATE
  USING (
    get_current_user_role() IN ('super_admin', 'admin')
  );

-- ============================================
-- COVERAGES - Admin/Super Admin ven TODO
-- ============================================

DROP POLICY IF EXISTS "admin_select_all_coverages" ON public.coverages;
CREATE POLICY "admin_select_all_coverages" ON public.coverages
  FOR SELECT
  USING (
    get_current_user_role() IN ('super_admin', 'admin')
  );

-- ============================================
-- APPLICATION_NOTES - Admin/Super Admin ven TODO
-- ============================================

DROP POLICY IF EXISTS "admin_select_all_application_notes" ON public.application_notes;
CREATE POLICY "admin_select_all_application_notes" ON public.application_notes
  FOR SELECT
  USING (
    get_current_user_role() IN ('super_admin', 'admin')
  );

DROP POLICY IF EXISTS "admin_insert_application_notes" ON public.application_notes;
CREATE POLICY "admin_insert_application_notes" ON public.application_notes
  FOR INSERT
  WITH CHECK (
    get_current_user_role() IN ('super_admin', 'admin')
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

-- Para verificar que get_current_user_role() existe:
-- SELECT routine_name, routine_type 
-- FROM information_schema.routines 
-- WHERE routine_schema = 'public' 
-- AND routine_name = 'get_current_user_role';

