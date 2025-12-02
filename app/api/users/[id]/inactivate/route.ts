import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/utils/permissions'
import { logUserInactivation } from '@/lib/utils/audit-log'

/**
 * POST /api/users/[id]/inactivate
 * Inactiva un usuario (soft delete)
 * Solo accesible por admin y super_admin
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
        { error: 'No tienes permisos para inactivar usuarios' },
        { status: 403 }
      )
    }

    // Obtener razón de inactivación del body
    const body = await request.json()
    const { reason } = body

    // Obtener información del usuario a inactivar
    const { data: targetUser, error: getUserError } = await supabase
      .from('users')
      .select('id, role, email, first_name, last_name, is_active')
      .eq('id', params.id)
      .single()

    if (getUserError || !targetUser) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    // No se puede inactivar a sí mismo
    if (targetUser.id === currentUser.id) {
      return NextResponse.json(
        { error: 'No puedes inactivarte a ti mismo' },
        { status: 400 }
      )
    }

    // Admin no puede inactivar super_admin
    const { data: currentUserData } = await supabase
      .from('users')
      .select('role')
      .eq('id', currentUser.id)
      .single()

    if (currentUserData?.role === 'admin' && targetUser.role === 'super_admin') {
      return NextResponse.json(
        { error: 'Admin no puede inactivar a Super Admin' },
        { status: 403 }
      )
    }

    // Ya está inactivo
    if (!targetUser.is_active) {
      return NextResponse.json(
        { error: 'El usuario ya está inactivo' },
        { status: 400 }
      )
    }

    // Inactivar usuario
    const { error: updateError } = await supabase
      .from('users')
      .update({
        is_active: false,
        inactivated_by: currentUser.id,
        inactivated_at: new Date().toISOString(),
        inactivation_reason: reason || 'No reason provided',
      })
      .eq('id', params.id)

    if (updateError) {
      console.error('Error inactivating user:', updateError)
      return NextResponse.json(
        { error: 'Error al inactivar usuario' },
        { status: 500 }
      )
    }

    // Log de auditoría
    await logUserInactivation(currentUser.id, params.id, reason)

    return NextResponse.json({
      success: true,
      message: `Usuario ${targetUser.email} inactivado correctamente`,
      cascadeNote: targetUser.role === 'agent' 
        ? 'El support staff asociado también fue inactivado' 
        : null
    })

  } catch (error) {
    console.error('Error in inactivate user API:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

