-- ============================================
-- MIGRACIÓN 030: Función Trigger para Asignación de Agentes
-- ============================================
-- Actualiza la función assign_default_agent_to_new_user() para usar
-- agent_profile_id en lugar de agent_id
--
-- LÓGICA:
-- 1. Si agent_profile_id ya viene asignado → no hacer nada (admin lo seleccionó)
-- 2. Si created_by es un agente → usar su agent_profile_id
-- 3. Si no → asignar agente por defecto (is_default = true)
-- ============================================

-- Crear o reemplazar la función
CREATE OR REPLACE FUNCTION assign_default_agent_to_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_agent_profile_id UUID;
  creator_agent_profile_id UUID;
  creator_role TEXT;
BEGIN
  -- Solo aplicar a usuarios con role='client'
  IF NEW.role != 'client' THEN
    RETURN NEW;
  END IF;

  -- Si ya tiene agent_profile_id asignado (admin lo seleccionó manualmente), no hacer nada
  IF NEW.agent_profile_id IS NOT NULL THEN
    RAISE NOTICE 'Cliente ya tiene agente asignado manualmente: %', NEW.agent_profile_id;
    RETURN NEW;
  END IF;

  -- CASO 1: Verificar si fue creado por un agente
  IF NEW.created_by IS NOT NULL THEN
    SELECT u.role, u.agent_profile_id
    INTO creator_role, creator_agent_profile_id
    FROM users u
    WHERE u.id = NEW.created_by;
    
    -- Si el creador es un agente con agent_profile_id
    IF creator_role = 'agent' AND creator_agent_profile_id IS NOT NULL THEN
      NEW.agent_profile_id := creator_agent_profile_id;
      RAISE NOTICE 'Cliente asignado al agente creador: %', creator_agent_profile_id;
      RETURN NEW;
    END IF;
  END IF;

  -- CASO 2: Asignar agente por defecto (marketplace, dashboard usuario, o admin sin selección)
  SELECT id INTO default_agent_profile_id
  FROM agent_profiles
  WHERE is_default = true
    AND is_active = true
  LIMIT 1;
  
  IF default_agent_profile_id IS NOT NULL THEN
    NEW.agent_profile_id := default_agent_profile_id;
    RAISE NOTICE 'Cliente asignado al agente por defecto: %', default_agent_profile_id;
  ELSE
    RAISE WARNING 'No se encontró agente por defecto activo. Cliente creado sin agente.';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Agregar comentario explicativo
COMMENT ON FUNCTION assign_default_agent_to_new_user() IS 
  'Asigna agent_profile_id a clientes: si creado por agente → ese agente, si admin seleccionó → ese agente, sino → agente por defecto (is_default=true)';

-- Verificar que los triggers existen (ya deberían estar creados)
-- Si no existen, crearlos
DO $$
BEGIN
  -- Trigger para INSERT
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'assign_default_agent_insert'
  ) THEN
    CREATE TRIGGER assign_default_agent_insert
      BEFORE INSERT ON public.users
      FOR EACH ROW
      WHEN (NEW.role = 'client')
      EXECUTE FUNCTION assign_default_agent_to_new_user();
  END IF;

  -- Trigger para UPDATE
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'assign_default_agent_update'
  ) THEN
    CREATE TRIGGER assign_default_agent_update
      BEFORE UPDATE ON public.users
      FOR EACH ROW
      WHEN (NEW.role = 'client')
      EXECUTE FUNCTION assign_default_agent_to_new_user();
  END IF;
END $$;

-- Verificar que todo se creó correctamente
SELECT 
  'Función y triggers actualizados correctamente' as status,
  COUNT(*) as triggers_activos
FROM pg_trigger
WHERE tgname LIKE 'assign_default_agent%'
  AND tgrelid = 'users'::regclass;

-- Mostrar detalles de los triggers
SELECT 
  tgname as trigger_name,
  tgtype,
  tgenabled,
  proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname LIKE 'assign_default_agent%'
  AND tgrelid = 'users'::regclass;
