/**
 * Tipos específicos para el Admin Dashboard
 */

export interface AdminUser {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  roles: UserRole[]
  created_at: string
  last_login?: string
  is_active: boolean
}

export interface UserRole {
  id: string
  name: 'super_admin' | 'admin' | 'support_staff' | 'finance_staff' | 'agent' | 'user'
  description: string | null
}

export interface RolePermissions {
  canViewUsers: boolean
  canEditUsers: boolean
  canDeleteUsers: boolean
  canAssignRoles: boolean
  canViewApplications: boolean
  canEditApplications: boolean
  canDeleteApplications: boolean
  canViewSensitiveData: boolean
  canManageDocuments: boolean
  canViewReports: boolean
}

export interface AdminStats {
  totalApplications: number
  activeUsers: number
  applicationsThisMonth: number
  newUsersThisMonth: number
  pendingApplications: number
  approvedApplications: number
  rejectedApplications: number
}

export interface ApplicationFilters {
  status?: string[]
  startDate?: string
  endDate?: string
  carrier?: string
  search?: string
}

export interface UserFilters {
  role?: string[]
  status?: 'active' | 'inactive'
  startDate?: string
  endDate?: string
  search?: string
}

export interface PaginationParams {
  page: number
  pageSize: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface AdminActivityLog {
  id: string
  user_id: string
  user_email: string
  user_name: string
  action: string
  entity_type: 'user' | 'application' | 'role' | 'document'
  entity_id: string
  changes?: Record<string, any>
  created_at: string
}

export interface ApplicationNote {
  id: string
  application_id: string
  user_id: string
  user_name: string
  user_email: string
  note: string
  created_at: string
}

/**
 * Helper para obtener permisos según el rol
 */
export function getRolePermissions(roleName: string): RolePermissions {
  switch (roleName) {
    case 'super_admin':
      return {
        canViewUsers: true,
        canEditUsers: true,
        canDeleteUsers: true, // Puede eliminar admins también
        canAssignRoles: true,
        canViewApplications: true,
        canEditApplications: true,
        canDeleteApplications: true,
        canViewSensitiveData: true,
        canManageDocuments: true,
        canViewReports: true,
      }
    
    case 'admin':
      return {
        canViewUsers: true,
        canEditUsers: true,
        canDeleteUsers: true, // Puede eliminar usuarios pero NO admins
        canAssignRoles: true,
        canViewApplications: true,
        canEditApplications: true,
        canDeleteApplications: true,
        canViewSensitiveData: true,
        canManageDocuments: true,
        canViewReports: true,
      }
    
    case 'support_staff':
      return {
        canViewUsers: true,
        canEditUsers: false,
        canDeleteUsers: false,
        canAssignRoles: false,
        canViewApplications: true,
        canEditApplications: true, // Puede cambiar status
        canDeleteApplications: false,
        canViewSensitiveData: false, // SSN ofuscado
        canManageDocuments: true,
        canViewReports: true,
      }
    
    // Roles futuros
    case 'finance_staff':
      return {
        canViewUsers: true,
        canEditUsers: false,
        canDeleteUsers: false,
        canAssignRoles: false,
        canViewApplications: true,
        canEditApplications: false,
        canDeleteApplications: false,
        canViewSensitiveData: false,
        canManageDocuments: true,
        canViewReports: true,
      }
    
    case 'agent':
      return {
        canViewUsers: false,
        canEditUsers: false,
        canDeleteUsers: false,
        canAssignRoles: false,
        canViewApplications: true, // Solo sus propias applications
        canEditApplications: false,
        canDeleteApplications: false,
        canViewSensitiveData: false,
        canManageDocuments: false,
        canViewReports: false,
      }
    
    default:
      return {
        canViewUsers: false,
        canEditUsers: false,
        canDeleteUsers: false,
        canAssignRoles: false,
        canViewApplications: false,
        canEditApplications: false,
        canDeleteApplications: false,
        canViewSensitiveData: false,
        canManageDocuments: false,
        canViewReports: false,
      }
  }
}

/**
 * Helper para verificar si un rol puede acceder al admin dashboard
 */
export function canAccessAdminDashboard(roleName: string): boolean {
  return ['super_admin', 'admin', 'support_staff', 'finance_staff'].includes(roleName)
}

/**
 * Helper para ofuscar datos sensibles si el usuario no tiene permisos
 */
export function maskSensitiveData(data: string, canView: boolean): string {
  if (canView) return data
  if (!data) return ''
  
  // Ofuscar SSN: 123-45-6789 -> ***-**-6789
  if (data.includes('-') && data.length >= 9) {
    const parts = data.split('-')
    if (parts.length === 3) {
      return `***-**-${parts[2]}`
    }
  }
  
  // Ofuscar otros datos: mostrar solo últimos 4 caracteres
  if (data.length > 4) {
    return '*'.repeat(data.length - 4) + data.slice(-4)
  }
  
  return '****'
}

