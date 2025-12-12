-- ============================================
-- MIGRACIÓN URGENTE: Corregir recursión infinita en políticas
-- ============================================
-- La política users_select_agent causa recursión infinita porque
-- get_my_role() consulta la tabla users internamente.
--
-- EJECUTAR INMEDIATAMENTE EN SUPABASE SQL EDITOR
-- ============================================

-- 1. ELIMINAR POLÍTICAS PROBLEMÁTICAS DE USERS
DROP POLICY IF EXISTS "users_select_agent" ON public.users;

-- 2. CREAR POLÍTICA CORREGIDA PARA AGENTS EN USERS
-- En lugar de usar get_my_role(), verificamos directamente en agent_profiles
-- si el usuario actual tiene un perfil de agente

CREATE POLICY "users_select_agent" ON public.users
  FOR SELECT
  USING (
    -- Verificar que el usuario actual tiene un agent_profile (es un agent)
    EXISTS (
      SELECT 1 FROM public.agent_profiles ap
      WHERE ap.user_id = auth.uid()
    )
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
-- NOTA: Las políticas de applications, documents y support_tickets
-- NO tienen este problema porque no consultan la tabla users
-- en su verificación de rol (usan get_my_role() que consulta users,
-- pero no están EN la tabla users).
-- ============================================

