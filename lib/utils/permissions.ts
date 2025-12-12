import { createClient as createServerClient } from '@/lib/supabase/server'

/**
 * Verifica si un usuario tiene uno de los roles permitidos
 */
export async function checkUserRole(
  userId: string,
  allowedRoles: string[]
): Promise<boolean> {
  const supabase = await createServerClient()
  
  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single()
  
  if (error || !data) {
    console.error('Error checking user role:', error)
    return false
  }
  
  return allowedRoles.includes(data.role)
}

/**
 * Verifica si un usuario es admin
 */
export async function requireAdmin(userId: string): Promise<boolean> {
  return checkUserRole(userId, ['super_admin', 'admin'])
}

/**
 * Verifica si un usuario es super admin
 */
export async function requireSuperAdmin(userId: string): Promise<boolean> {
  return checkUserRole(userId, ['super_admin'])
}

/**
 * Verifica si un usuario tiene acceso al admin dashboard
 * (super_admin, admin o support_staff)
 */
export async function requireAdminAccess(userId: string): Promise<boolean> {
  return checkUserRole(userId, ['super_admin', 'admin', 'support_staff'])
}

/**
 * Obtiene el rol de un usuario (desde users.role)
 */
export async function getUserRoles(userId: string): Promise<string[]> {
  const supabase = await createServerClient()
  
  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single()
  
  if (error || !data) {
    console.error('Error fetching user role:', error)
    return []
  }
  
  // Retornar como array para mantener compatibilidad con código existente
  return data.role ? [data.role] : []
}

/**
 * Constantes de permisos por rol
 * NOTA: Estos son permisos base. El scope adicional se valida en tiempo de ejecución
 */
export const ROLE_PERMISSIONS = {
  super_admin: {
    users: { view: true, edit: true, delete: true, assign_roles: true, create: true },
    applications: { view: true, edit: true, delete: true, change_status: true },
    documents: { view: true, edit: true, delete: true, upload: true },
    tickets: { view: true, edit: true, assign: true, create: true },
    reports: { view: true },
    sensitive_data: { view: true },
    activity_logs: { view: true },
  },
  admin: {
    users: { view: true, edit: true, delete: true, assign_roles: true, create: true },
    applications: { view: true, edit: true, delete: true, change_status: true },
    documents: { view: true, edit: true, delete: true, upload: true },
    tickets: { view: true, edit: true, assign: true, create: true },
    reports: { view: true },
    sensitive_data: { view: true },
    activity_logs: { view: true },
  },
  agent: {
    users: { view: true, edit: true, delete: false, assign_roles: false, create: true },
    applications: { view: true, edit: true, delete: false, change_status: true },
    documents: { view: true, edit: true, delete: true, upload: true },
    tickets: { view: true, edit: true, assign: false, create: true },
    reports: { view: true }, // Solo sus métricas
    sensitive_data: { view: true }, // Solo de sus clients
    activity_logs: { view: false },
  },
  support_staff: {
    users: { view: true, edit: false, delete: false, assign_roles: false, create: false },
    applications: { view: true, edit: true, delete: false, change_status: true },
    documents: { view: true, edit: true, delete: false, upload: true },
    tickets: { view: true, edit: true, assign: true, create: true },
    reports: { view: true }, // Según scope
    sensitive_data: { view: false }, // Datos ofuscados
    activity_logs: { view: false },
  },
  client: {
    users: { view: false, edit: false, delete: false, assign_roles: false, create: false },
    applications: { view: false, edit: false, delete: false, change_status: false },
    documents: { view: false, edit: false, delete: false, upload: false },
    tickets: { view: false, edit: false, assign: false, create: false },
    reports: { view: false },
    sensitive_data: { view: false },
    activity_logs: { view: false },
  },
} as const

/**
 * Verifica si un usuario tiene un permiso específico
 */
export async function hasPermission(
  userId: string,
  resource: keyof typeof ROLE_PERMISSIONS.admin,
  action: string
): Promise<boolean> {
  const roles = await getUserRoles(userId)
  
  if (roles.length === 0) return false
  
  const userRole = roles[0] // Solo hay un rol por usuario
  
  // El super_admin y admin siempre tienen todos los permisos
  if (userRole === 'super_admin' || userRole === 'admin') return true
  
  // Verificar permisos del rol
  const rolePerms = ROLE_PERMISSIONS[userRole as keyof typeof ROLE_PERMISSIONS]
  if (rolePerms) {
    const resourcePerms = rolePerms[resource] as any
    if (resourcePerms && resourcePerms[action]) {
      return true
    }
  }
  
  return false
}

