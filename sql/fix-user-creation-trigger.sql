-- ============================================
-- FIX: Permitir creación de usuarios desde auth
-- ============================================
-- Este script agrega un valor DEFAULT al campo role
-- para que el trigger automático de Supabase no falle

-- Opción 1: Agregar DEFAULT 'client' al campo role
ALTER TABLE public.users 
  ALTER COLUMN role SET DEFAULT 'client';

-- ============================================
-- Verificar si existe un trigger handle_new_user
-- ============================================
-- Si existe, lo actualizaremos para que use el rol de metadata

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Intentar obtener el rol desde metadata
  user_role := COALESCE(
    NEW.raw_user_meta_data->>'role',
    'client'
  );

  -- Insertar usuario con el rol apropiado
  INSERT INTO public.users (
    id,
    email,
    first_name,
    last_name,
    role,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    user_role,
    NOW(),
    NOW()
  );

  RETURN NEW;
END;
$$;

-- Crear o reemplazar el trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- COMENTARIOS
-- ============================================
COMMENT ON FUNCTION public.handle_new_user() IS
  'Trigger function que crea automáticamente un registro en public.users cuando se crea un usuario en auth.users. El rol se obtiene de metadata o usa ''client'' por defecto.';

