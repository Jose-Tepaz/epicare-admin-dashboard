import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logStateTransition } from '@/lib/utils/audit-log'

/**
 * POST /api/applications/[id]/cancel
 * Cancela una application con razón
 * Accesible por: super_admin, admin, agent, support_staff
 * 
 * Body: { reason: string }
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
    const { reason } = body

    if (!reason || reason.trim() === '') {
      return NextResponse.json(
        { error: 'La razón de cancelación es requerida' },
        { status: 400 }
      )
    }

    // Obtener rol del usuario
    const { data: userData } = await supabase
      .from('users')
      .select('role, agent_id, scope, assigned_to_agent_id')
      .eq('id', user.id)
      .single()

    if (!userData) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    // Verificar que tenga permisos para cancelar
    const allowedRoles = ['super_admin', 'admin', 'agent', 'support_staff']
    if (!allowedRoles.includes(userData.role)) {
      return NextResponse.json(
        { error: 'No tienes permisos para cancelar applications' },
        { status: 403 }
      )
    }

    // Obtener application
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

    // Verificar acceso según rol y scope
    const canAccess = await verifyAccess(
      userData.role,
      userData.agent_id,
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

    // Verificar que no esté ya cancelada
    if (application.status === 'cancelled') {
      return NextResponse.json(
        { error: 'La application ya está cancelada' },
        { status: 400 }
      )
    }

    // Verificar que no esté active o rejected
    if (application.status === 'active' || application.status === 'rejected') {
      return NextResponse.json(
        { 
          error: `No se puede cancelar una application en estado ${application.status}`,
          currentStatus: application.status
        },
        { status: 400 }
      )
    }

    // Llamar a la función de BD para cancelar
    const { data: cancelResult, error: cancelError } = await supabase
      .rpc('cancel_application', {
        p_application_id: params.id,
        p_cancelled_by: user.id,
        p_reason: reason
      })

    if (cancelError) {
      console.error('Error cancelling application:', cancelError)
      return NextResponse.json(
        { error: `Error al cancelar: ${cancelError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Application ${application.email} cancelada correctamente`,
      data: {
        applicationId: params.id,
        oldStatus: application.status,
        newStatus: 'cancelled',
        cancelledBy: user.id,
        reason
      }
    })

  } catch (error: any) {
    console.error('Error in cancel application API:', error)
    
    // Capturar errores específicos
    if (error.message?.includes('Cannot cancel')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
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

