-- ============================================
-- POLÍTICAS RLS PARA APPLICATIONS/REQUESTS
-- ============================================
-- Control de estados, transiciones y permisos granulares
-- según rol del usuario
--
-- ⚠️ IMPORTANTE: Siempre usar users.role directamente
-- ✅ CORRECTO:   WHERE u.role = 'agent'
-- ❌ INCORRECTO: JOIN user_roles ur ... JOIN roles r ...
-- Ver USER-ROLE.MD para más detalles
-- ============================================

-- ============================================
-- FUNCIÓN: Validar transición de estado
-- ============================================

CREATE OR REPLACE FUNCTION can_transition_application_status(
  current_status TEXT,
  new_status TEXT,
  user_role TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Super Admin y Admin pueden hacer cualquier transición
  IF user_role IN ('super_admin', 'admin') THEN
    RETURN TRUE;
  END IF;
  
  -- Agent puede:
  -- draft → submitted
  -- submitted → pending_approval
  -- cualquiera → cancelled
  IF user_role = 'agent' THEN
    IF (current_status = 'draft' AND new_status = 'submitted') THEN
      RETURN TRUE;
    END IF;
    IF (current_status = 'submitted' AND new_status = 'pending_approval') THEN
      RETURN TRUE;
    END IF;
    IF (new_status = 'cancelled') THEN
      RETURN TRUE;
    END IF;
    RETURN FALSE;
  END IF;
  
  -- Support Staff puede:
  -- cualquiera → cancelled
  IF user_role = 'support_staff' THEN
    IF (new_status = 'cancelled') THEN
      RETURN TRUE;
    END IF;
    -- También puede actualizar algunos campos pero no cambiar estados críticos
    RETURN FALSE;
  END IF;
  
  -- Otros roles no pueden cambiar estados
  RETURN FALSE;
END;
$$;

-- ============================================
-- FUNCIÓN: Verificar si campo es sensible
-- ============================================

CREATE OR REPLACE FUNCTION is_sensitive_application_field(field_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Campos que support_staff NO puede editar
  RETURN field_name IN (
    'external_reference_id',
    'agent_id',
    'enrollment_data',
    'api_response',
    'status_changed_by'
  );
END;
$$;

-- ============================================
-- POLÍTICAS DE UPDATE
-- ============================================

-- Super Admin y Admin pueden actualizar todo
-- (Ya existe en supabase-admin-policies.sql)

-- Agent puede actualizar sus applications
DROP POLICY IF EXISTS "agent_update_own_applications" ON public.applications;
CREATE POLICY "agent_update_own_applications" ON public.applications
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role = 'agent'
      AND applications.agent_id = get_user_agent_id(auth.uid())
    )
  );

-- Support Staff puede actualizar (campos limitados)
-- Nota: La restricción de campos se maneja a nivel de API
DROP POLICY IF EXISTS "support_staff_update_applications" ON public.applications;
CREATE POLICY "support_staff_update_applications" ON public.applications
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role = 'support_staff'
      AND (
        u.scope = 'global'
        OR
        (u.scope = 'agent_specific' AND applications.agent_id = u.assigned_to_agent_id)
      )
    )
  );

-- ============================================
-- POLÍTICAS DE DELETE (Soft Delete)
-- ============================================
-- En realidad no hay DELETE físico, se usa status = 'cancelled'
-- Pero por si acaso:

DROP POLICY IF EXISTS "admin_delete_applications" ON public.applications;
CREATE POLICY "admin_delete_applications" ON public.applications
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('super_admin', 'admin')
    )
  );

-- ============================================
-- TRIGGER: Validar transiciones de estado
-- ============================================

CREATE OR REPLACE FUNCTION validate_application_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
  transition_allowed BOOLEAN;
