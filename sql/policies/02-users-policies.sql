-- ============================================
-- POLÍTICAS RLS COMPLETAS PARA USERS
-- ============================================
-- Este archivo contiene políticas avanzadas para gestión de usuarios
-- considerando jerarquía de roles, scope y permisos granulares
--
-- ⚠️ IMPORTANTE: Siempre usar users.role directamente
-- ✅ CORRECTO:   WHERE u.role = 'agent'
-- ❌ INCORRECTO: JOIN user_roles ur ... JOIN roles r ...
-- Ver USER-ROLE.MD para más detalles
-- ============================================

-- ============================================
-- FUNCIÓN HELPER: Verificar jerarquía de creación
-- ============================================

CREATE OR REPLACE FUNCTION can_create_role(creator_role TEXT, target_role TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Super Admin puede crear cualquier rol
  IF creator_role = 'super_admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Admin puede crear: admin, agent, support_staff, client
  IF creator_role = 'admin' THEN
    RETURN target_role IN ('admin', 'agent', 'support_staff', 'client');
  END IF;
  
  -- Agent puede crear: support_staff, client
  IF creator_role = 'agent' THEN
    RETURN target_role IN ('support_staff', 'client');
  END IF;
  
  -- Otros roles no pueden crear usuarios
  RETURN FALSE;
END;
$$;

-- ============================================
-- FUNCIÓN HELPER: Obtener rol del usuario actual
-- ============================================
-- NOTA: Usando users.role directamente según USER-ROLE.MD

CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM public.users
  WHERE id = auth.uid();
  
  RETURN COALESCE(user_role, 'client');
END;
$$;

-- ============================================
-- POLÍTICAS DE SELECT (Ver usuarios)
-- ============================================

-- Super Admin y Admin pueden ver todos
-- (Ya existe en supabase-admin-policies.sql, no necesitamos recrearla)

-- Agent: solo sus clients y support staff que creó
-- (Ya creada en 01-dashboard-policies.sql como "agent_select_own_clients")

-- Support Staff con scope
-- (Ya creada en 01-dashboard-policies.sql como "support_staff_scoped_users")

-- ============================================
-- POLÍTICAS DE INSERT (Crear usuarios)
-- ============================================

-- Admin y Super Admin pueden crear (ya existe en supabase-admin-policies.sql)

-- Agent puede crear clients y support_staff
DROP POLICY IF EXISTS "agent_insert_users" ON public.users;
CREATE POLICY "agent_insert_users" ON public.users
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users creator
      WHERE creator.id = auth.uid()
      AND creator.role = 'agent'
      AND can_create_role('agent', users.role)
    )
  );

-- ============================================
-- POLÍTICAS DE UPDATE (Editar usuarios)
-- ============================================

-- Admin puede actualizar todos excepto super_admin
DROP POLICY IF EXISTS "admin_update_non_super_admin_users" ON public.users;
CREATE POLICY "admin_update_non_super_admin_users" ON public.users
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role = 'admin'
      -- No puede editar super_admins
      AND users.role != 'super_admin'
    )
  );

-- Agent puede actualizar sus clients y support_staff que creó
DROP POLICY IF EXISTS "agent_update_own_users" ON public.users;
CREATE POLICY "agent_update_own_users" ON public.users
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role = 'agent'
      AND (
        -- Clients asignados al agent
        (
          users.role = 'client' 
          AND users.agent_id = get_user_agent_id(auth.uid())
        )
        OR
        -- Support staff creado por el agent
        (
          users.role = 'support_staff'
          AND users.created_by = auth.uid()
        )
      )
    )
  );

-- ============================================
-- POLÍTICAS DE DELETE (Inactivar usuarios)
-- ============================================

-- Super Admin puede inactivar todos (soft delete via is_active)
DROP POLICY IF EXISTS "super_admin_inactivate_users" ON public.users;
CREATE POLICY "super_admin_inactivate_users" ON public.users
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role = 'super_admin'
    )
  );

