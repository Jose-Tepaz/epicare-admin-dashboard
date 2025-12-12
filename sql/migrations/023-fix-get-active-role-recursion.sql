-- ============================================
-- MIGRACIÓN URGENTE: Corregir recursión en get_active_role()
-- ============================================
-- PROBLEMA: get_active_role() consulta users, causando recursión
-- cuando se usa en políticas RLS de users.
--
-- SOLUCIÓN: Crear función SECURITY DEFINER que bypass RLS
-- ============================================

-- Crear función helper que obtiene el rol activo SIN causar recursión
CREATE OR REPLACE FUNCTION public.get_active_role_safe()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  result TEXT;
BEGIN
  -- Bypass RLS usando SECURITY DEFINER
  SELECT COALESCE(active_role, role)::text INTO result
  FROM public.users
  WHERE id = auth.uid();
  
  RETURN result;
END;
$$;

-- Reemplazar get_active_role() para que use la versión segura
CREATE OR REPLACE FUNCTION public.get_active_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  result TEXT;
BEGIN
  -- Usar la función segura que bypass RLS
  SELECT COALESCE(active_role, role)::text INTO result
  FROM public.users
  WHERE id = auth.uid();
  
  RETURN result;
END;
$$;

-- También actualizar get_my_role() para evitar recursión
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  result TEXT;
BEGIN
  -- Bypass RLS usando SECURITY DEFINER
  SELECT COALESCE(active_role, role)::text INTO result
  FROM public.users
  WHERE id = auth.uid();
  
  RETURN result;
END;
$$;

-- Actualizar get_current_user_role() también
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS VARCHAR
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  result VARCHAR;
BEGIN
  -- Bypass RLS usando SECURITY DEFINER
  SELECT COALESCE(active_role, role)::varchar INTO result
  FROM public.users
  WHERE id = auth.uid();
  
  RETURN result;
END;
$$;

