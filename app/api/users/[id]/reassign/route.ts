import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/utils/permissions'
import { logReassignment } from '@/lib/utils/audit-log'

/**
 * POST /api/users/[id]/reassign
 * Reasigna un cliente de un agent a otro
 * Solo accesible por admin y super_admin
 * 
 * Body: { newAgentId: string, reason?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    // Verificar autenticación
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser()
    if (authError || !currentUser) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    // Verificar permisos (solo admin/super_admin)
    const isAdmin = await requireAdmin(currentUser.id)
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'No tienes permisos para reasignar clientes' },
        { status: 403 }
      )
    }

    // Obtener datos del body
    const body = await request.json()
    const { newAgentId, reason } = body

    if (!newAgentId) {
      return NextResponse.json(
        { error: 'newAgentId es requerido' },
        { status: 400 }
      )
    }

    // Verificar que el cliente existe y es tipo client
    const { data: client, error: getClientError } = await supabase
      .from('users')
      .select('id, role, email, agent_id, first_name, last_name')
      .eq('id', params.id)
      .single()

    if (getClientError || !client) {
      return NextResponse.json(
        { error: 'Cliente no encontrado' },
        { status: 404 }
      )
    }

    if (client.role !== 'client') {
      return NextResponse.json(
        { error: 'Solo se pueden reasignar usuarios con rol "client"' },
        { status: 400 }
      )
    }

    // Verificar que el nuevo agent existe
    const { data: newAgent, error: getAgentError } = await supabase
      .from('agents')
      .select('id, name, agent_code')
      .eq('id', newAgentId)
      .single()

    if (getAgentError || !newAgent) {
      return NextResponse.json(
        { error: 'El nuevo agent no existe' },
        { status: 404 }
      )
    }

    // Mismo agent
    if (client.agent_id === newAgentId) {
      return NextResponse.json(
        { error: 'El cliente ya está asignado a este agent' },
        { status: 400 }
      )
    }

    const oldAgentId = client.agent_id

    // Reasignar cliente
    const { error: updateError } = await supabase
      .from('users')
      .update({
        agent_id: newAgentId,
        reassigned_by: currentUser.id,
        reassigned_at: new Date().toISOString(),
      })
      .eq('id', params.id)

    if (updateError) {
      console.error('Error reassigning client:', updateError)
      return NextResponse.json(
        { error: 'Error al reasignar cliente' },
        { status: 500 }
      )
    }

    // Log de auditoría
    await logReassignment(currentUser.id, params.id, oldAgentId, newAgentId, reason)

    return NextResponse.json({
      success: true,
      message: `Cliente ${client.email} reasignado a ${newAgent.name} (${newAgent.agent_code})`,
      data: {
        clientId: client.id,
        oldAgentId,
        newAgentId,
        reason,
      },
      note: 'Los requests históricos mantienen el agent_id original'
    })

  } catch (error) {
    console.error('Error in reassign client API:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

