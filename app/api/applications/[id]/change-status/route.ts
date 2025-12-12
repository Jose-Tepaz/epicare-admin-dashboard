import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logStateTransition } from '@/lib/utils/audit-log'
import type { ApplicationStatus } from '@/lib/types/admin'

/**
 * POST /api/applications/[id]/change-status
 * Cambia el estado de una application con validación de transiciones
 * 
 * Body: { newStatus: ApplicationStatus, reason?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    // Obtener datos del body
    const body = await request.json()
    const { newStatus, reason } = body

    if (!newStatus) {
      return NextResponse.json(
        { error: 'newStatus es requerido' },
        { status: 400 }
      )
    }

    // Validar que es un estado válido
    const validStatuses: ApplicationStatus[] = [
      'draft', 'submitted', 'pending_approval', 'approved', 
      'rejected', 'active', 'cancelled'
    ]
    if (!validStatuses.includes(newStatus)) {
      return NextResponse.json(
        { error: `Estado inválido: ${newStatus}` },
        { status: 400 }
      )
    }

    // Obtener application actual
    const { data: application, error: getAppError } = await supabase
      .from('applications')
      .select('id, status, email, agent_id')
      .eq('id', params.id)
      .single()

    if (getAppError || !application) {
      return NextResponse.json(
        { error: 'Application no encontrada' },
        { status: 404 }
      )
    }

    // Verificar que no sea el mismo estado
    if (application.status === newStatus) {
      return NextResponse.json(
        { error: `La application ya está en estado ${newStatus}` },
        { status: 400 }
      )
    }

    // Obtener rol del usuario
    const { data: userData } = await supabase
      .from('users')
      .select('role, agent_profile_id, scope, assigned_to_agent_id')
      .eq('id', user.id)
      .single()

    if (!userData) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    // Verificar acceso según rol y scope
    const canAccess = await verifyAccess(
      userData.role,
      userData.agent_profile_id,
      userData.scope,
      userData.assigned_to_agent_id,
      application.agent_id
    )

    if (!canAccess) {
      return NextResponse.json(
        { error: 'No tienes acceso a esta application' },
        { status: 403 }
      )
    }

    // Verificar que la transición sea válida
    // Esto se valida automáticamente en el trigger de la BD
    // pero lo verificamos aquí para dar mejor error
    const { data: canTransition } = await supabase
      .rpc('can_transition_application_status', {
        current_status: application.status,
        new_status: newStatus,
        user_role: userData.role
      })

    if (!canTransition) {
      return NextResponse.json({
        error: `No puedes cambiar el estado de ${application.status} a ${newStatus}`,
        currentStatus: application.status,
        attemptedStatus: newStatus,
        userRole: userData.role
      }, { status: 403 })
    }

    // Actualizar estado
    const { error: updateError } = await supabase
      .from('applications')
      .update({
        status: newStatus,
        status_changed_by: user.id,
        status_changed_at: new Date().toISOString(),
        ...(reason && { status_change_reason: reason })
      })
      .eq('id', params.id)

    if (updateError) {
      console.error('Error updating application status:', updateError)
      return NextResponse.json(
        { error: `Error al actualizar estado: ${updateError.message}` },
        { status: 500 }
      )
    }

    // Log de auditoría
    await logStateTransition(
      user.id,
      'application',
      params.id,
      application.status,
      newStatus,
      reason
    )

    return NextResponse.json({
      success: true,
      message: `Estado cambiado de ${application.status} a ${newStatus}`,
      data: {
        applicationId: params.id,
        oldStatus: application.status,
        newStatus,
        changedBy: user.id,
        reason
      }
    })

  } catch (error: any) {
    console.error('Error in change-status API:', error)
    
    // Capturar errores específicos del trigger
    if (error.message?.includes('cannot transition')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      )
    }
    
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

/**
 * Verifica si el usuario tiene acceso a la application según rol y scope
 */
async function verifyAccess(
  userRole: string,
  userAgentId: string | null,
  userScope: string | null,
  assignedAgentId: string | null,
  applicationAgentId: string | null
): Promise<boolean> {
  // Super admin y admin: acceso total
  if (userRole === 'super_admin' || userRole === 'admin') {
    return true
  }

  // Agent: solo sus applications
  if (userRole === 'agent') {
    return userAgentId === applicationAgentId
  }

  // Support staff: según scope
  if (userRole === 'support_staff') {
    if (userScope === 'global') {
      return true
    }
    if (userScope === 'agent_specific') {
      return assignedAgentId === applicationAgentId
    }
  }

  return false
}

