/**
 * Constantes y configuraciones de roles del sistema
 */

import type { RoleName, ApplicationStatus, TicketStatus, StateTransition } from '@/lib/types/admin'

// ============================================
// JERARQUÍA DE CREACIÓN DE ROLES
// ============================================

/**
 * Define qué roles puede crear cada rol
 */
export const ROLE_CREATION_HIERARCHY: Record<RoleName, RoleName[]> = {
  super_admin: ['super_admin', 'admin', 'agent', 'support_staff', 'client'],
  admin: ['admin', 'agent', 'support_staff', 'client'],
  agent: ['support_staff', 'client'],
  support_staff: [],
  client: [],
}

/**
 * Verifica si un rol puede crear otro rol
 */
export function canCreateRole(creatorRole: RoleName, targetRole: RoleName): boolean {
  const allowedRoles = ROLE_CREATION_HIERARCHY[creatorRole] || []
  return allowedRoles.includes(targetRole)
}

// ============================================
// TRANSICIONES DE ESTADO - APPLICATIONS
// ============================================

/**
 * Define las transiciones de estado permitidas para applications
 * según la matriz del documento user-roles.md
 */
export const APPLICATION_STATE_TRANSITIONS: StateTransition[] = [
  // Draft → Submitted (Agent, Admin, Super Admin)
  {
    from: 'draft',
    to: 'submitted',
    allowedRoles: ['agent', 'admin', 'super_admin'],
  },
  // Submitted → Pending Approval (Agent, Admin, Super Admin)
  {
    from: 'submitted',
    to: 'pending_approval',
    allowedRoles: ['agent', 'admin', 'super_admin'],
  },
  // Pending Approval → Approved (Solo API)
  {
    from: 'pending_approval',
    to: 'approved',
    allowedRoles: [], // Solo puede hacerlo la API externa
  },
  // Pending Approval → Rejected (Solo API)
  {
    from: 'pending_approval',
    to: 'rejected',
    allowedRoles: [], // Solo puede hacerlo la API externa
  },
  // Approved → Active (Admin, Super Admin)
  {
    from: 'approved',
    to: 'active',
    allowedRoles: ['admin', 'super_admin'],
  },
  // Cualquiera → Cancelled (Agent, Support Staff, Admin, Super Admin)
  {
    from: null, // null = desde cualquier estado
    to: 'cancelled',
    allowedRoles: ['agent', 'support_staff', 'admin', 'super_admin'],
    requiresReason: true,
  },
]

/**
 * Verifica si un rol puede realizar una transición de estado
 */
export function canPerformApplicationTransition(
  role: RoleName,
  fromStatus: ApplicationStatus,
  toStatus: ApplicationStatus
): boolean {
  // Buscar la transición específica
  const transition = APPLICATION_STATE_TRANSITIONS.find(
    (t) => (t.from === null || t.from === fromStatus) && t.to === toStatus
  )

  if (!transition) return false

  return transition.allowedRoles.includes(role)
}

/**
 * Obtiene las transiciones permitidas desde un estado para un rol
 */
export function getAllowedApplicationTransitions(
  role: RoleName,
  currentStatus: ApplicationStatus
): ApplicationStatus[] {
  return APPLICATION_STATE_TRANSITIONS
    .filter((t) => {
      // Puede transicionar desde el estado actual o desde cualquier estado (null)
      const isFromCurrentState = t.from === null || t.from === currentStatus
      // El rol está permitido
      const isRoleAllowed = t.allowedRoles.includes(role)
      return isFromCurrentState && isRoleAllowed
    })
    .map((t) => t.to as ApplicationStatus)
}

// ============================================
// TRANSICIONES DE ESTADO - TICKETS
// ============================================

/**
 * Define las transiciones de estado permitidas para tickets
 */
export const TICKET_STATE_TRANSITIONS: StateTransition[] = [
  // Open → In Progress (Support Staff, Admin, Super Admin)
  {
    from: 'open',
    to: 'in_progress',
    allowedRoles: ['support_staff', 'admin', 'super_admin'],
  },
  // In Progress → Waiting on Customer (Support Staff, Admin, Super Admin)
  {
    from: 'in_progress',
    to: 'waiting_on_customer',
    allowedRoles: ['support_staff', 'admin', 'super_admin'],
  },
  // Waiting on Customer → In Progress (Support Staff, Admin, Super Admin)
  {
    from: 'waiting_on_customer',
    to: 'in_progress',
    allowedRoles: ['support_staff', 'admin', 'super_admin'],
  },
  // In Progress → Resolved (Support Staff, Admin, Super Admin)
  {
    from: 'in_progress',
    to: 'resolved',
    allowedRoles: ['support_staff', 'admin', 'super_admin'],
  },
  // Waiting on Customer → Resolved (Support Staff, Admin, Super Admin)
  {
    from: 'waiting_on_customer',
    to: 'resolved',
    allowedRoles: ['support_staff', 'admin', 'super_admin'],
  },
  // Resolved → Closed (Support Staff, Agent, Admin, Super Admin)
  {
    from: 'resolved',
    to: 'closed',
    allowedRoles: ['agent', 'support_staff', 'admin', 'super_admin'],
  },
  // Open → Closed (Solo Admin, Super Admin pueden cerrar sin resolver)
  {
    from: 'open',
    to: 'closed',
    allowedRoles: ['admin', 'super_admin'],
  },
  // Agent solo puede cerrar tickets
  {
    from: null,
    to: 'closed',
    allowedRoles: ['agent'],
  },
  // Cualquiera → Cancelled (Admin, Super Admin)
  {
    from: null,
    to: 'cancelled',
    allowedRoles: ['admin', 'super_admin'],
    requiresReason: true,
  },
]

