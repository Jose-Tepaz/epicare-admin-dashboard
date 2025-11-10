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
    .from('user_roles')
    .select(`
      role_id,
      roles:role_id (
        name
      )
    `)
    .eq('user_id', userId)
  
  if (error || !data) {
    console.error('Error checking user role:', error)
    return false
  }
  
  const userRoles = data
    .map((ur: any) => ur.roles?.name)
    .filter(Boolean)
  
  return userRoles.some((role: string) => allowedRoles.includes(role))
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
 * Obtiene todos los roles de un usuario
 */
export async function getUserRoles(userId: string): Promise<string[]> {
  const supabase = await createServerClient()
  
  const { data, error } = await supabase
    .from('user_roles')
    .select(`
      roles:role_id (
        name
      )
    `)
    .eq('user_id', userId)
  
  if (error || !data) {
    console.error('Error fetching user roles:', error)
    return []
  }
  
  return data
    .map((ur: any) => ur.roles?.name)
    .filter(Boolean)
}

/**
 * Constantes de permisos por rol
 */
export const ROLE_PERMISSIONS = {
  super_admin: {
    users: { view: true, edit: true, delete: true, assign_roles: true }, // Puede eliminar admins
    applications: { view: true, edit: true, delete: true },
    documents: { view: true, edit: true, delete: true },
    reports: { view: true },
    sensitive_data: { view: true },
  },
  admin: {
    users: { view: true, edit: true, delete: true, assign_roles: true }, // NO puede eliminar admins
    applications: { view: true, edit: true, delete: true },
    documents: { view: true, edit: true, delete: true },
    reports: { view: true },
    sensitive_data: { view: true },
  },
  support_staff: {
    users: { view: true, edit: false, delete: false, assign_roles: false },
    applications: { view: true, edit: true, delete: false },
    documents: { view: true, edit: true, delete: false },
    reports: { view: true },
    sensitive_data: { view: false },
  },
  // Roles futuros
  finance_staff: {
    users: { view: true, edit: false, delete: false, assign_roles: false },
    applications: { view: true, edit: false, delete: false },
    documents: { view: true, edit: true, delete: false },
    reports: { view: true },
    sensitive_data: { view: false },
  },
  agent: {
    users: { view: false, edit: false, delete: false, assign_roles: false },
    applications: { view: true, edit: false, delete: false }, // Solo sus propias
    documents: { view: true, edit: false, delete: false },
    reports: { view: false },
    sensitive_data: { view: false },
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
  
  // El super_admin y admin siempre tienen todos los permisos
  if (roles.includes('super_admin') || roles.includes('admin')) return true
  
  // Verificar permisos de otros roles
  for (const role of roles) {
    const rolePerms = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS]
    if (rolePerms) {
      const resourcePerms = rolePerms[resource] as any
      if (resourcePerms && resourcePerms[action]) {
        return true
      }
    }
  }
  
  return false
}