-- Admin puede inactivar todos excepto super_admin
-- (Cubierto por admin_update_non_super_admin_users)

-- Agent solo puede inactivar support_staff que creó
DROP POLICY IF EXISTS "agent_inactivate_support_staff" ON public.users;
CREATE POLICY "agent_inactivate_support_staff" ON public.users
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role = 'agent'
      AND users.role = 'support_staff'
      AND users.created_by = auth.uid()
      -- Solo permitir cambio de is_active
      AND users.is_active != (
        SELECT is_active FROM public.users WHERE id = users.id
      )
    )
  );

-- ============================================
-- TRIGGER: Inactivación en cascada
-- ============================================

-- Cuando un agent se inactiva, inactivar su support_staff
CREATE OR REPLACE FUNCTION inactivate_agent_staff()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Si el usuario inactivado es un agent
  IF NEW.role = 'agent' AND NEW.is_active = FALSE AND OLD.is_active = TRUE THEN
    -- Inactivar todo el support_staff creado por este agent
    UPDATE public.users
    SET 
      is_active = FALSE,
      inactivated_by = NEW.inactivated_by,
      inactivated_at = NOW(),
      inactivation_reason = 'Agent inactivated: ' || COALESCE(NEW.inactivation_reason, 'No reason provided')
    WHERE created_by = NEW.id
    AND role = 'support_staff'
    AND is_active = TRUE;
    
    -- Log para auditoría
    RAISE NOTICE 'Inactivated support_staff for agent %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Crear trigger si no existe
DROP TRIGGER IF EXISTS trigger_inactivate_agent_staff ON public.users;
CREATE TRIGGER trigger_inactivate_agent_staff
  AFTER UPDATE ON public.users
  FOR EACH ROW
  WHEN (OLD.is_active IS DISTINCT FROM NEW.is_active)
  EXECUTE FUNCTION inactivate_agent_staff();

-- ============================================
-- TRIGGER: Validar jerarquía de creación
-- ============================================

CREATE OR REPLACE FUNCTION validate_user_creation_hierarchy()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  creator_role TEXT;
BEGIN
  -- Obtener rol del creador
  SELECT role INTO creator_role
  FROM public.users
  WHERE id = NEW.created_by;
  
  -- Si no hay creador (sistema), permitir
  IF NEW.created_by IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Validar jerarquía
  IF NOT can_create_role(creator_role, NEW.role) THEN
    RAISE EXCEPTION 'User with role % cannot create user with role %', creator_role, NEW.role;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Crear trigger si no existe
DROP TRIGGER IF EXISTS trigger_validate_user_creation ON public.users;
CREATE TRIGGER trigger_validate_user_creation
  BEFORE INSERT ON public.users
  FOR EACH ROW
  WHEN (NEW.created_by IS NOT NULL)
  EXECUTE FUNCTION validate_user_creation_hierarchy();

-- ============================================
-- TRIGGER: Auto-asignar scope a support_staff
-- ============================================

CREATE OR REPLACE FUNCTION auto_assign_support_staff_scope()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  creator_role TEXT;
  creator_agent_id UUID;
BEGIN
  -- Solo aplicar a support_staff
  IF NEW.role != 'support_staff' THEN
    RETURN NEW;
  END IF;
  
  -- Obtener información del creador
  SELECT u.role, get_user_agent_id(u.id)
  INTO creator_role, creator_agent_id
  FROM public.users u
  WHERE u.id = NEW.created_by;
  
  -- Si fue creado por admin o super_admin → scope global
  IF creator_role IN ('admin', 'super_admin') THEN
    NEW.scope := 'global';
    NEW.assigned_to_agent_id := NULL;
  
  -- Si fue creado por agent → scope agent_specific
  ELSIF creator_role = 'agent' AND creator_agent_id IS NOT NULL THEN
    NEW.scope := 'agent_specific';
    NEW.assigned_to_agent_id := creator_agent_id;
  
  -- Por defecto: global
  ELSE
    NEW.scope := 'global';
    NEW.assigned_to_agent_id := NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Crear trigger si no existe
