import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar que el usuario esté autenticado
    const supabase = await createClient()
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Usar adminClient para verificar el rol (bypasea RLS)
    const adminClient = createAdminClient()
    const { data: currentUserData, error: userError } = await adminClient
      .from('users')
      .select('role, active_role')
      .eq('id', authUser.id)
      .single()

    if (userError || !currentUserData) {
      console.error('Error verificando rol:', userError)
      return NextResponse.json({ error: 'Error al verificar permisos' }, { status: 500 })
    }

    // Usar active_role si existe (para role switching), sino usar role
    const currentUserRole = currentUserData.active_role || currentUserData.role || ''
    
    // Solo super_admin puede agregar rol de agent a otros usuarios
    if (currentUserRole !== 'super_admin') {
      return NextResponse.json({ 
        error: 'Solo los super administradores pueden agregar el rol de agente a otros usuarios',
        details: `Tu rol actual es: ${currentUserRole}. Se requiere super_admin.`
      }, { status: 403 })
    }

    // Obtener datos del body
    const body = await request.json()
    const { roleId } = body

    if (!roleId) {
      return NextResponse.json({ error: 'El ID del rol es requerido' }, { status: 400 })
    }

    const { id: targetUserId } = await params

    // Obtener información del usuario objetivo
    const { data: targetUserData, error: targetUserError } = await adminClient
      .from('users')
      .select('id, email, first_name, last_name, phone, role, active_role')
      .eq('id', targetUserId)
      .single()

    if (targetUserError || !targetUserData) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const targetUserRole = targetUserData.active_role || targetUserData.role || ''

    // Solo se puede agregar rol de agent a usuarios con rol principal super_admin o admin
    if (targetUserRole !== 'super_admin' && targetUserRole !== 'admin') {
      return NextResponse.json({ 
        error: 'Solo se puede agregar el rol de agente a usuarios con rol super_admin o admin',
        details: `El rol del usuario objetivo es: ${targetUserRole}`
      }, { status: 400 })
    }

    // Obtener el nombre del rol desde la tabla roles
    const { data: roleData, error: roleError } = await adminClient
      .from('roles')
      .select('id, name')
      .eq('id', roleId)
      .single()

    if (roleError || !roleData) {
      return NextResponse.json({ error: 'Rol no encontrado' }, { status: 404 })
    }

    const roleName = roleData.name

    // Verificar que el rol sea 'agent'
    if (roleName !== 'agent') {
      return NextResponse.json({ 
        error: 'Solo se puede agregar el rol de agente mediante esta funcionalidad',
        details: `El rol seleccionado es: ${roleName}`
      }, { status: 400 })
    }

    // Verificar si el usuario ya tiene ese rol
    const { data: existingRole } = await adminClient
      .from('user_roles')
      .select('id')
      .eq('user_id', targetUserId)
      .eq('role_id', roleId)
      .single()

    if (existingRole) {
      return NextResponse.json({ 
        error: 'El usuario ya tiene este rol asignado' 
      }, { status: 400 })
    }

    // Insertar el rol en user_roles
    const { error: insertError } = await adminClient
      .from('user_roles')
      .insert({ 
        user_id: targetUserId, 
        role_id: roleId 
      })

    if (insertError) {
      console.error('Error insertando rol en user_roles:', insertError)
      return NextResponse.json({ 
        error: 'Error al asignar el rol',
        details: insertError.message 
      }, { status: 500 })
    }

    // Si el rol es 'agent', crear agent_profile si no existe
    if (roleName === 'agent') {
      // Verificar si ya existe un agent_profile para este usuario
      const { data: existingProfile } = await adminClient
        .from('agent_profiles')
        .select('id')
        .eq('user_id', targetUserId)
        .single()

      if (!existingProfile) {
        // Crear agent_profile con los datos del usuario
        const businessName = targetUserData.first_name && targetUserData.last_name
          ? `${targetUserData.first_name} ${targetUserData.last_name}`
          : targetUserData.email.split('@')[0] || 'Agente'

        const { error: profileError } = await adminClient
          .from('agent_profiles')
          .insert({
            user_id: targetUserId,
            business_name: businessName,
            email: targetUserData.email,
            phone: targetUserData.phone || null,
            is_active: true,
            is_default: false
          })

        if (profileError) {
          console.error('Error creando agent_profile:', profileError)
          // No fallar la operación completa si falla la creación del profile
          // El usuario ya tiene el rol asignado, solo falta el profile
          return NextResponse.json({ 
            success: true,
            message: 'Rol de agente asignado correctamente, pero hubo un error al crear el perfil de agente',
            warning: 'El perfil de agente debe crearse manualmente',
            details: profileError.message
          }, { status: 200 })
        }
      }
    }

    return NextResponse.json({ 
      success: true,
      message: `Rol de agente asignado correctamente a ${targetUserData.email}`,
      user: {
        id: targetUserData.id,
        email: targetUserData.email,
        role: targetUserRole
      }
    }, { status: 200 })

  } catch (error) {
    console.error('Error in assign role API:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}


