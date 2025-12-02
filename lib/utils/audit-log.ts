/**
 * Utilidades para audit logging
 */

import { createClient } from '@/lib/supabase/server'

interface LogActivityParams {
  userId: string
  action: string
  entityType: 'user' | 'application' | 'document' | 'ticket' | 'role'
  entityId: string
  metadata?: Record<string, any>
  oldValues?: Record<string, any>
  newValues?: Record<string, any>
  ipAddress?: string
  userAgent?: string
}

/**
 * Registra una actividad en el log de auditoría
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    const supabase = await createClient()
    
    const { error } = await supabase
      .from('admin_activity_logs')
      .insert({
        user_id: params.userId,
        action: params.action,
        entity_type: params.entityType,
        entity_id: params.entityId,
        metadata: params.metadata || null,
        old_values: params.oldValues || null,
        new_values: params.newValues || null,
        ip_address: params.ipAddress || null,
        user_agent: params.userAgent || null,
      })

    if (error) {
      console.error('Error logging activity:', error)
      // No lanzar error para no interrumpir la operación principal
    }
  } catch (error) {
    console.error('Error in logActivity:', error)
  }
}

/**
 * Registra una transición de estado
 */
export async function logStateTransition(
  userId: string,
  entity: 'application' | 'ticket',
  entityId: string,
  oldState: string | null,
  newState: string,
  reason?: string
): Promise<void> {
  return logActivity({
    userId,
    action: `${entity}_state_changed`,
    entityType: entity,
    entityId,
    metadata: { reason },
    oldValues: { status: oldState },
    newValues: { status: newState },
  })
}

/**
 * Registra la creación de un usuario
 */
export async function logUserCreation(
  creatorId: string,
  newUserId: string,
  role: string,
  metadata?: Record<string, any>
): Promise<void> {
  return logActivity({
    userId: creatorId,
    action: 'user_created',
    entityType: 'user',
    entityId: newUserId,
    metadata: { role, ...metadata },
    newValues: { role },
  })
}

/**
 * Registra la inactivación de un usuario
 */
export async function logUserInactivation(
  adminId: string,
  userId: string,
  reason?: string
): Promise<void> {
  return logActivity({
    userId: adminId,
    action: 'user_inactivated',
    entityType: 'user',
    entityId: userId,
    metadata: { reason },
    oldValues: { is_active: true },
    newValues: { is_active: false },
  })
}

/**
 * Registra la reasignación de un cliente a otro agent
 */
export async function logReassignment(
  adminId: string,
  clientId: string,
  oldAgentId: string | null,
  newAgentId: string,
  reason?: string
): Promise<void> {
  return logActivity({
    userId: adminId,
    action: 'client_reassigned',
    entityType: 'user',
    entityId: clientId,
    metadata: { reason },
    oldValues: { agent_id: oldAgentId },
    newValues: { agent_id: newAgentId },
  })
}

/**
 * Registra una actualización de usuario
 */
export async function logUserUpdate(
  adminId: string,
  userId: string,
  oldValues: Record<string, any>,
  newValues: Record<string, any>
): Promise<void> {
  return logActivity({
    userId: adminId,
    action: 'user_updated',
    entityType: 'user',
    entityId: userId,
    oldValues,
    newValues,
  })
}

