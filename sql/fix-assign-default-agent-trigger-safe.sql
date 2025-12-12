-- ============================================
-- FIX: Corregir trigger assign_default_agent_to_new_user
-- ============================================
-- PROBLEMA: El trigger intenta acceder a NEW.agent_id que no existe
-- en la tabla users cuando se crean usuarios con roles diferentes a 'client'
--
-- SOLUCIÓN: Verificar que el campo existe antes de acceder, o mejor aún,
-- solo ejecutar cuando el rol es 'client'
-- ============================================

-- Actualizar la función para que sea más segura
-- Verificar PRIMERO el rol antes de acceder a agent_id
CREATE OR REPLACE FUNCTION assign_default_agent_to_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_agent_id UUID;
  agent_id_value UUID;
BEGIN
  -- ⚠️ IMPORTANTE: Verificar PRIMERO el rol antes de acceder a agent_id
  -- Si el rol no es 'client', retornar inmediatamente sin acceder a agent_id
  IF NEW.role != 'client' THEN
    RETURN NEW;
  END IF;

  -- Solo llegar aquí si role = 'client'
  -- Intentar acceder a agent_id de forma segura usando un bloque EXCEPTION
  BEGIN
    -- Intentar obtener el valor de agent_id
    -- Si el campo no existe, esto lanzará un error que capturaremos
    agent_id_value := NEW.agent_id;
    
    -- Si llegamos aquí, el campo existe
    IF agent_id_value IS NULL THEN
      -- Obtener el agente por defecto de Allstate
      SELECT id INTO default_agent_id
      FROM agents
      WHERE agent_code = 'DEFAULT-ALLSTATE'
        AND is_active = true
      LIMIT 1;
      
      IF default_agent_id IS NOT NULL THEN
        NEW.agent_id := default_agent_id;
        RAISE NOTICE '✅ Agente por defecto asignado (operación: %): %', TG_OP, default_agent_id;
      ELSE
        RAISE WARNING '⚠️ No se encontró agente por defecto DEFAULT-ALLSTATE. El usuario se creará sin agente asignado.';
      END IF;
    END IF;
  EXCEPTION
    WHEN undefined_column OR OTHERS THEN
      -- Si el campo agent_id no existe o hay cualquier error, simplemente continuar
      -- Esto permite que la creación de usuarios con otros roles funcione correctamente
      RAISE NOTICE 'ℹ️ No se puede asignar agente por defecto (campo no existe o error): %', SQLERRM;
      RETURN NEW;
  END;
  
  RETURN NEW;
END;
$$;

-- Actualizar el trigger de INSERT para que solo se ejecute cuando role = 'client'
-- Esto evita que la función se ejecute para roles que no necesitan agent_id
DROP TRIGGER IF EXISTS assign_default_agent_insert ON public.users;

CREATE TRIGGER assign_default_agent_insert
  BEFORE INSERT ON public.users
  FOR EACH ROW
  WHEN (NEW.role = 'client')  -- ✅ Solo ejecutar cuando el rol es 'client'
  EXECUTE FUNCTION assign_default_agent_to_new_user();

-- Verificar y actualizar el trigger de UPDATE si es necesario
-- (Ya debería tener la condición WHEN, pero lo verificamos)
DROP TRIGGER IF EXISTS assign_default_agent_update ON public.users;

CREATE TRIGGER assign_default_agent_update
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  WHEN (NEW.role = 'client')  -- ✅ Solo ejecutar cuando el rol es 'client'
  EXECUTE FUNCTION assign_default_agent_to_new_user();

-- Comentario
COMMENT ON FUNCTION assign_default_agent_to_new_user() IS 
  'Asigna automáticamente el agente por defecto (DEFAULT-ALLSTATE) a usuarios con role=client que no tengan agente asignado. Solo se ejecuta cuando role=client.';

