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

    // Usar adminClient para verificar el rol (bypasea RLS para evitar problemas)
    const adminClient = createAdminClient()
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('role, active_role')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      console.error('Error verificando rol:', userError)
      return NextResponse.json({ error: 'Error al verificar permisos' }, { status: 500 })
    }

    // Usar active_role si existe (para role switching), sino usar role
    const userRole = userData.active_role || userData.role || ''
    const isSuperAdmin = userRole === 'super_admin'
    const isAdmin = userRole === 'admin'
    const isAgent = userRole === 'agent'
    
    // Permitir a super_admin, admin y agent crear usuarios
    if (!isSuperAdmin && !isAdmin && !isAgent) {
      return NextResponse.json({ 
        error: 'No tienes permisos para crear usuarios',
        details: `Tu rol actual es: ${userRole}. Se requiere admin, super_admin o agent.`
      }, { status: 403 })
    }

    // Obtener datos del body
    const body = await request.json()
    const { email, first_name, last_name, phone, address, state, city, zipcode, role: targetRole, agent_profile_id, unique_link_code, npn, epicare_number } = body

    if (!email) {
      return NextResponse.json({ error: 'El email es requerido' }, { status: 400 })
    }
// ... [existing validation code] ...



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

    // adminClient ya está creado arriba para verificar permisos

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
    // Usar solo la URL base del callback (sin query params)
    let redirectTo: string
    if (targetRole === 'client') {
      // Clientes van al dashboard de usuario
      let userDashboardUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL || 'http://localhost:3001'
      userDashboardUrl = userDashboardUrl.replace(/\/$/, '') // Eliminar trailing slash
      redirectTo = `${userDashboardUrl}/auth/callback`
    } else {
      // Otros roles van al dashboard de administración
      let adminDashboardUrl = process.env.NEXT_PUBLIC_ADMIN_DASHBOARD_URL || request.headers.get('origin') || 'http://localhost:3002'
      adminDashboardUrl = adminDashboardUrl.replace(/\/$/, '') // Eliminar trailing slash
      redirectTo = `${adminDashboardUrl}/auth/callback`
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

    // 🎯 Obtener agent_profile_id si el creador es agent
    let creatorAgentProfileId = null
    
    if (isAgent) {
      const { data: agentProfile, error: agentError } = await adminClient
        .from('agent_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()
      
      if (agentError || !agentProfile) {
        console.error('Error obteniendo agent_profile_id del creador:', agentError)
        return NextResponse.json({ 
          error: 'No se pudo obtener tu perfil de agente. Contacta al administrador.' 
        }, { status: 400 })
      }
      
      creatorAgentProfileId = agentProfile.id
      console.log(`👤 Agente creando usuario. Agent profile ID: ${creatorAgentProfileId}`)
    }

    // 🎯 Determinar scope para support_staff
    let scope = 'global'

    if (targetRole === 'support_staff') {
      if (isAgent) {
        // Si el creador es agent → scope = 'agent_specific'
        // El support_staff usará agent_profile_id para vincularse (igual que los clientes)
        scope = 'agent_specific'
        console.log(`🎯 Support staff creado por agent → scope: agent_specific`)
      } else {
        // Admin o super_admin → scope global
        scope = 'global'
        console.log('🌍 Support staff creado por admin/super_admin → scope: global')
      }
    }

    // Crear o actualizar registro en public.users usando upsert
    // IMPORTANTE: Asignar el rol directamente en users.role
    // NOTA: agent_profile_id se asigna a clientes Y support_staff para vincularlos al agente
    const newUserData: any = {
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
      scope, // ✅ Scope según creador (global o agent_specific)
      created_by: user.id, // Para tracking y jerarquía
      created_via: 'admin_dashboard',
    }

    // Asignar agent_profile_id si es un CLIENTE o SUPPORT_STAFF
    if (targetRole === 'client' || targetRole === 'support_staff') {
      if (isAgent && creatorAgentProfileId) {
        // Si el creador es agent, asignar automáticamente su agent_profile_id
        newUserData.agent_profile_id = creatorAgentProfileId
        const userType = targetRole === 'client' ? 'Cliente' : 'Support Staff'
        console.log(`✅ ${userType} asignado automáticamente a agente: ${creatorAgentProfileId}`)
      } else if (agent_profile_id && targetRole === 'client') {
        // Si admin/super_admin seleccionó manualmente un agente (solo para clientes)
        newUserData.agent_profile_id = agent_profile_id
        console.log(`✅ Cliente asignado manualmente a agente: ${agent_profile_id}`)
      }
      // Si es cliente y no se asignó, el trigger assign_default_agent se encargará
    }

    // Usar upsert porque inviteUserByEmail puede crear el usuario automáticamente
    // El trigger está configurado para ejecutarse en INSERT y UPDATE
    const { error: profileError } = await adminClient
      .from('users')
      .upsert(newUserData, {
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

    // Si el rol es 'agent', crear o actualizar el agent_profile
    if (targetRole === 'agent') {
      // Verificar si ya existe un agent_profile (puede ser creado por un trigger)
      const { data: existingAgentProfile } = await adminClient
        .from('agent_profiles')
        .select('id, unique_link_code')
        .eq('user_id', authUser.user.id)
        .single()

      const agentProfileData: any = {
        user_id: authUser.user.id,
        business_name: `${first_name} ${last_name}`, // Por defecto usar nombre completo
        email: email,
        first_name: first_name || null,
        last_name: last_name || null,
        phone: phone || null,
        status: 'active',
        is_default: false, // No es el agente por defecto
      }

      // Si se proporciona unique_link_code, usarlo
      if (unique_link_code && unique_link_code.trim()) {
        agentProfileData.unique_link_code = unique_link_code.trim()
      }

      if (npn && npn.trim()) {
        agentProfileData.npn = npn.trim()
      }

      if (epicare_number && epicare_number.trim()) {
        agentProfileData.epicare_number = epicare_number.trim()
      }

      // Si no, el trigger generate_unique_link_code() se encargará de generarlo

      let agentProfileError = null

      if (existingAgentProfile) {
        // Si ya existe, actualizar (upsert)
        const { error } = await adminClient
          .from('agent_profiles')
          .update(agentProfileData)
          .eq('user_id', authUser.user.id)
        agentProfileError = error
        console.log(`✅ Agent profile actualizado para usuario: ${authUser.user.id}`)
      } else {
        // Si no existe, crear
        const { error } = await adminClient
          .from('agent_profiles')
          .insert(agentProfileData)
        agentProfileError = error
        console.log(`✅ Agent profile creado para usuario: ${authUser.user.id}`)
      }

      if (agentProfileError) {
        // Si falla la creación/actualización del agent_profile, eliminar el usuario creado
        await adminClient.auth.admin.deleteUser(authUser.user.id)
        await adminClient.from('users').delete().eq('id', authUser.user.id)
        console.error('Error creating/updating agent profile:', agentProfileError)
        return NextResponse.json({ 
          error: 'Error al crear el perfil del agente',
          details: agentProfileError.message 
        }, { status: 500 })
      }
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
