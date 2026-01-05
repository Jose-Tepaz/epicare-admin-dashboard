import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/**
 * PUT /api/licenses/[id]
 * Actualizar license
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const licenseId = params.id

    // Verificar autenticación
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Solo admin y super_admin pueden editar licenses
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
        error: 'No tienes permisos para editar licenses' 
      }, { status: 403 })
    }

    // Obtener datos del body
    const body = await request.json()
    const {
      license_number,
      status,
      document_url
    } = body

    const updateData: any = {}

    if (license_number) updateData.license_number = license_number
    if (status) updateData.status = status
    if (document_url !== undefined) updateData.document_url = document_url

    // Actualizar license
    const { data: license, error: updateError } = await adminClient
      .from('licenses')
      .update(updateData)
      .eq('id', licenseId)
      .select(`
        *,
        agent:agent_profiles!licenses_agent_id_fkey (
          id,
          first_name,
          last_name,
          business_name
        )
      `)
      .single()

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        return NextResponse.json({ error: 'License no encontrada' }, { status: 404 })
      }
      console.error('Error updating license:', updateError)
      return NextResponse.json({ error: 'Error al actualizar license' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'License actualizada exitosamente',
      license
    })
  } catch (error) {
    console.error('Error in PUT /api/licenses/[id]:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

/**
 * DELETE /api/licenses/[id]
 * Eliminar license
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const licenseId = params.id

    // Verificar autenticación
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Solo admin y super_admin pueden eliminar licenses
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
        error: 'No tienes permisos para eliminar licenses' 
      }, { status: 403 })
    }

    // Eliminar license
    const { error: deleteError } = await adminClient
      .from('licenses')
      .delete()
      .eq('id', licenseId)

    if (deleteError) {
      console.error('Error deleting license:', deleteError)
      return NextResponse.json({ error: 'Error al eliminar license' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'License eliminada exitosamente'
    })
  } catch (error) {
    console.error('Error in DELETE /api/licenses/[id]:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}


