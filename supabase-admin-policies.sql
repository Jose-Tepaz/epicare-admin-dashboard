-- ============================================
-- POLÍTICAS RLS PARA ADMIN DASHBOARD
-- ============================================
-- Este archivo contiene las políticas de seguridad a nivel de fila (RLS)
-- que permiten a administradores y support staff acceder a los datos
--
-- IMPORTANTE: Ejecutar estas políticas EN ORDEN en Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. POLÍTICAS PARA TABLA `users`
-- ============================================

-- Permitir a super_admin, admin y support_staff ver todos los usuarios
CREATE POLICY "admin_support_select_all_users" ON public.users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin', 'support_staff')
    )
  );

-- Solo super_admin y admin pueden actualizar usuarios
CREATE POLICY "admin_update_users" ON public.users
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin')
    )
  );

-- Solo super_admin y admin pueden insertar usuarios (crear nuevos)
CREATE POLICY "admin_insert_users" ON public.users
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin')
    )
  );

-- ============================================
-- 2. POLÍTICAS PARA TABLA `applications`
-- ============================================

-- Permitir a super_admin, admin y support_staff ver todas las applications
CREATE POLICY "admin_support_select_all_applications" ON public.applications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin', 'support_staff')
    )
  );

-- Permitir a super_admin, admin y support_staff actualizar applications (ej: cambiar status)
CREATE POLICY "admin_support_update_applications" ON public.applications
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin', 'support_staff')
    )
  );

-- Solo super_admin y admin pueden eliminar applications
CREATE POLICY "admin_delete_applications" ON public.applications
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin')
    )
  );

-- Solo super_admin y admin pueden crear applications manualmente
CREATE POLICY "admin_insert_applications" ON public.applications
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin')
    )
  );

-- ============================================
-- 3. POLÍTICAS PARA TABLA `applicants`
-- ============================================

-- Permitir a super_admin, admin y support_staff ver todos los applicants
CREATE POLICY "admin_support_select_all_applicants" ON public.applicants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin', 'support_staff')
    )
  );

-- ============================================
-- 4. POLÍTICAS PARA TABLA `coverages`
-- ============================================

-- Permitir a super_admin, admin y support_staff ver todas las coverages
CREATE POLICY "admin_support_select_all_coverages" ON public.coverages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin', 'support_staff')
    )
  );

-- ============================================
-- 5. POLÍTICAS PARA TABLA `beneficiaries`
-- ============================================

-- Permitir a super_admin, admin y support_staff ver todos los beneficiaries
CREATE POLICY "admin_support_select_all_beneficiaries" ON public.beneficiaries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin', 'support_staff')
    )
  );

-- ============================================
-- 6. POLÍTICAS PARA TABLA `application_status_history`
-- ============================================

-- Permitir a super_admin, admin y support_staff ver todo el historial de status
CREATE POLICY "admin_support_select_all_status_history" ON public.application_status_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin', 'support_staff')
    )
  );

-- ============================================
-- 7. POLÍTICAS PARA TABLA `user_roles`
-- ============================================

-- Permitir a super_admin y admin ver todos los user_roles
CREATE POLICY "admin_select_all_user_roles" ON public.user_roles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin')
    )
  );

-- Solo super_admin y admin pueden asignar roles
CREATE POLICY "admin_insert_user_roles" ON public.user_roles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin')
    )
  );

-- Solo super_admin y admin pueden remover roles
CREATE POLICY "admin_delete_user_roles" ON public.user_roles
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin')
    )
  );

-- ============================================
-- 8. POLÍTICAS PARA TABLA `insurance_companies`
-- ============================================

-- Permitir a super_admin, admin y support_staff ver todas las aseguradoras
CREATE POLICY "admin_support_select_all_insurance_companies" ON public.insurance_companies
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin', 'support_staff')
    )
  );

-- ============================================
-- 9. POLÍTICAS PARA TABLA `agents` (opcional)
-- ============================================

-- Permitir a super_admin y admin ver todos los agentes
CREATE POLICY "admin_select_all_agents" ON public.agents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin')
    )
  );

-- ============================================
-- 10. TABLA PARA NOTAS DE APPLICATIONS (NUEVA)
-- ============================================

-- Crear tabla de notas si no existe
CREATE TABLE IF NOT EXISTS public.application_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  note TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Comentarios
COMMENT ON TABLE public.application_notes IS 'Notas internas agregadas por admin/support staff sobre applications';

-- Habilitar RLS
ALTER TABLE public.application_notes ENABLE ROW LEVEL SECURITY;

-- Índices
CREATE INDEX IF NOT EXISTS idx_application_notes_application_id ON public.application_notes(application_id);
CREATE INDEX IF NOT EXISTS idx_application_notes_user_id ON public.application_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_application_notes_created_at ON public.application_notes(created_at DESC);

-- Políticas: super_admin, admin y support_staff pueden ver todas las notas
CREATE POLICY "admin_support_select_all_application_notes" ON public.application_notes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin', 'support_staff')
    )
  );

-- super_admin, admin y support_staff pueden crear notas
CREATE POLICY "admin_support_insert_application_notes" ON public.application_notes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin', 'support_staff')
    )
  );

-- ============================================
-- 11. TABLA PARA ACTIVITY LOGS (NUEVA)
-- ============================================

-- Crear tabla de logs si no existe
CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  changes JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Comentarios
COMMENT ON TABLE public.admin_activity_logs IS 'Registro de actividades administrativas para auditoría';

-- Habilitar RLS
ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;

-- Índices
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_user_id ON public.admin_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_entity_type ON public.admin_activity_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_entity_id ON public.admin_activity_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_created_at ON public.admin_activity_logs(created_at DESC);

-- Políticas: Solo super_admin y admin pueden ver logs
CREATE POLICY "admin_select_all_activity_logs" ON public.admin_activity_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin')
    )
  );

-- Sistema puede insertar logs (se hará desde el backend)
CREATE POLICY "system_insert_activity_logs" ON public.admin_activity_logs
  FOR INSERT
  WITH CHECK (true);

-- ============================================
-- NOTAS FINALES
-- ============================================

/*
IMPORTANTE:
1. Estas políticas permiten a usuarios con rol 'admin' o 'support_staff' 
   acceder a datos que normalmente no podrían ver

2. Las políticas existentes de los usuarios normales se mantienen intactas

3. Verificar que las tablas existan antes de aplicar las políticas

4. Para probar: crear un usuario con rol 'admin' o 'support_staff'
   INSERT INTO public.user_roles (user_id, role_id) VALUES 
   ('uuid-del-usuario', (SELECT id FROM public.roles WHERE name = 'admin'));

5. Los roles 'finance_staff' y 'agent' NO están incluidos en esta fase
   Se implementarán en el futuro

6. Para eliminar estas políticas si es necesario:
   DROP POLICY IF EXISTS "nombre_de_la_policy" ON tabla_name;

7. Tablas incluidas en este archivo:
   - users
   - applications
   - applicants
   - coverages
   - beneficiaries
   - application_status_history
   - user_roles
   - insurance_companies
   - agents
   - application_notes (nueva)
   - admin_activity_logs (nueva)
*/
