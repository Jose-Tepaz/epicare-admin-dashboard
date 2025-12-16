import { createAdminClient } from '@/lib/supabase/admin'
import type { NotificationMetadata } from '@/lib/types/admin'

/**
 * Crea una notificación en la base de datos
 * Usa createAdminClient para poder crear notificaciones para múltiples usuarios
 */
async function createNotification(
  userId: string,
  type: 'application' | 'document' | 'support',
  title: string,
  message: string,
  linkUrl: string | null = null,
  metadata: NotificationMetadata | null = null
): Promise<void> {
  try {
    console.log(`[Notification] Creating ${type} notification for user ${userId}:`, {
      title,
      message,
      linkUrl,
    })
    
    const supabase = createAdminClient()

    const { data, error } = await supabase.from('notifications').insert({
      user_id: userId,
      type,
      title,
      message,
      link_url: linkUrl,
      metadata,
      is_read: false,
    }).select()

    if (error) {
      console.error(`[Notification] Error creating ${type} notification for user ${userId}:`, error)
      throw error
    }
    
    console.log(`[Notification] Successfully created notification:`, data)
  } catch (err) {
    console.error(`[Notification] Failed to create notification for user ${userId}:`, err)
  }
}

/**
 * Obtiene los usuarios que deben recibir notificaciones para un cliente específico
 * Retorna: { agentId, superAdminIds, adminIds, supportStaffIds }
 */
async function getNotificationRecipients(clientId: string): Promise<{
  agentId: string | null
  superAdminIds: string[]
  adminIds: string[]
  supportStaffIds: string[]
}> {
  console.log(`[Recipients] Getting notification recipients for client: ${clientId}`)
  
  const supabase = createAdminClient()

  // Obtener información del cliente
  const { data: client, error: clientError } = await supabase
    .from('users')
    .select('agent_profile_id')
    .eq('id', clientId)
    .single()

  if (clientError || !client) {
    console.error('[Recipients] Error fetching client:', clientError)
    return {
      agentId: null,
      superAdminIds: [],
      adminIds: [],
      supportStaffIds: [],
    }
  }

  console.log(`[Recipients] Client agent_profile_id: ${client.agent_profile_id}`)

  const agentId = client.agent_profile_id

  // Obtener todos los super_admin y admin
  const { data: admins, error: adminsError } = await supabase
    .from('users')
    .select('id, role, email')
    .in('role', ['super_admin', 'admin'])

  console.log('[Recipients] Found admins:', admins, 'Error:', adminsError)

  const superAdminIds: string[] = []
  const adminIds: string[] = []

  admins?.forEach((admin) => {
    if (admin.role === 'super_admin') {
      superAdminIds.push(admin.id)
    } else if (admin.role === 'admin') {
      adminIds.push(admin.id)
    }
  })

  // Obtener support_staff según scope
  const { data: supportStaff, error: supportError } = await supabase
    .from('users')
    .select('id, scope, assigned_to_agent_id')
    .eq('role', 'support_staff')

  console.log('[Recipients] Found support_staff:', supportStaff, 'Error:', supportError)

  const supportStaffIds: string[] = []

  supportStaff?.forEach((staff) => {
    // Scope global: todos reciben notificaciones
    if (staff.scope === 'global') {
      supportStaffIds.push(staff.id)
    }
    // Scope agent_specific: solo si el cliente pertenece al agent asignado
    else if (staff.scope === 'agent_specific' && staff.assigned_to_agent_id === agentId) {
      supportStaffIds.push(staff.id)
    }
  })

  const result = {
    agentId,
    superAdminIds,
    adminIds,
    supportStaffIds,
  }
  
  console.log('[Recipients] Final recipients:', result)

  return result
}

/**
 * Crea notificaciones para todos los usuarios relevantes cuando se crea una nueva aplicación
 */
export async function createNewApplicationNotification(
  applicationId: string,
  clientId: string
): Promise<void> {
  const recipients = await getNotificationRecipients(clientId)

  // Obtener información del cliente para el mensaje
  const supabase = createAdminClient()
  const { data: client } = await supabase
    .from('users')
    .select('first_name, last_name, email')
    .eq('id', clientId)
    .single()

  const clientName = client
    ? `${client.first_name || ''} ${client.last_name || ''}`.trim() || client.email
    : 'Un cliente'

  const title = 'Nueva aplicación creada'
  const message = `${clientName} ha creado una nueva aplicación`
  const linkUrl = `/admin/requests/${applicationId}`
  const metadata: NotificationMetadata = {
    application_id: applicationId,
  }

  const promises: Promise<void>[] = []

  // Notificar al agent del cliente (si tiene uno)
  if (recipients.agentId) {
    const { data: agent } = await supabase
      .from('agents')
      .select('user_id')
      .eq('id', recipients.agentId)
      .single()

    if (agent?.user_id) {
      promises.push(
        createNotification(agent.user_id, 'application', title, message, linkUrl, metadata)
      )
    }
  }

  // Notificar a todos los super_admin
  recipients.superAdminIds.forEach((userId) => {
    promises.push(createNotification(userId, 'application', title, message, linkUrl, metadata))
  })

  // Notificar a todos los admin
  recipients.adminIds.forEach((userId) => {
    promises.push(createNotification(userId, 'application', title, message, linkUrl, metadata))
  })

  // Notificar a support_staff relevantes
  recipients.supportStaffIds.forEach((userId) => {
    promises.push(createNotification(userId, 'application', title, message, linkUrl, metadata))
  })

  await Promise.allSettled(promises)
}