/**
 * Verifica si un rol puede realizar una transición de estado de ticket
 */
export function canPerformTicketTransition(
  role: RoleName,
  fromStatus: TicketStatus,
  toStatus: TicketStatus
): boolean {
  const transition = TICKET_STATE_TRANSITIONS.find(
    (t) => (t.from === null || t.from === fromStatus) && t.to === toStatus
  )

  if (!transition) return false

  return transition.allowedRoles.includes(role)
}

/**
 * Obtiene las transiciones permitidas desde un estado de ticket para un rol
 */
export function getAllowedTicketTransitions(
  role: RoleName,
  currentStatus: TicketStatus
): TicketStatus[] {
  return TICKET_STATE_TRANSITIONS
    .filter((t) => {
      const isFromCurrentState = t.from === null || t.from === currentStatus
      const isRoleAllowed = t.allowedRoles.includes(role)
      return isFromCurrentState && isRoleAllowed
    })
    .map((t) => t.to as TicketStatus)
}

// ============================================
// CAMPOS SENSIBLES POR ENTIDAD
// ============================================

/**
 * Campos que support_staff NO puede ver (ofuscados)
 */
export const SENSITIVE_FIELDS_READ = {
  users: ['ssn', 'date_of_birth'],
  applicants: ['ssn', 'date_of_birth'],
  applications: ['external_reference_id'],
}

/**
 * Campos que support_staff NO puede editar
 * Según RN-006: SSN, fecha nacimiento, Medicare ID, montos
 */
export const SENSITIVE_FIELDS_EDIT = {
  users: ['ssn', 'date_of_birth', 'agent_id'],
  applicants: ['ssn', 'date_of_birth', 'weight', 'height_feet', 'height_inches'],
  applications: [
    'external_reference_id',
    'agent_id',
    'enrollment_data', // Contiene montos
    'api_response',
    'status_changed_by',
  ],
  coverages: ['monthly_premium', 'payment_frequency', 'term'],
}

/**
 * Verifica si un campo es sensible para lectura
 */
export function isSensitiveFieldForRead(
  entity: keyof typeof SENSITIVE_FIELDS_READ,
  field: string
): boolean {
  return SENSITIVE_FIELDS_READ[entity]?.includes(field) ?? false
}

/**
 * Verifica si un campo es sensible para edición
 */
export function isSensitiveFieldForEdit(
  entity: keyof typeof SENSITIVE_FIELDS_EDIT,
  field: string
): boolean {
  return SENSITIVE_FIELDS_EDIT[entity]?.includes(field) ?? false
}

/**
 * Obtiene lista de campos sensibles para una entidad
 */
export function getSensitiveFields(
  entity: keyof typeof SENSITIVE_FIELDS_READ | keyof typeof SENSITIVE_FIELDS_EDIT,
  operation: 'read' | 'edit'
): string[] {
  if (operation === 'read') {
    return SENSITIVE_FIELDS_READ[entity as keyof typeof SENSITIVE_FIELDS_READ] || []
  }
  return SENSITIVE_FIELDS_EDIT[entity as keyof typeof SENSITIVE_FIELDS_EDIT] || []
}

// ============================================
// REGLAS DE NEGOCIO
// ============================================

/**
 * RN-002: Support Staff Scope
 * Define si un support_staff tiene scope global o agent_specific
 */
export function getSupportStaffScope(createdBy: RoleName): 'global' | 'agent_specific' {
  // Si fue creado por admin o super_admin → global
  if (createdBy === 'admin' || createdBy === 'super_admin') {
    return 'global'
  }
  // Si fue creado por agent → agent_specific
  if (createdBy === 'agent') {
    return 'agent_specific'
  }
  return 'global'
}

/**
 * Roles que pueden ser asignados como agent_id en users
 */
export const AGENT_ASSIGNABLE_ROLES: RoleName[] = ['agent']

/**
 * Roles que se consideran "clientes" para efectos de asignación a agents
 */
export const CLIENT_ROLES: RoleName[] = ['client']

/**
 * Roles que tienen acceso al admin dashboard
 */
export const ADMIN_DASHBOARD_ROLES: RoleName[] = ['super_admin', 'admin', 'agent', 'support_staff']

