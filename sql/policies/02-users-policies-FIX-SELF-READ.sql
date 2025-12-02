-- ============================================
-- FIX: Permitir que usuarios lean su propio registro
-- ============================================
-- Problema: Los usuarios no pueden leer su propio rol después de hacer login
-- Solución: Agregar política que permita SELECT de su propio registro

-- Política: Cualquier usuario autenticado puede leer su propio registro
DROP POLICY IF EXISTS "users_select_own_record" ON public.users;
CREATE POLICY "users_select_own_record" ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- Verificar que la política se creó correctamente
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'users'
  AND policyname = 'users_select_own_record';

