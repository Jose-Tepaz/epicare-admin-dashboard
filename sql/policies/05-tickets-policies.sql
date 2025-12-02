-- ============================================
-- POLÍTICAS RLS PARA SUPPORT TICKETS
-- ============================================
-- Control de acceso, asignaciones y notas internas
-- para gestión de tickets por rol
--
-- ⚠️ IMPORTANTE: Siempre usar users.role directamente
-- ✅ CORRECTO:   WHERE u.role = 'agent'
-- ❌ INCORRECTO: JOIN user_roles ur ... JOIN roles r ...
-- Ver USER-ROLE.MD para más detalles
-- ============================================

-- ============================================
-- POLÍTICAS DE INSERT (Crear tickets)
-- ============================================

-- Super Admin, Admin, Agent y Support Staff pueden crear tickets
DROP POLICY IF EXISTS "staff_insert_tickets" ON public.support_tickets;
CREATE POLICY "staff_insert_tickets" ON public.support_tickets
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('super_admin', 'admin', 'agent', 'support_staff')
    )
  );

-- ============================================
-- POLÍTICAS DE UPDATE
-- ============================================

-- Admin puede actualizar cualquier ticket
-- (Ya existe en supabase-admin-policies.sql)

-- Support Staff puede actualizar tickets (según scope)
DROP POLICY IF EXISTS "support_staff_update_tickets" ON public.support_tickets;
CREATE POLICY "support_staff_update_tickets" ON public.support_tickets
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role = 'support_staff'
      AND (
        u.scope = 'global'
        OR
        (
          u.scope = 'agent_specific'
          AND EXISTS (
            SELECT 1 FROM public.users client
            WHERE client.id = support_tickets.client_id
            AND client.agent_id = u.assigned_to_agent_id
          )
        )
      )
    )
  );

-- Agent puede actualizar sus tickets (solo cerrar)
DROP POLICY IF EXISTS "agent_update_tickets" ON public.support_tickets;
CREATE POLICY "agent_update_tickets" ON public.support_tickets
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role = 'agent'
      AND (
        -- Tickets que creó
        support_tickets.created_by = auth.uid()
        OR
        -- Tickets de sus clients
        EXISTS (
          SELECT 1 FROM public.users client
          WHERE client.id = support_tickets.client_id
          AND client.agent_id = get_user_agent_id(auth.uid())
        )
      )
    )
  );

-- ============================================
-- FUNCIÓN: Validar transición de estado de ticket
-- ============================================

CREATE OR REPLACE FUNCTION can_transition_ticket_status(
  current_status TEXT,
  new_status TEXT,
  user_role TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Super Admin y Admin: cualquier transición
  IF user_role IN ('super_admin', 'admin') THEN
    RETURN TRUE;
  END IF;
  
  -- Support Staff puede:
  -- open → in_progress
  -- in_progress → waiting_on_customer
  -- waiting_on_customer → in_progress
  -- in_progress → resolved
  -- waiting_on_customer → resolved
  -- resolved → closed
  IF user_role = 'support_staff' THEN
    IF (current_status = 'open' AND new_status = 'in_progress') THEN
      RETURN TRUE;
    END IF;
    IF (current_status = 'in_progress' AND new_status IN ('waiting_on_customer', 'resolved')) THEN
      RETURN TRUE;
    END IF;
    IF (current_status = 'waiting_on_customer' AND new_status IN ('in_progress', 'resolved')) THEN
      RETURN TRUE;
    END IF;
    IF (current_status = 'resolved' AND new_status = 'closed') THEN
      RETURN TRUE;
    END IF;
    RETURN FALSE;
  END IF;
  
  -- Agent solo puede cerrar tickets
  IF user_role = 'agent' THEN
    RETURN new_status = 'closed';
  END IF;
  
  RETURN FALSE;
END;
$$;

-- ============================================
-- TRIGGER: Validar transiciones de estado
-- ============================================

CREATE OR REPLACE FUNCTION validate_ticket_status_transition()
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
  
  -- Obtener rol del usuario
  SELECT role INTO user_role
  FROM public.users
  WHERE id = auth.uid();
  
  IF user_role IS NULL THEN
    RAISE EXCEPTION 'No authenticated user found';
  END IF;
  
  -- Validar transición
  transition_allowed := can_transition_ticket_status(
    OLD.status,
    NEW.status,
    user_role
  );
  
  IF NOT transition_allowed THEN
    RAISE EXCEPTION 'User with role % cannot transition ticket from % to %',
      user_role, OLD.status, NEW.status;
  END IF;
  
  -- Registrar cambio
  NEW.status_changed_by := auth.uid();
  NEW.status_changed_at := NOW();
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_validate_ticket_status ON public.support_tickets;
CREATE TRIGGER trigger_validate_ticket_status
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION validate_ticket_status_transition();

-- ============================================
-- FUNCIÓN: Asignar ticket a support staff
-- ============================================

CREATE OR REPLACE FUNCTION assign_ticket(
  p_ticket_id UUID,
  p_assigned_to UUID,
  p_assigned_by UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  assigner_role TEXT;
  assignee_role TEXT;
BEGIN
  -- Obtener roles
  SELECT role INTO assigner_role
  FROM public.users
  WHERE id = p_assigned_by;
  
  SELECT role INTO assignee_role
  FROM public.users
  WHERE id = p_assigned_to;
  
  -- Verificar que el que asigna tenga permisos
  IF assigner_role NOT IN ('super_admin', 'admin', 'support_staff') THEN
    RAISE EXCEPTION 'User does not have permission to assign tickets';
  END IF;
  
  -- Verificar que el asignado sea support_staff
  IF assignee_role != 'support_staff' THEN
    RAISE EXCEPTION 'Can only assign tickets to support_staff';
  END IF;
  
  -- Actualizar ticket
  UPDATE public.support_tickets
  SET 
    assigned_to = p_assigned_to,
    assigned_by = p_assigned_by,
    assigned_at = NOW()
  WHERE id = p_ticket_id;
  
  -- Log
  INSERT INTO public.admin_activity_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    new_values
  ) VALUES (
    p_assigned_by,
    'ticket_assigned',
    'ticket',
    p_ticket_id,
    jsonb_build_object('assigned_to', p_assigned_to)
  );
  
  RETURN TRUE;
END;
$$;

-- ============================================
-- FUNCIÓN: Agregar nota interna
-- ============================================

CREATE OR REPLACE FUNCTION add_ticket_internal_note(
  p_ticket_id UUID,
  p_note TEXT,
  p_created_by UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
  note_id UUID;
BEGIN
  -- Obtener rol
  SELECT role INTO user_role
  FROM public.users
  WHERE id = p_created_by;
  
  -- Solo support_staff, admin y super_admin pueden ver/crear notas internas
  IF user_role NOT IN ('super_admin', 'admin', 'support_staff') THEN
    RAISE EXCEPTION 'Only staff can create internal notes';
  END IF;
  
  -- Insertar nota
  INSERT INTO public.ticket_notes (
    ticket_id,
    note,
    is_internal,
    created_by
  ) VALUES (
    p_ticket_id,
    p_note,
    TRUE,
    p_created_by
  )
  RETURNING id INTO note_id;
  
  RETURN note_id;
END;
$$;

-- ============================================
-- RLS PARA TICKET_NOTES
-- ============================================

-- Agent NO puede ver notas internas
DROP POLICY IF EXISTS "staff_select_notes" ON public.ticket_notes;
CREATE POLICY "staff_select_notes" ON public.ticket_notes
  FOR SELECT
  USING (
    -- Notas públicas: todos las ven
    (is_internal = FALSE)
    OR
    -- Notas internas: solo staff
    (
      is_internal = TRUE
      AND EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid()
        AND u.role IN ('super_admin', 'admin', 'support_staff')
      )
    )
  );

-- Solo staff puede crear notas
DROP POLICY IF EXISTS "staff_insert_notes" ON public.ticket_notes;
CREATE POLICY "staff_insert_notes" ON public.ticket_notes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('super_admin', 'admin', 'support_staff', 'agent')
    )
  );