/**
 * Crea notificaciones cuando el cliente crea o responde un ticket
 */
export async function createTicketNotification(
  ticketId: string,
  clientId: string,
  type: 'new' | 'reply',
  ticketNumber?: string
): Promise<void> {
  console.log(`[createTicketNotification] Creating ${type} notification for ticket ${ticketId}, client ${clientId}`)
  
  const recipients = await getNotificationRecipients(clientId)
  
  console.log(`[createTicketNotification] Recipients:`, {
    superAdminCount: recipients.superAdminIds.length,
    adminCount: recipients.adminIds.length,
    supportStaffCount: recipients.supportStaffIds.length,
    agentId: recipients.agentId,
  })

  // Obtener información del cliente para el mensaje
  const supabase = createAdminClient()
  const { data: client } = await supabase
    .from('users')
    .select('first_name, last_name, email')
    .eq('id', clientId)
    .single()

  const clientName = client
    ? `${client.first_name || ''} ${client.last_name || ''}`.trim() || client.email
    : 'Un cliente'

  const title = type === 'new' ? 'Nuevo ticket de soporte' : 'Respuesta en ticket'
  const message =
    type === 'new'
      ? `${clientName} ha creado un nuevo ticket${ticketNumber ? ` #${ticketNumber}` : ''}`
      : `${clientName} ha respondido en el ticket${ticketNumber ? ` #${ticketNumber}` : ''}`
  const linkUrl = `/admin/support/${ticketId}`
  const metadata: NotificationMetadata = {
    ticket_id: ticketId,
  }

  const promises: Promise<void>[] = []

  // Notificar al agent del cliente (si tiene uno)
  if (recipients.agentId) {
    const { data: agent } = await supabase
      .from('agents')
      .select('user_id')
      .eq('id', recipients.agentId)
      .single()

    if (agent?.user_id) {
      promises.push(
        createNotification(agent.user_id, 'support', title, message, linkUrl, metadata)
      )
    }
  }

  // Notificar a todos los super_admin
  console.log(`[createTicketNotification] Notifying ${recipients.superAdminIds.length} super_admins`)
  recipients.superAdminIds.forEach((userId) => {
    console.log(`[createTicketNotification] Creating notification for super_admin: ${userId}`)
    promises.push(createNotification(userId, 'support', title, message, linkUrl, metadata))
  })

  // Notificar a todos los admin
  console.log(`[createTicketNotification] Notifying ${recipients.adminIds.length} admins`)
  recipients.adminIds.forEach((userId) => {
    console.log(`[createTicketNotification] Creating notification for admin: ${userId}`)
    promises.push(createNotification(userId, 'support', title, message, linkUrl, metadata))
  })

  // Notificar a support_staff relevantes
  console.log(`[createTicketNotification] Notifying ${recipients.supportStaffIds.length} support_staff`)
  recipients.supportStaffIds.forEach((userId) => {
    console.log(`[createTicketNotification] Creating notification for support_staff: ${userId}`)
    promises.push(createNotification(userId, 'support', title, message, linkUrl, metadata))
  })

  console.log(`[createTicketNotification] Waiting for ${promises.length} notification promises to complete`)
  const results = await Promise.allSettled(promises)
  
  const succeeded = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length
  
  console.log(`[createTicketNotification] Completed: ${succeeded} succeeded, ${failed} failed`)
  
  if (failed > 0) {
    console.error(`[createTicketNotification] Some notifications failed:`, results.filter(r => r.status === 'rejected'))
  }
}

/**
 * Crea notificaciones cuando el cliente envía/sube un documento
 */
export async function createDocumentUploadNotification(
  documentId: string,
  clientId: string,
  documentName?: string
): Promise<void> {
  const recipients = await getNotificationRecipients(clientId)

  // Obtener información del cliente para el mensaje
  const supabase = createAdminClient()
  const { data: client } = await supabase
    .from('users')
    .select('first_name, last_name, email')
    .eq('id', clientId)
    .single()

  const clientName = client
    ? `${client.first_name || ''} ${client.last_name || ''}`.trim() || client.email
    : 'Un cliente'

  const title = 'Documento enviado'
  const message = `${clientName} ha enviado un documento${documentName ? `: ${documentName}` : ''}`
  const linkUrl = '/admin/documents'
  const metadata: NotificationMetadata = {
    document_id: documentId,
  }

  const promises: Promise<void>[] = []

  // Notificar al agent del cliente (si tiene uno)
  if (recipients.agentId) {
    const { data: agent } = await supabase
      .from('agents')
      .select('user_id')
      .eq('id', recipients.agentId)
      .single()

    if (agent?.user_id) {
      promises.push(
        createNotification(agent.user_id, 'document', title, message, linkUrl, metadata)
      )
    }
  }

  // Notificar a todos los super_admin
  recipients.superAdminIds.forEach((userId) => {
    promises.push(createNotification(userId, 'document', title, message, linkUrl, metadata))
  })

  // Notificar a todos los admin
  recipients.adminIds.forEach((userId) => {
    promises.push(createNotification(userId, 'document', title, message, linkUrl, metadata))
  })

  // Notificar a support_staff relevantes
  recipients.supportStaffIds.forEach((userId) => {
    promises.push(createNotification(userId, 'document', title, message, linkUrl, metadata))
  })

  await Promise.allSettled(promises)
}

