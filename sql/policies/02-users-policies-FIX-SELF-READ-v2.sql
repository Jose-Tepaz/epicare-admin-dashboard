-- ============================================
-- FIX v2: Permitir que usuarios autenticados lean su propio registro
-- ============================================
-- Problema: La política existe pero con rol 'public' en lugar de 'authenticated'
-- Solución: Recrear la política con TO authenticated

-- Eliminar la política existente
DROP POLICY IF EXISTS "users_select_own_record" ON public.users;

-- Crear la política correctamente para usuarios autenticados
CREATE POLICY "users_select_own_record" ON public.users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Verificar que la política se creó correctamente
SELECT 
  policyname,
  cmd,
  permissive,
  roles,
  qual
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'users'
  AND policyname = 'users_select_own_record';