-- ============================================
-- FUNCIÓN: Obtener transiciones permitidas
-- ============================================

CREATE OR REPLACE FUNCTION get_allowed_ticket_transitions(
  p_ticket_id UUID,
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
  SELECT role INTO user_role
  FROM public.users
  WHERE id = p_user_id;
  
  SELECT status INTO current_status
  FROM public.support_tickets
  WHERE id = p_ticket_id;
  
  -- Super Admin y Admin: todas las transiciones
  IF user_role IN ('super_admin', 'admin') THEN
    allowed_statuses := ARRAY[
      'open', 'in_progress', 'waiting_on_customer', 
      'resolved', 'closed', 'cancelled'
    ];
    allowed_statuses := array_remove(allowed_statuses, current_status);
    RETURN allowed_statuses;
  END IF;
  
  -- Support Staff
  IF user_role = 'support_staff' THEN
    CASE current_status
      WHEN 'open' THEN
        RETURN ARRAY['in_progress'];
      WHEN 'in_progress' THEN
        RETURN ARRAY['waiting_on_customer', 'resolved'];
      WHEN 'waiting_on_customer' THEN
        RETURN ARRAY['in_progress', 'resolved'];
      WHEN 'resolved' THEN
        RETURN ARRAY['closed'];
      ELSE
        RETURN ARRAY[]::TEXT[];
    END CASE;
  END IF;
  
  -- Agent: solo cerrar
  IF user_role = 'agent' THEN
    RETURN ARRAY['closed'];
  END IF;
  
  RETURN ARRAY[]::TEXT[];
END;
$$;

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON public.support_tickets(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tickets_client_id ON public.support_tickets(client_id);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON public.support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ticket_notes_ticket_id ON public.ticket_notes(ticket_id);

-- ============================================
-- COMENTARIOS
-- ============================================

COMMENT ON FUNCTION can_transition_ticket_status IS 
  'Valida si un rol puede realizar una transición de estado de ticket';

COMMENT ON FUNCTION validate_ticket_status_transition IS 
  'Trigger function que valida transiciones de estado de tickets';

COMMENT ON FUNCTION assign_ticket IS 
  'Asigna un ticket a un miembro de support staff';

COMMENT ON FUNCTION add_ticket_internal_note IS 
  'Agrega una nota interna que solo staff puede ver';

COMMENT ON FUNCTION get_allowed_ticket_transitions IS 
  'Retorna estados permitidos para transición según rol';

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Probar transiciones:
-- SELECT can_transition_ticket_status('open', 'in_progress', 'support_staff'); -- TRUE
-- SELECT can_transition_ticket_status('open', 'closed', 'agent'); -- TRUE
-- SELECT get_allowed_ticket_transitions('<ticket_id>', '<user_id>');

