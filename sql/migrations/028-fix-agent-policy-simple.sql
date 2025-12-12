-- ============================================
-- MIGRACIÓN: Simplificar política de Agent según documentación
-- ============================================
-- Según documentacion-roles.md:
-- - Agent puede ver "sus clientes"
-- - Agent puede ver "su propia info"
-- - Agent NO puede ver "todos los usuarios"
--
-- SOLUCIÓN: Política simple que verifica active_role y agent_profile_id
-- ============================================

-- Eliminar política actual problemática
DROP POLICY IF EXISTS "users_select_agent" ON public.users;

-- Crear política simple y segura para agents
CREATE POLICY "users_select_agent" ON public.users
  FOR SELECT
  USING (
    -- Solo aplica si el usuario actual tiene active_role = 'agent'
    public.get_my_role() = 'agent'
    AND (
      -- 1. Su propio usuario (siempre permitido)
      id = auth.uid()
      OR
      -- 2. Sus clientes (donde agent_profile_id coincide con su agent_profile_id)
      (
        agent_profile_id IS NOT NULL
        AND agent_profile_id = public.get_my_agent_profile_id()
      )
    )
  );