BEGIN
  -- Si no hay cambio de estado, permitir
  IF OLD.status = NEW.status OR OLD.status IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Obtener rol del usuario actual
  SELECT role INTO user_role
  FROM public.users
  WHERE id = auth.uid();
  
  -- Si no hay usuario autenticado, rechazar
  IF user_role IS NULL THEN
    RAISE EXCEPTION 'No authenticated user found';
  END IF;
  
  -- Validar transición
  transition_allowed := can_transition_application_status(
    OLD.status,
    NEW.status,
    user_role
  );
  
  IF NOT transition_allowed THEN
    RAISE EXCEPTION 'User with role % cannot transition application from % to %',
      user_role, OLD.status, NEW.status;
  END IF;
  
  -- Registrar quién hizo el cambio
  NEW.status_changed_by := auth.uid();
  NEW.status_changed_at := NOW();
  
  RETURN NEW;
END;
$$;

-- Crear trigger si no existe
DROP TRIGGER IF EXISTS trigger_validate_application_status ON public.applications;
CREATE TRIGGER trigger_validate_application_status
  BEFORE UPDATE ON public.applications
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION validate_application_status_transition();

-- ============================================
-- TRIGGER: Prevenir edición de campos sensibles por support_staff
-- ============================================

CREATE OR REPLACE FUNCTION prevent_sensitive_field_edit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Obtener rol del usuario
  SELECT role INTO user_role
  FROM public.users
  WHERE id = auth.uid();
  
  -- Si no es support_staff, permitir todo
  IF user_role != 'support_staff' THEN
    RETURN NEW;
  END IF;
  
  -- Validar que support_staff no edite campos sensibles
  IF OLD.external_reference_id IS DISTINCT FROM NEW.external_reference_id THEN
    RAISE EXCEPTION 'Support staff cannot edit external_reference_id';
  END IF;
  
  IF OLD.agent_id IS DISTINCT FROM NEW.agent_id THEN
    RAISE EXCEPTION 'Support staff cannot edit agent_id';
  END IF;
  
  IF OLD.enrollment_data IS DISTINCT FROM NEW.enrollment_data THEN
    RAISE EXCEPTION 'Support staff cannot edit enrollment_data';
  END IF;
  
  IF OLD.api_response IS DISTINCT FROM NEW.api_response THEN
    RAISE EXCEPTION 'Support staff cannot edit api_response';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Crear trigger si no existe
DROP TRIGGER IF EXISTS trigger_prevent_sensitive_edit ON public.applications;
CREATE TRIGGER trigger_prevent_sensitive_edit
  BEFORE UPDATE ON public.applications
  FOR EACH ROW
  WHEN (auth.uid() IS NOT NULL)
  EXECUTE FUNCTION prevent_sensitive_field_edit();

-- ============================================
-- FUNCIÓN: Cancelar application con razón
-- ============================================

CREATE OR REPLACE FUNCTION cancel_application(
  p_application_id UUID,
  p_cancelled_by UUID,
  p_reason TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
  app_status TEXT;
BEGIN
  -- Verificar rol del usuario
  SELECT role INTO user_role
  FROM public.users
  WHERE id = p_cancelled_by;
  
  -- Verificar que tenga permisos para cancelar
  IF user_role NOT IN ('super_admin', 'admin', 'agent', 'support_staff') THEN
    RAISE EXCEPTION 'User does not have permission to cancel applications';
  END IF;
  
  -- Obtener estado actual
  SELECT status INTO app_status
  FROM public.applications
  WHERE id = p_application_id;
  
  -- No se puede cancelar si ya está active o rejected
  IF app_status IN ('active', 'rejected') THEN
    RAISE EXCEPTION 'Cannot cancel application in status %', app_status;
  END IF;
  
  -- Actualizar application
  UPDATE public.applications
  SET 
    status = 'cancelled',
    status_changed_by = p_cancelled_by,
    status_changed_at = NOW(),
    cancellation_reason = p_reason
  WHERE id = p_application_id;
  
  -- Log en activity logs
  INSERT INTO public.admin_activity_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    metadata,
    old_values,
    new_values
  ) VALUES (
    p_cancelled_by,
    'application_cancelled',
    'application',
    p_application_id,
    jsonb_build_object('reason', p_reason),
    jsonb_build_object('status', app_status),
    jsonb_build_object('status', 'cancelled')
  );
  
  RETURN TRUE;
