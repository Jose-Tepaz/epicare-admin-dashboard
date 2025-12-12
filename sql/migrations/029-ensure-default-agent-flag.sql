-- ============================================
-- MIGRACIÓN 029: Agregar Campo is_default a agent_profiles
-- ============================================
-- Agrega la columna is_default para identificar el agente por defecto
-- que se asigna automáticamente a nuevos clientes del marketplace
-- ============================================

-- 1. Agregar columna is_default si no existe
ALTER TABLE agent_profiles 
ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;

-- 2. Crear índice para búsquedas rápidas del agente por defecto
-- Solo indexar registros con is_default = true para eficiencia
CREATE INDEX IF NOT EXISTS idx_agent_profiles_is_default 
ON agent_profiles(is_default) 
WHERE is_default = true;

-- 3. Agregar comentario explicativo
COMMENT ON COLUMN agent_profiles.is_default IS 
  'Indica si este es el agente por defecto que se asigna automáticamente a nuevos clientes del marketplace';

-- 4. Verificar que se creó correctamente
SELECT 
  'Columna is_default agregada correctamente' as status,
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'agent_profiles'
  AND column_name = 'is_default';

-- NOTA IMPORTANTE:
-- Después de ejecutar este script, debes marcar un agente como default:
-- 
-- UPDATE agent_profiles 
-- SET is_default = true 
-- WHERE id = 'UUID-DEL-AGENTE-DEFAULT';
--
-- Solo debe haber UN agente con is_default = true
