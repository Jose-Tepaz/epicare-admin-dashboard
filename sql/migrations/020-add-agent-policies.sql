-- ============================================
-- MIGRACIÓN: Agregar políticas RLS para Agents
-- ============================================
-- Esta migración agrega políticas para que los agents puedan ver
-- applications, documents y users de sus propios clientes.
--
-- RELACIÓN DE TABLAS:
-- - applications.agent_id → agent_insurance_registrations.id
-- - agent_insurance_registrations.agent_profile_id → agent_profiles.id
-- - agent_profiles.user_id → users.id (el usuario agente)
--
-- IMPORTANTE: Ejecutar en Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. POLÍTICA PARA AGENTS EN applications
-- ============================================
-- Los agents pueden ver applications donde el agent_id corresponde
-- a un registro en agent_insurance_registrations que pertenece a su agent_profile

DROP POLICY IF EXISTS "applications_select_agent" ON public.applications;

CREATE POLICY "applications_select_agent" ON public.applications
  FOR SELECT
  USING (
    get_my_role() = 'agent'
    AND EXISTS (
      SELECT 1 FROM public.agent_insurance_registrations air
      WHERE air.id = applications.agent_id
      AND air.agent_profile_id = (
        SELECT id FROM public.agent_profiles 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Los agents pueden actualizar applications de sus clientes
DROP POLICY IF EXISTS "applications_update_agent" ON public.applications;

CREATE POLICY "applications_update_agent" ON public.applications
  FOR UPDATE
  USING (
    get_my_role() = 'agent'
    AND EXISTS (
      SELECT 1 FROM public.agent_insurance_registrations air
      WHERE air.id = applications.agent_id
      AND air.agent_profile_id = (
        SELECT id FROM public.agent_profiles 
        WHERE user_id = auth.uid()
      )
    )
  );

-- ============================================
-- 2. POLÍTICA PARA AGENTS EN users
-- ============================================
-- Los agents pueden ver sus propios clientes
-- (donde agent_profile_id coincide con su agent_profiles.id)

DROP POLICY IF EXISTS "users_select_agent" ON public.users;

CREATE POLICY "users_select_agent" ON public.users
  FOR SELECT
  USING (
    get_my_role() = 'agent'
    AND (
      -- Ve clientes que tienen su agent_profile_id
      agent_profile_id = (
        SELECT id FROM public.agent_profiles 
        WHERE user_id = auth.uid()
      )
      OR
      -- Ve usuarios que él mismo creó
      created_by = auth.uid()
    )
  );

-- ============================================
-- 3. POLÍTICA PARA AGENTS EN documents
-- ============================================
-- Los agents pueden ver documentos de sus clientes

DROP POLICY IF EXISTS "documents_select_agent" ON public.documents;
DROP POLICY IF EXISTS "Agent can view client documents" ON public.documents;

CREATE POLICY "documents_select_agent" ON public.documents
  FOR SELECT
  USING (
    get_my_role() = 'agent'
    AND client_id IN (
      SELECT id FROM public.users 
      WHERE agent_profile_id = (
        SELECT id FROM public.agent_profiles 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Los agents pueden actualizar documentos de sus clientes
DROP POLICY IF EXISTS "documents_update_agent" ON public.documents;

CREATE POLICY "documents_update_agent" ON public.documents
  FOR UPDATE
  USING (
    get_my_role() = 'agent'
    AND client_id IN (
      SELECT id FROM public.users 
      WHERE agent_profile_id = (
        SELECT id FROM public.agent_profiles 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Los agents pueden subir documentos para sus clientes
DROP POLICY IF EXISTS "documents_insert_agent" ON public.documents;

CREATE POLICY "documents_insert_agent" ON public.documents
  FOR INSERT
  WITH CHECK (
    get_my_role() = 'agent'
    AND client_id IN (
      SELECT id FROM public.users 
      WHERE agent_profile_id = (
        SELECT id FROM public.agent_profiles 
        WHERE user_id = auth.uid()
      )
    )
  );

-- ============================================
-- 4. POLÍTICA PARA AGENTS EN support_tickets
-- ============================================
-- Los agents pueden ver tickets de sus clientes

DROP POLICY IF EXISTS "tickets_select_agent" ON public.support_tickets;

CREATE POLICY "tickets_select_agent" ON public.support_tickets
  FOR SELECT
  USING (
    get_my_role() = 'agent'
    AND client_id IN (
      SELECT id FROM public.users 
      WHERE agent_profile_id = (
        SELECT id FROM public.agent_profiles 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Los agents pueden actualizar tickets de sus clientes
DROP POLICY IF EXISTS "tickets_update_agent" ON public.support_tickets;

CREATE POLICY "tickets_update_agent" ON public.support_tickets
  FOR UPDATE
  USING (
    get_my_role() = 'agent'
    AND client_id IN (
      SELECT id FROM public.users 
      WHERE agent_profile_id = (
        SELECT id FROM public.agent_profiles 
        WHERE user_id = auth.uid()
      )
    )
  );

-- ============================================
-- VERIFICACIÓN
-- ============================================
-- Ejecuta esta consulta para verificar que las políticas se crearon:
-- SELECT policyname, tablename, cmd 
-- FROM pg_policies 
-- WHERE policyname LIKE '%agent%' AND schemaname = 'public';
