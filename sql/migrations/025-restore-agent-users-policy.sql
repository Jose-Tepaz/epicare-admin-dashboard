-- ============================================
-- MIGRACIÓN: Restaurar política para Agents ver sus clientes
-- ============================================
-- PROBLEMA: Los agents pueden ver todos los usuarios
-- SOLUCIÓN: Crear política que permita a agents ver solo sus clientes
-- sin causar recursión usando funciones SECURITY DEFINER
-- ============================================

-- Crear función helper para obtener agent_profile_id sin recursión
CREATE OR REPLACE FUNCTION public.get_my_agent_profile_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  profile_id UUID;
BEGIN
  -- Bypass RLS usando SECURITY DEFINER
  SELECT id INTO profile_id
  FROM public.agent_profiles
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  RETURN profile_id;
END;
$$;

-- Política: Agents pueden ver sus propios clientes
DROP POLICY IF EXISTS "users_select_agent" ON public.users;

CREATE POLICY "users_select_agent" ON public.users
  FOR SELECT
  USING (
    -- Verificar que el usuario actual es agent usando función SECURITY DEFINER
    public.get_my_role() = 'agent'
    AND (
      -- Ve clientes que tienen su agent_profile_id
      agent_profile_id = public.get_my_agent_profile_id()
      OR
      -- Ve usuarios que él mismo creó
      created_by = auth.uid()
    )
  );

