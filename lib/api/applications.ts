/**
 * API helpers para applications
 */

import { createClient } from '@/lib/supabase/client'
import type { ApplicationStatus } from '@/lib/types/admin'

/**
 * Obtiene las transiciones de estado permitidas para una application
 */
export async function getAllowedStatusTransitions(
  applicationId: string
): Promise<{ success: boolean; transitions: ApplicationStatus[]; error?: string }> {
  try {
    const supabase = createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, transitions: [], error: 'No autenticado' }
    }

    const { data, error } = await supabase
      .rpc('get_allowed_status_transitions', {
        p_application_id: applicationId,
        p_user_id: user.id
      })

    if (error) {
      console.error('Error getting allowed transitions:', error)
      return { success: false, transitions: [], error: error.message }
    }

    return { success: true, transitions: data || [] }
  } catch (error) {
    console.error('Error in getAllowedStatusTransitions:', error)
    return { success: false, transitions: [], error: 'Error desconocido' }
  }
}

/**
 * Cambia el estado de una application
 */
export async function changeApplicationStatus(
  applicationId: string,
  newStatus: ApplicationStatus,
  reason?: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const response = await fetch(`/api/applications/${applicationId}/change-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ newStatus, reason }),
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.error || 'Error al cambiar estado' }
    }

    return { success: true, message: data.message }
  } catch (error) {
    console.error('Error changing application status:', error)
    return { success: false, error: 'Error de conexión' }
  }
}

/**
 * Cancela una application
 */
export async function cancelApplication(
  applicationId: string,
  reason: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const response = await fetch(`/api/applications/${applicationId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason }),
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.error || 'Error al cancelar' }
    }

    return { success: true, message: data.message }
  } catch (error) {
    console.error('Error cancelling application:', error)
    return { success: false, error: 'Error de conexión' }
  }
}

/**
 * Obtiene el badge color según el estado
 */
export function getStatusBadgeColor(status: ApplicationStatus): string {
  switch (status) {
    case 'draft':
      return 'bg-gray-100 text-gray-800'
    case 'submitted':
      return 'bg-blue-100 text-blue-800'
    case 'pending_approval':
      return 'bg-yellow-100 text-yellow-800'
    case 'approved':
      return 'bg-green-100 text-green-800'
    case 'rejected':
      return 'bg-red-100 text-red-800'
    case 'active':
      return 'bg-purple-100 text-purple-800'
    case 'cancelled':
      return 'bg-gray-100 text-gray-600'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

/**
 * Obtiene el label en español del estado
 */
export function getStatusLabel(status: ApplicationStatus): string {
  const labels: Record<ApplicationStatus, string> = {
    draft: 'Borrador',
    submitted: 'Enviada',
    pending_approval: 'En Revisión',
    approved: 'Aprobada',
    rejected: 'Rechazada',
    active: 'Activa',
    cancelled: 'Cancelada'
  }
  return labels[status] || status
}

