import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/agents
 * Obtener lista de agentes con paginación y filtros
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar permisos (solo admin, super_admin pueden ver todos los agentes)
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
    const isAgent = userRole === 'agent'

    if (!isAdmin && !isAgent) {
      return NextResponse.json({ error: 'No tienes permisos para ver agentes' }, { status: 403 })
    }

    // Obtener parámetros de búsqueda
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('user_id') // Nuevo: filtrar por user_id
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '25')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const offset = (page - 1) * pageSize

    // Construir query
    let query = adminClient
      .from('agent_profiles')
      .select(`
        *,
        user:users!agent_profiles_user_id_fkey (
          id,
          email,
          created_at
        )
      `, { count: 'exact' })

    // Si se proporciona user_id, filtrar por ese user_id (para obtener perfil específico)
    if (userId) {
      query = query.eq('user_id', userId)
    } else if (isAgent) {
      // Si es agente y no hay user_id, solo puede ver su propio perfil
      query = query.eq('user_id', user.id)
    }

    // Aplicar filtros
    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,unique_link_code.ilike.%${search}%`)
    }

    if (status) {
      query = query.eq('status', status)
    }

    // Ordenar por fecha de creación (más recientes primero)
    query = query.order('created_at', { ascending: false })

    // Aplicar paginación (solo si no se está filtrando por user_id)
    if (!userId) {
      query = query.range(offset, offset + pageSize - 1)
    }

    const { data: agents, error, count } = await query

    if (error) {
      console.error('Error fetching agents:', error)
      return NextResponse.json({ error: 'Error al obtener agentes' }, { status: 500 })
    }

    // Si se filtró por user_id, devolver formato { data } para compatibilidad con useAgentProfile
    if (userId) {
      return NextResponse.json({
        data: agents || []
      })
    }

    // Formato normal para listado
    return NextResponse.json({
      agents,
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize)
      }
    })
  } catch (error) {
    console.error('Error in GET /api/agents:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

/**
 * POST /api/agents
 * Crear un nuevo agente
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar permisos (solo admin y super_admin pueden crear agentes)
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
        error: 'No tienes permisos para crear agentes' 
      }, { status: 403 })
    }

    // Obtener datos del body
    const body = await request.json()
    const {
      email,
      first_name,
      last_name,
      phone,
      unique_link_code,
      npn,
      epicare_number,
      business_name,
      is_default
    } = body

    // Validaciones
    if (!email || !first_name || !last_name) {
      return NextResponse.json({ 
        error: 'Email, nombre y apellido son requeridos' 
      }, { status: 400 })
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
    }

    // Validar unique_link_code si se proporciona
    if (unique_link_code) {
      // Solo letras, números y guiones
      const codeRegex = /^[a-z0-9-]{3,50}$/
      if (!codeRegex.test(unique_link_code)) {
        return NextResponse.json({ 
          error: 'El código del link debe tener entre 3-50 caracteres (solo letras minúsculas, números y guiones)' 
        }, { status: 400 })
      }

      // Verificar que no exista
      const { data: existing } = await adminClient
        .from('agent_profiles')
        .select('id')
        .eq('unique_link_code', unique_link_code)
        .single()

      if (existing) {
        return NextResponse.json({ 
          error: 'El código de link ya está en uso' 
        }, { status: 400 })
      }
    }

    // 1. Crear usuario en Supabase Auth
    const { data: authUser, error: createAuthError } = await adminClient.auth.admin.createUser({
      email,
      email_confirm: false, // Enviar email de invitación
      user_metadata: {
        first_name,
        last_name,
        phone: phone || null
      }
    })

    if (createAuthError || !authUser.user) {
      console.error('Error creating auth user:', createAuthError)
      return NextResponse.json({ 
        error: createAuthError?.message || 'Error al crear usuario de autenticación' 
      }, { status: 500 })
    }

    // 2. Crear registro en tabla users
    const { error: userInsertError } = await adminClient
      .from('users')
      .insert({
        id: authUser.user.id,
        email,
        first_name,
        last_name,
        phone: phone || null,
        role: 'agent',
        created_by: user.id,
        created_via: 'admin_dashboard'
      })

    if (userInsertError) {
      console.error('Error inserting user:', userInsertError)
      // Rollback: eliminar usuario de auth
      await adminClient.auth.admin.deleteUser(authUser.user.id)
      return NextResponse.json({ 
        error: 'Error al crear usuario en la base de datos' 
      }, { status: 500 })
    }

    // 3. Crear agent_profile (el trigger auto_create_agent_profile lo crea automáticamente,
    // pero necesitamos actualizarlo con los campos adicionales)
    
    // Esperar un momento para que el trigger se ejecute
    await new Promise(resolve => setTimeout(resolve, 500))

    // Actualizar agent_profile con campos adicionales
    const { data: agentProfile, error: profileUpdateError } = await adminClient
      .from('agent_profiles')
      .update({
        first_name,
        last_name,
        email,
        phone: phone || null,
        unique_link_code: unique_link_code || null,
        npn: npn || null,
        epicare_number: epicare_number || null,
        business_name: business_name || null,
        is_default: is_default || false,
        status: 'active',
        join_date: new Date().toISOString().split('T')[0]
      })
      .eq('user_id', authUser.user.id)
      .select()
      .single()

    if (profileUpdateError) {
      console.error('Error updating agent profile:', profileUpdateError)
      // No hacer rollback completo, el perfil básico ya existe
    }

    // 4. Enviar email de invitación
    const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email)

    if (inviteError) {
      console.warn('Error sending invite email:', inviteError)
      // No es crítico, el usuario fue creado
    }

    return NextResponse.json({
      success: true,
      message: 'Agente creado exitosamente',
      agent: agentProfile || { user_id: authUser.user.id }
    })
  } catch (error) {
    console.error('Error in POST /api/agents:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

