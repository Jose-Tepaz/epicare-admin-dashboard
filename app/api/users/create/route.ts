import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // Verificar que el usuario esté autenticado y sea admin
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar que el usuario tenga rol admin (usando users.role directamente)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError) {
      return NextResponse.json({ error: 'Error al verificar permisos' }, { status: 500 })
    }

    const userRole = userData?.role || ''
    const isSuperAdmin = userRole === 'super_admin'
    const isAdmin = userRole === 'admin'
    
    if (!isSuperAdmin && !isAdmin) {
      return NextResponse.json({ error: 'No tienes permisos para crear usuarios' }, { status: 403 })
    }

    // Obtener datos del body
    const body = await request.json()
    const { email, first_name, last_name, phone, address, state, city, zipcode, role: targetRole } = body

    if (!email) {
      return NextResponse.json({ error: 'El email es requerido' }, { status: 400 })
    }

    if (!first_name || !last_name) {
      return NextResponse.json({ error: 'El nombre y apellido son requeridos' }, { status: 400 })
    }

    if (!targetRole) {
      return NextResponse.json({ error: 'El rol es requerido' }, { status: 400 })
    }

    // Validar que el rol sea válido
    const validRoles = ['super_admin', 'admin', 'agent', 'support_staff', 'client']
    if (!validRoles.includes(targetRole)) {
      return NextResponse.json({ error: 'Rol inválido' }, { status: 400 })
    }

    // Crear usuario en auth.users usando el cliente admin con invitación por correo
    const adminClient = createAdminClient()

    // Solo super_admin puede asignar roles admin o super_admin
    if ((targetRole === 'admin' || targetRole === 'super_admin') && !isSuperAdmin) {
      return NextResponse.json({ 
        error: 'Solo los super administradores pueden crear usuarios con rol admin o super_admin' 
      }, { status: 403 })
    }

    // Validar jerarquía de creación
    // super_admin: puede crear cualquiera
    // admin: puede crear admin, agent, support_staff, client (NO super_admin)
    // agent: puede crear support_staff, client
    if (userRole === 'admin' && targetRole === 'super_admin') {
      return NextResponse.json({ 
        error: 'Admin no puede crear super_admin' 
      }, { status: 403 })
    }
    if (userRole === 'agent' && !['support_staff', 'client'].includes(targetRole)) {
      return NextResponse.json({ 
        error: 'Agent solo puede crear support_staff y client' 
      }, { status: 403 })
    }

    // Determinar la URL de redirección basada en el rol
    // Redirigir DIRECTAMENTE a set-password (sin pasar por /auth/callback)
    // Esto preserva el hash fragment con los tokens
    let redirectTo: string
    if (targetRole === 'client') {
      // Clientes van al dashboard de usuario
      const userDashboardUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL || 'http://localhost:3001'
      redirectTo = `${userDashboardUrl}/set-password`
    } else {
      // Otros roles van al dashboard de administración
      const adminDashboardUrl = process.env.NEXT_PUBLIC_ADMIN_DASHBOARD_URL || request.headers.get('origin') || 'http://localhost:3002'
      redirectTo = `${adminDashboardUrl}/admin/set-password`
    }

    console.log('📧 Invitando usuario con redirectTo:', redirectTo)
    console.log('📧 Rol del usuario:', targetRole)

    // Invitar usuario por correo - esto crea el usuario y envía el correo automáticamente
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      email,
      {
        redirectTo,
        data: {
          first_name,
          last_name,
          role: targetRole, // Guardar el rol en metadata para referencia
        }
      }
    )

    if (inviteError) {
      console.error('Error inviting user:', inviteError)
      return NextResponse.json({ error: inviteError.message }, { status: 400 })
    }

    if (!inviteData.user) {
      return NextResponse.json({ error: 'Error al crear usuario' }, { status: 500 })
    }

    const authUser = { user: inviteData.user }

    // Verificar si el perfil ya existe (puede ser creado automáticamente por un trigger)
    const { data: existingProfile } = await adminClient
      .from('users')
      .select('id')
      .eq('id', authUser.user.id)
      .single()

    // 🎯 RN-002: Determinar scope y assigned_to_agent_id para support_staff
    let scope = 'global'
    let assignedToAgentId = null

    if (targetRole === 'support_staff') {
      // Si el creador es agent → scope = 'agent_specific' y asignar a ese agent
      if (userRole === 'agent') {
        scope = 'agent_specific'
        
        // Buscar el agent_id del usuario creador
        const { data: agentData, error: agentError } = await adminClient
          .from('agents')
          .select('id')
          .eq('user_id', user.id)
          .single()
        
        if (agentError || !agentData) {
          console.error('Error obteniendo agent_id del creador:', agentError)
          return NextResponse.json({ 
            error: 'No se pudo obtener el agent_id. Asegúrate de que el usuario agent tenga un registro en la tabla agents.' 
          }, { status: 400 })
        }
        
        assignedToAgentId = agentData.id
        console.log(`🎯 Support staff creado por agent → scope: agent_specific, assigned_to_agent_id: ${assignedToAgentId}`)
      } else {
        // Admin o super_admin → scope global
        console.log('🌍 Support staff creado por admin/super_admin → scope: global')
      }
    }

    // Crear o actualizar registro en public.users usando upsert
    // IMPORTANTE: Asignar el rol directamente en users.role
    const { error: profileError } = await adminClient
      .from('users')
      .upsert({
        id: authUser.user.id,
        email,
        first_name: first_name || null,
        last_name: last_name || null,
        phone: phone || null,
        address: address || null,
        state: state || null,
        city: city || null,
        zip_code: zipcode || null,
        role: targetRole, // ✅ Asignar rol directamente según USER-ROLE.MD
        scope, // ✅ RN-002: Scope según creador
        assigned_to_agent_id: assignedToAgentId, // ✅ RN-002: Agent ID si scope es agent_specific
        created_by: user.id, // Para tracking y jerarquía
        created_via: 'admin_dashboard',
      }, {
        onConflict: 'id'
      })

    if (profileError) {
      // Si falla la creación/actualización del perfil, intentar eliminar el usuario de auth
      await adminClient.auth.admin.deleteUser(authUser.user.id)
      console.error('Error creating user profile:', profileError)
      return NextResponse.json({ 
        error: 'Error al crear el perfil del usuario',
        details: profileError.message 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      user: {
        id: authUser.user.id,
        email: authUser.user.email,
        first_name,
        last_name,
        phone,
        address,
        state,
        city,
        zipcode,
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Error in create user API:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