/**
 * Obtiene el scope de un usuario (global o agent_specific)
 * Solo aplica para support_staff
 */
export async function getUserScope(userId: string): Promise<{
  scope: 'global' | 'agent_specific'
  assignedAgentId?: string | null
}> {
  const supabase = await createServerClient()
  
  const { data: user, error } = await supabase
    .from('users')
    .select('scope, assigned_to_agent_id, role')
    .eq('id', userId)
    .single()

  if (error || !user) {
    return { scope: 'global' }
  }

  // Solo support_staff tiene scope
  if (user.role !== 'support_staff') {
    return { scope: 'global' }
  }

  return {
    scope: (user.scope as 'global' | 'agent_specific') || 'global',
    assignedAgentId: user.assigned_to_agent_id,
  }
}

/**
 * Verifica si un usuario puede acceder a una entidad específica
 * Considera el scope del usuario (para agents y support_staff)
 */
export async function canAccessEntity(
  userId: string,
  entityType: 'application' | 'user' | 'document' | 'ticket',
  entityId: string
): Promise<boolean> {
  const supabase = await createServerClient()
  const roles = await getUserRoles(userId)
  
  // Super admin y admin siempre pueden acceder
  if (roles.includes('super_admin') || roles.includes('admin')) {
    return true
  }

  // Agent: solo entidades con su agent_id
  if (roles.includes('agent')) {
    // Obtener el agent_id del usuario
    const { data: agentData } = await supabase
      .from('agents')
      .select('id')
      .eq('user_id', userId)
      .single()
    
    if (!agentData) return false

    // Verificar según el tipo de entidad
    switch (entityType) {
      case 'application': {
        const { data } = await supabase
          .from('applications')
          .select('agent_id')
          .eq('id', entityId)
          .single()
        return data?.agent_id === agentData.id
      }
      case 'user': {
        const { data } = await supabase
          .from('users')
          .select('agent_profile_id, created_by')
          .eq('id', entityId)
          .single()
        // Puede ver si el user tiene su agent_profile_id O si él lo creó
        return data?.agent_profile_id === agentData.id || data?.created_by === userId
      }
      case 'document': {
        const { data } = await supabase
          .from('documents')
          .select(`
            client_id,
            users!documents_client_id_fkey (agent_profile_id)
          `)
          .eq('id', entityId)
          .single()
        return (data as any)?.users?.agent_profile_id === agentData.id
      }
      case 'ticket': {
        const { data } = await supabase
          .from('support_tickets')
          .select(`
            client_id,
            created_by,
            users!support_tickets_client_id_fkey (agent_id)
          `)
          .eq('id', entityId)
          .single()
        // Puede ver si el ticket es de su client O si él lo creó
        return (data as any)?.users?.agent_id === agentData.id || data?.created_by === userId
      }
    }
  }

  // Support Staff: según scope
  if (roles.includes('support_staff')) {
    const { scope, assignedAgentId } = await getUserScope(userId)
    
    // Scope global: puede acceder a todo
    if (scope === 'global') {
      return true
    }

    // Scope agent_specific: solo entidades del agent asignado
    if (scope === 'agent_specific' && assignedAgentId) {
      switch (entityType) {
        case 'application': {
          const { data } = await supabase
            .from('applications')
            .select('agent_id')
            .eq('id', entityId)
            .single()
          return data?.agent_id === assignedAgentId
        }
        case 'user': {
          const { data } = await supabase
            .from('users')
            .select('agent_id')
            .eq('id', entityId)
            .single()
          return data?.agent_id === assignedAgentId
        }
        case 'document': {
          const { data } = await supabase
            .from('documents')
            .select(`
              client_id,
              users!documents_client_id_fkey (agent_id)
            `)
            .eq('id', entityId)
            .single()
          return (data as any)?.users?.agent_id === assignedAgentId
        }
        case 'ticket': {
          const { data } = await supabase
            .from('support_tickets')
            .select(`
              client_id,
              users!support_tickets_client_id_fkey (agent_id)
            `)
            .eq('id', entityId)
            .single()
          return (data as any)?.users?.agent_id === assignedAgentId
        }
      }
    }
  }

  return false
}

