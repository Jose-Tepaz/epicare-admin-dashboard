-- ============================================
-- MIGRACIÓN: Corregir política completa para Agents
-- ============================================
-- PROBLEMA: Agents están viendo usuarios que no son sus clientes
-- SOLUCIÓN: Política más restrictiva que solo permite:
-- 1. Su propio usuario
-- 2. Sus clientes (agent_profile_id = su agent_profile_id)
-- 3. Support staff asignado a ellos (scope = agent_specific y assigned_to_agent_id relacionado)
-- ============================================

-- Eliminar política actual
DROP POLICY IF EXISTS "users_select_agent" ON public.users;

-- Crear política completa para agents
CREATE POLICY "users_select_agent" ON public.users
  FOR SELECT
  USING (
    -- Verificar que el usuario actual es agent
    public.get_my_role() = 'agent'
    AND (
      -- 1. Su propio usuario
      id = auth.uid()
      OR
      -- 2. Sus clientes (donde agent_profile_id coincide con su agent_profile_id)
      agent_profile_id = public.get_my_agent_profile_id()
      OR
      -- 3. Support staff asignado a él
      -- (scope = agent_specific y assigned_to_agent_id está en sus agent_insurance_registrations)
      (
        role = 'support_staff'
        AND scope = 'agent_specific'
        AND assigned_to_agent_id IN (
          SELECT id FROM public.agent_insurance_registrations
          WHERE agent_profile_id = public.get_my_agent_profile_id()
        )
      )
    )
  );

