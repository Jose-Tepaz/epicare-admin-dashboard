/**
 * Tipos específicos para el Admin Dashboard
 */

// Tipos de scope
export type UserScope = 'global' | 'agent_specific'
export type SupportStaffScope = 'global' | 'agent_specific'

// Roles del sistema
export type RoleName = 'super_admin' | 'admin' | 'agent' | 'support_staff' | 'client'

// Estados de aplicaciones (según BD actual)
export type ApplicationStatus = 
  | 'draft' 
  | 'submitted' 
  | 'pending_approval'  // ✅ Estado real en BD
  | 'approved' 
  | 'rejected' 
  | 'active'           // ✅ Estado real en BD (completada)
  | 'cancelled'

// Estados de tickets
export type TicketStatus = 
  | 'open' 
  | 'in_progress' 
  | 'waiting_on_customer' 
  | 'resolved' 
  | 'closed' 
  | 'cancelled'

export interface Application {
  id: string
  user_id: string
  company_id: string | null
  carrier_name: string | null
  status: ApplicationStatus
  enrollment_data: any
  created_at: string
  updated_at: string
  users?: {
    email: string
    first_name: string | null
    last_name: string | null
  } | null
  insurance_companies?: {
    name: string
    logo_url: string | null
  } | null
}

export interface AdminUser {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  role: RoleName
  roles: UserRole[]
  created_at: string
  last_login?: string
  is_active: boolean
  agent_id?: string | null
  scope?: UserScope
  assigned_to_agent_id?: string | null
  created_by?: string | null
  created_via?: 'marketplace' | 'admin_dashboard' | 'agent_dashboard'
}

export interface UserRole {
  id: string
  name: RoleName
  description: string | null
}

export interface RolePermissions {
  // Users
  canViewUsers: boolean
  canEditUsers: boolean
  canDeleteUsers: boolean
  canAssignRoles: boolean
  canCreateUsers: boolean
  canInactivateUsers: boolean
  canReassignClients: boolean
  
  // Applications/Requests
  canViewApplications: boolean
  canEditApplications: boolean
  canDeleteApplications: boolean
  canChangeApplicationStatus: boolean
  canCancelApplications: boolean
  
  // Documents
  canViewDocuments: boolean
  canUploadDocuments: boolean
  canReplaceDocuments: boolean
  canExpireDocuments: boolean
  canDeleteDocuments: boolean
  
  // Support Tickets
  canViewTickets: boolean
  canCreateTickets: boolean
  canEditTickets: boolean
  canAssignTickets: boolean
  canCloseTickets: boolean
  canViewInternalNotes: boolean
  
  // General
  canViewSensitiveData: boolean
  canViewReports: boolean
  canViewActivityLogs: boolean
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
  user_email?: string
  user_name?: string
  action: string
  entity_type: 'user' | 'application' | 'role' | 'document' | 'ticket'
  entity_id: string
  metadata?: Record<string, any>
  old_values?: Record<string, any>
  new_values?: Record<string, any>
  ip_address?: string
  user_agent?: string
  created_at: string
}

// Transiciones de estado
export interface StateTransition {
  from: ApplicationStatus | TicketStatus | null
  to: ApplicationStatus | TicketStatus
  allowedRoles: RoleName[]
  requiresReason?: boolean
}