DROP TRIGGER IF EXISTS trigger_auto_assign_scope ON public.users;
CREATE TRIGGER trigger_auto_assign_scope
  BEFORE INSERT ON public.users
  FOR EACH ROW
  WHEN (NEW.role = 'support_staff')
  EXECUTE FUNCTION auto_assign_support_staff_scope();

-- ============================================
-- FUNCIÓN HELPER: Reasignar cliente a otro agent
-- ============================================

CREATE OR REPLACE FUNCTION reassign_client_to_agent(
  p_client_id UUID,
  p_new_agent_id UUID,
  p_reassigned_by UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  reassigner_role TEXT;
BEGIN
  -- Verificar que quien reasigna tiene permisos (solo admin o super_admin)
  SELECT role INTO reassigner_role
  FROM public.users
  WHERE id = p_reassigned_by;
  
  IF reassigner_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Only admin or super_admin can reassign clients';
  END IF;
  
  -- Actualizar el cliente
  UPDATE public.users
  SET 
    agent_id = p_new_agent_id,
    reassigned_by = p_reassigned_by,
    reassigned_at = NOW()
  WHERE id = p_client_id
  AND role = 'client';
  
  -- Log en admin_activity_logs
  INSERT INTO public.admin_activity_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    metadata,
    old_values,
    new_values
  ) VALUES (
    p_reassigned_by,
    'client_reassigned',
    'user',
    p_client_id,
    jsonb_build_object('reason', p_reason),
    jsonb_build_object('agent_id', (SELECT agent_id FROM public.users WHERE id = p_client_id)),
    jsonb_build_object('agent_id', p_new_agent_id)
  );
  
  RETURN TRUE;
END;
$$;

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================

-- Índice para búsquedas por agent_id
CREATE INDEX IF NOT EXISTS idx_users_agent_id ON public.users(agent_id) WHERE agent_id IS NOT NULL;

-- Índice para búsquedas por created_by
CREATE INDEX IF NOT EXISTS idx_users_created_by ON public.users(created_by) WHERE created_by IS NOT NULL;

-- Índice para búsquedas por scope y assigned_to_agent_id
CREATE INDEX IF NOT EXISTS idx_users_scope_agent ON public.users(scope, assigned_to_agent_id) 
  WHERE role = 'support_staff';

-- Índice para búsquedas por role e is_active
CREATE INDEX IF NOT EXISTS idx_users_role_active ON public.users(role, is_active);

-- ============================================
-- COMENTARIOS
-- ============================================

COMMENT ON FUNCTION can_create_role IS 'Verifica si un rol puede crear otro rol según jerarquía';
COMMENT ON FUNCTION get_current_user_role IS 'Obtiene el rol del usuario actual autenticado';
COMMENT ON FUNCTION inactivate_agent_staff IS 'Inactiva en cascada el support_staff cuando un agent es inactivado';
COMMENT ON FUNCTION validate_user_creation_hierarchy IS 'Valida que la creación de usuarios respete la jerarquía de roles';
COMMENT ON FUNCTION auto_assign_support_staff_scope IS 'Asigna automáticamente el scope correcto al crear support_staff';
COMMENT ON FUNCTION reassign_client_to_agent IS 'Reasigna un cliente de un agent a otro (solo admin/super_admin)';

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Para verificar las políticas:
-- SELECT * FROM pg_policies WHERE tablename = 'users';

-- Para verificar los triggers:
-- SELECT * FROM pg_trigger WHERE tgname LIKE '%user%';

-- Para probar la jerarquía:
-- SELECT can_create_role('agent', 'client'); -- Debe retornar TRUE
-- SELECT can_create_role('agent', 'admin');  -- Debe retornar FALSE