END;
$$;

-- ============================================
-- FUNCIÓN: Obtener transiciones permitidas para un usuario
-- ============================================

CREATE OR REPLACE FUNCTION get_allowed_status_transitions(
  p_application_id UUID,
  p_user_id UUID
)
RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
  current_status TEXT;
  allowed_statuses TEXT[];
BEGIN
  -- Obtener rol y estado actual
  SELECT role INTO user_role
  FROM public.users
  WHERE id = p_user_id;
  
  SELECT status INTO current_status
  FROM public.applications
  WHERE id = p_application_id;
  
  -- Super Admin y Admin: todas las transiciones
  IF user_role IN ('super_admin', 'admin') THEN
    allowed_statuses := ARRAY[
      'draft', 'submitted', 'pending_approval', 
      'approved', 'rejected', 'active', 'cancelled'
    ];
    -- Remover el estado actual
    allowed_statuses := array_remove(allowed_statuses, current_status);
    RETURN allowed_statuses;
  END IF;
  
  -- Agent
  IF user_role = 'agent' THEN
    CASE current_status
      WHEN 'draft' THEN
        RETURN ARRAY['submitted', 'cancelled'];
      WHEN 'submitted' THEN
        RETURN ARRAY['pending_approval', 'cancelled'];
      ELSE
        RETURN ARRAY['cancelled'];
    END CASE;
  END IF;
  
  -- Support Staff
  IF user_role = 'support_staff' THEN
    RETURN ARRAY['cancelled'];
  END IF;
  
  -- Otros roles: ninguna transición
  RETURN ARRAY[]::TEXT[];
END;
$$;

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================

-- Índice para búsquedas por status
CREATE INDEX IF NOT EXISTS idx_applications_status ON public.applications(status);

-- Índice para búsquedas por agent_id y status
CREATE INDEX IF NOT EXISTS idx_applications_agent_status 
  ON public.applications(agent_id, status) 
  WHERE agent_id IS NOT NULL;

-- Índice para búsquedas por created_at (reportes)
CREATE INDEX IF NOT EXISTS idx_applications_created_at 
  ON public.applications(created_at DESC);

-- Índice para búsquedas por status_changed_at
CREATE INDEX IF NOT EXISTS idx_applications_status_changed 
  ON public.applications(status_changed_at DESC NULLS LAST)
  WHERE status_changed_at IS NOT NULL;

-- ============================================
-- COMENTARIOS
-- ============================================

COMMENT ON FUNCTION can_transition_application_status IS 
  'Valida si un rol puede realizar una transición de estado específica';

COMMENT ON FUNCTION is_sensitive_application_field IS 
  'Indica si un campo es sensible y no debe ser editado por support_staff';

COMMENT ON FUNCTION validate_application_status_transition IS 
  'Trigger function que valida transiciones de estado antes de UPDATE';

COMMENT ON FUNCTION prevent_sensitive_field_edit IS 
  'Trigger function que previene edición de campos sensibles por support_staff';

COMMENT ON FUNCTION cancel_application IS 
  'Cancela una application con razón y logging automático';

COMMENT ON FUNCTION get_allowed_status_transitions IS 
  'Retorna lista de estados a los que puede transicionar según rol del usuario';

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Para verificar las políticas:
-- SELECT * FROM pg_policies WHERE tablename = 'applications';

-- Para verificar los triggers:
-- SELECT * FROM pg_trigger WHERE tgrelid = 'applications'::regclass;

-- Para probar transiciones:
-- SELECT can_transition_application_status('draft', 'submitted', 'agent'); -- TRUE
-- SELECT can_transition_application_status('submitted', 'pending_approval', 'agent'); -- TRUE
-- SELECT can_transition_application_status('approved', 'draft', 'agent');   -- FALSE

-- Para obtener transiciones permitidas:
-- SELECT get_allowed_status_transitions('<app_id>', '<user_id>');

