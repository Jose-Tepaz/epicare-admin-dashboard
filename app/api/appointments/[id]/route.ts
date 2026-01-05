import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/**
 * PUT /api/appointments/[id]
 * Actualizar appointment
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const appointmentId = params.id

    // Verificar autenticación
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Solo admin y super_admin pueden editar appointments
    const adminClient = createAdminClient()
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('role, active_role')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'Error al verificar permisos' }, { status: 500 })
    }

    const userRole = userData.active_role || userData.role
    const isAdmin = ['admin', 'super_admin'].includes(userRole)

    if (!isAdmin) {
      return NextResponse.json({ 
        error: 'No tienes permisos para editar appointments' 
      }, { status: 403 })
    }

    // Obtener datos del body
    const body = await request.json()
    const {
      agent_number,
      start_date,
      expiration_date,
      status,
      commission_percentage,
      additional_data
    } = body

    const updateData: any = {}

    if (agent_number !== undefined) updateData.agent_number = agent_number
    if (start_date !== undefined) updateData.start_date = start_date
    if (expiration_date !== undefined) updateData.expiration_date = expiration_date
    if (status) updateData.status = status
    if (commission_percentage !== undefined) updateData.commission_percentage = commission_percentage
    if (additional_data !== undefined) updateData.additional_data = additional_data

    // Actualizar is_active basado en status
    if (status) {
      updateData.is_active = status === 'active'
    }

    // Actualizar appointment
    const { data: appointment, error: updateError } = await adminClient
      .from('appointments')
      .update(updateData)
      .eq('id', appointmentId)
      .select(`
        *,
        agent:agent_profiles!appointments_agent_profile_id_fkey (
          id,
          first_name,
          last_name,
          business_name
        ),
        company:insurance_companies!appointments_company_id_fkey (
          id,
          name,
          logo_url
        )
      `)
      .single()

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Appointment no encontrado' }, { status: 404 })
      }
      console.error('Error updating appointment:', updateError)
      return NextResponse.json({ error: 'Error al actualizar appointment' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Appointment actualizado exitosamente',
      appointment
    })
  } catch (error) {
    console.error('Error in PUT /api/appointments/[id]:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

/**
 * DELETE /api/appointments/[id]
 * Eliminar appointment
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const appointmentId = params.id

    // Verificar autenticación
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Solo admin y super_admin pueden eliminar appointments
    const adminClient = createAdminClient()
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('role, active_role')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'Error al verificar permisos' }, { status: 500 })
    }

    const userRole = userData.active_role || userData.role
    const isAdmin = ['admin', 'super_admin'].includes(userRole)

    if (!isAdmin) {
      return NextResponse.json({ 
        error: 'No tienes permisos para eliminar appointments' 
      }, { status: 403 })
    }

    // Eliminar appointment
    const { error: deleteError } = await adminClient
      .from('appointments')
      .delete()
      .eq('id', appointmentId)

    if (deleteError) {
      console.error('Error deleting appointment:', deleteError)
      return NextResponse.json({ error: 'Error al eliminar appointment' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Appointment eliminado exitosamente'
    })
  } catch (error) {
    console.error('Error in DELETE /api/appointments/[id]:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}