// Datos de usuario con información de agent
export interface UserWithAgent extends AdminUser {
  agent?: {
    id: string
    name: string
    agent_code: string
  }
  assigned_agent?: {
    id: string
    name: string
    agent_code: string
  }
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

// Support Tickets
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface SupportTicket {
  id: string
  ticket_number: string
  client_id: string | null
  created_by: string
  assigned_to: string | null
  status: TicketStatus
  priority: TicketPriority
  subject: string
  description: string
  resolution: string | null
  closed_by: string | null
  closed_at: string | null
  created_at: string
  updated_at: string
}

export interface SupportTicketWithRelations extends SupportTicket {
  client?: {
    id: string
    email: string
    first_name: string | null
    last_name: string | null
    phone: string | null
  }
  creator: {
    id: string
    email: string
    first_name: string | null
    last_name: string | null
  }
  assigned?: {
    id: string
    email: string
    first_name: string | null
    last_name: string | null
  }
  closer?: {
    id: string
    email: string
    first_name: string | null
    last_name: string | null
  }
  messages?: TicketMessage[]
  message_count?: number
}

export interface TicketMessage {
  id: string
  ticket_id: string
  sender_id: string
  message: string
  is_internal: boolean
  created_at: string
  sender?: {
    id: string
    email: string
    first_name: string | null
    last_name: string | null
    role: RoleName
  }
}

export interface TicketFilters {
  status?: TicketStatus[]
  priority?: TicketPriority[]
  assigned_to?: string
  client_id?: string
  search?: string
  startDate?: string
  endDate?: string
}

export interface TicketStats {
  total: number
  open: number
  in_progress: number
  waiting_on_customer: number
  resolved: number
  closed: number
  high_priority: number
  urgent: number
  assigned_to_me: number
}

// ============================================
// DOCUMENT TYPES
// ============================================

export type DocumentType = 'medical' | 'identification' | 'financial' | 'property' | 'other'

export type DocumentStatus = 'received' | 'under_review' | 'approved' | 'rejected' | 'expired'

export interface Document {
  id: string
  client_id: string
  application_id: string | null
  document_type: DocumentType
  file_url: string
  file_name: string
  file_size: number | null
  mime_type: string | null
  version: number
  is_current: boolean
  status: DocumentStatus
  uploaded_by: string
  uploaded_at: string
  expires_at: string | null
  marked_expired_by: string | null
  marked_expired_at: string | null
  status_changed_by: string | null
  status_changed_at: string | null
  created_at: string
  updated_at: string
  // Relaciones
  client?: {
    id: string
    email: string
    first_name: string | null
    last_name: string | null
  }
  uploader?: {
    id: string
    email: string
    first_name: string | null
    last_name: string | null
  }
  application?: {
    id: string
    status: string
    enrollment_data?: any
    carrier_name?: string | null
    company_id?: string | null
    insurance_companies?: {
      id: string
      name: string
      slug: string
    } | null
  } | null
}

export interface DocumentFilters {
  search?: string
  document_type?: DocumentType | 'all'
  status?: DocumentStatus | 'all'
  client_id?: string
  date_from?: string
  date_to?: string
}

export interface DocumentStats {
  total: number
  received: number
  under_review: number
  approved: number
  rejected: number
  expired: number
  uploaded_today: number
  by_type: {
    medical: number
    identification: number
    financial: number
    property: number
    other: number
  }
}

// ============================================
// DOCUMENT REQUEST TYPES
// ============================================

export type DocumentRequestPriority = 'low' | 'medium' | 'high' | 'urgent'

export type DocumentRequestStatus = 'pending' | 'fulfilled' | 'expired' | 'cancelled'

export interface DocumentRequest {
  id: string
  client_id: string
  application_id: string | null
  requested_by: string
  document_type: DocumentType
  priority: DocumentRequestPriority
  status: DocumentRequestStatus
  due_date: string | null
  notes: string | null
  fulfilled_at: string | null
  fulfilled_by: string | null
  document_id: string | null
  created_at: string
  updated_at: string
  // Relaciones
  client?: {
    id: string
    email: string
    first_name: string | null
    last_name: string | null
    phone: string | null
  }
  requester?: {
    id: string
    email: string
    first_name: string | null
    last_name: string | null
    role: RoleName
  }
  fulfiller?: {
    id: string
    email: string
    first_name: string | null
    last_name: string | null
  }
  document?: Document
  application?: {
    id: string
    status: string
    enrollment_data: any
    carrier_name: string | null
    company_id: string | null
  }
}

export interface DocumentRequestFilters {
  status?: DocumentRequestStatus | 'all'
  priority?: DocumentRequestPriority | 'all'
  client_id?: string
  document_type?: DocumentType | 'all'
  search?: string
  date_from?: string
  date_to?: string
}

export interface DocumentRequestStats {
  total: number
  pending: number
  fulfilled: number
  expired: number
  cancelled: number
  by_priority: {
    low: number
    medium: number
    high: number
    urgent: number
  }
  by_type: {
    medical: number
    identification: number
    financial: number
    property: number
    other: number
  }
}

/**
 * Helper para obtener permisos según el rol
 */
export function getRolePermissions(roleName: string): RolePermissions {
  switch (roleName) {
    case 'super_admin':
      return {
        // Users
        canViewUsers: true,
        canEditUsers: true,
        canDeleteUsers: true, // Puede eliminar todos incluyendo admins
        canAssignRoles: true,
        canCreateUsers: true,
        canInactivateUsers: true,
        canReassignClients: true,
        
        // Applications
        canViewApplications: true,
        canEditApplications: true,
        canDeleteApplications: true,
        canChangeApplicationStatus: true,
        canCancelApplications: true,
        
        // Documents
        canViewDocuments: true,
        canUploadDocuments: true,
        canReplaceDocuments: true,
        canExpireDocuments: true,
        canDeleteDocuments: true,
        
        // Tickets
        canViewTickets: true,
        canCreateTickets: true,
        canEditTickets: true,
        canAssignTickets: true,
        canCloseTickets: true,
        canViewInternalNotes: true,
        
        // General
        canViewSensitiveData: true,
        canViewReports: true,
        canViewActivityLogs: true,
      }
    
    case 'admin':
      return {
        // Users
        canViewUsers: true,
        canEditUsers: true,
        canDeleteUsers: true, // NO puede eliminar super_admins
        canAssignRoles: true,
        canCreateUsers: true,
        canInactivateUsers: true,
        canReassignClients: true,
        
        // Applications
        canViewApplications: true,
        canEditApplications: true,
        canDeleteApplications: true,
        canChangeApplicationStatus: true,
        canCancelApplications: true,
        
        // Documents
        canViewDocuments: true,
        canUploadDocuments: true,
        canReplaceDocuments: true,
        canExpireDocuments: true,
        canDeleteDocuments: true,
        
        // Tickets
        canViewTickets: true,
        canCreateTickets: true,
        canEditTickets: true,
        canAssignTickets: true,
        canCloseTickets: true,
        canViewInternalNotes: true,
        
        // General
        canViewSensitiveData: true,
        canViewReports: true,
        canViewActivityLogs: true,
      }
    
    case 'agent':
      return {
        // Users
        canViewUsers: true, // Solo sus clients y support staff
        canEditUsers: true, // Solo sus clients
        canDeleteUsers: false,
        canAssignRoles: false,
        canCreateUsers: true, // Solo client y support_staff
        canInactivateUsers: true, // Solo support_staff que creó
        canReassignClients: false,
        
        // Applications
        canViewApplications: true, // Solo sus applications
        canEditApplications: true, // Solo sus applications
        canDeleteApplications: false,
        canChangeApplicationStatus: true, // Limitado
        canCancelApplications: true,
        
        // Documents
        canViewDocuments: true, // Solo de sus clients
        canUploadDocuments: true,
        canReplaceDocuments: true,
        canExpireDocuments: true,
        canDeleteDocuments: true,
        
        // Tickets
        canViewTickets: true, // Solo sus tickets y de sus clients
        canCreateTickets: true,
        canEditTickets: true, // Solo los suyos
        canAssignTickets: false,
        canCloseTickets: true, // Solo cerrar
        canViewInternalNotes: false,
        
        // General
        canViewSensitiveData: true, // De sus clients
        canViewReports: true, // Solo sus métricas
        canViewActivityLogs: false,
      }
    
    case 'support_staff':
      return {
        // Users
        canViewUsers: true, // Según scope
        canEditUsers: false,
        canDeleteUsers: false,
        canAssignRoles: false,
        canCreateUsers: false,
        canInactivateUsers: false,
        canReassignClients: false,
        
        // Applications
        canViewApplications: true, // Según scope
        canEditApplications: true, // Campos limitados
        canDeleteApplications: false,
        canChangeApplicationStatus: true, // Limitado
        canCancelApplications: true,
        
        // Documents
        canViewDocuments: true, // Según scope
        canUploadDocuments: true,
        canReplaceDocuments: true,
        canExpireDocuments: true,
        canDeleteDocuments: false,
        
        // Tickets
        canViewTickets: true, // Según scope
        canCreateTickets: true,
        canEditTickets: true,
        canAssignTickets: true, // Solo entre support
        canCloseTickets: true,
        canViewInternalNotes: true,
        
        // General
        canViewSensitiveData: false, // Datos ofuscados
        canViewReports: true, // Limitado
        canViewActivityLogs: false,
      }
    
    case 'client':
      return {
        // Users
        canViewUsers: false,
        canEditUsers: false,
        canDeleteUsers: false,
        canAssignRoles: false,
        canCreateUsers: false,
        canInactivateUsers: false,
        canReassignClients: false,
        
        // Applications
        canViewApplications: false, // No accede al admin dashboard
        canEditApplications: false,
        canDeleteApplications: false,
        canChangeApplicationStatus: false,
        canCancelApplications: false,
        
        // Documents
        canViewDocuments: false,
        canUploadDocuments: false,
        canReplaceDocuments: false,
        canExpireDocuments: false,
        canDeleteDocuments: false,
        
        // Tickets
        canViewTickets: false,
        canCreateTickets: false,
        canEditTickets: false,
        canAssignTickets: false,
        canCloseTickets: false,
        canViewInternalNotes: false,
        
        // General
        canViewSensitiveData: false,
        canViewReports: false,
        canViewActivityLogs: false,
      }
    
    default:
      return {
        canViewUsers: false,
        canEditUsers: false,
        canDeleteUsers: false,
        canAssignRoles: false,
        canCreateUsers: false,
        canInactivateUsers: false,
        canReassignClients: false,
        canViewApplications: false,
        canEditApplications: false,
        canDeleteApplications: false,
        canChangeApplicationStatus: false,
        canCancelApplications: false,
        canViewDocuments: false,
        canUploadDocuments: false,
        canReplaceDocuments: false,
        canExpireDocuments: false,
        canDeleteDocuments: false,
        canViewTickets: false,
        canCreateTickets: false,
        canEditTickets: false,
        canAssignTickets: false,
        canCloseTickets: false,
        canViewInternalNotes: false,
        canViewSensitiveData: false,
        canViewReports: false,
        canViewActivityLogs: false,
      }
  }
}

/**
 * Helper para verificar si un rol puede acceder al admin dashboard
 */
export function canAccessAdminDashboard(roleName: string): boolean {
  return ['super_admin', 'admin', 'agent', 'support_staff'].includes(roleName)
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

