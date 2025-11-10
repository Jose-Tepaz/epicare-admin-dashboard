-- ============================================
-- AGREGAR ROL SUPER_ADMIN
-- ============================================
-- Este script agrega el rol 'super_admin' a la base de datos
-- y actualiza las políticas RLS para incluir este nuevo rol
--
-- IMPORTANTE: Ejecutar este script en Supabase SQL Editor
-- ============================================

-- 1. Insertar el rol super_admin en la tabla roles
INSERT INTO public.roles (name, description)
VALUES ('super_admin', 'Super Administrador con permisos completos, incluyendo la capacidad de eliminar otros administradores')
ON CONFLICT (name) DO NOTHING;

-- 2. Actualizar políticas RLS para incluir super_admin
-- (Las políticas existentes que verifican 'admin' ahora también deben incluir 'super_admin')

-- Nota: Las políticas existentes que usan 'admin' en la verificación
-- deberían funcionar si se actualiza la lógica en el código de la aplicación.
-- Sin embargo, si necesitas políticas específicas para super_admin, puedes agregarlas aquí.

-- 3. Para asignar el rol super_admin a un usuario existente:
-- Reemplaza 'USER_ID_AQUI' con el ID del usuario que quieres convertir en super_admin
-- 
-- INSERT INTO public.user_roles (user_id, role_id)
-- SELECT 'USER_ID_AQUI', id
-- FROM public.roles
-- WHERE name = 'super_admin';

-- ============================================
-- VERIFICACIÓN
-- ============================================
-- Para verificar que el rol fue creado correctamente:
-- SELECT * FROM public.roles WHERE name = 'super_admin';

-- Para ver qué usuarios tienen el rol super_admin:
-- SELECT u.id, u.email, u.first_name, u.last_name
-- FROM public.users u
-- JOIN public.user_roles ur ON u.id = ur.user_id
-- JOIN public.roles r ON ur.role_id = r.id
-- WHERE r.name = 'super_admin';

