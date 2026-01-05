import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/licenses
 * Obtener lista de licenses con filtros
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar permisos
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
    const canView = ['admin', 'super_admin', 'agent'].includes(userRole)

    if (!canView) {
      return NextResponse.json({ 
        error: 'No tienes permisos para ver licenses' 
      }, { status: 403 })
    }

    // Obtener parámetros
    const searchParams = request.nextUrl.searchParams
    const agentId = searchParams.get('agent_id')
    const state = searchParams.get('state')
    const status = searchParams.get('status')

    // Construir query
    let query = adminClient
      .from('licenses')
      .select(`
        *,
        agent:agent_profiles!licenses_agent_id_fkey (
          id,
          first_name,
          last_name,
          business_name
        )
      `)
      .order('state', { ascending: true })

    // Aplicar filtros
    if (agentId) {
      query = query.eq('agent_id', agentId)
    }

    if (state) {
      query = query.eq('state', state.toUpperCase())
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data: licenses, error } = await query

    if (error) {
      console.error('Error fetching licenses:', error)
      return NextResponse.json({ error: 'Error al obtener licenses' }, { status: 500 })
    }

    return NextResponse.json({ licenses })
  } catch (error) {
    console.error('Error in GET /api/licenses:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

/**
 * POST /api/licenses
 * Crear nueva license
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Solo admin y super_admin pueden crear licenses
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
        error: 'No tienes permisos para crear licenses' 
      }, { status: 403 })
    }

    // Obtener datos del body
    const body = await request.json()
    const {
      agent_id,
      license_number,
      state,
      status,
      document_url
    } = body

    // Validaciones
    if (!agent_id || !license_number || !state) {
      return NextResponse.json({ 
        error: 'agent_id, license_number y state son requeridos' 
      }, { status: 400 })
    }

    // Validar formato de estado (2 letras mayúsculas)
    const stateUpper = state.toUpperCase()
    if (!/^[A-Z]{2}$/.test(stateUpper)) {
      return NextResponse.json({ 
        error: 'State debe ser un código de 2 letras (ej: FL, NY, CA)' 
      }, { status: 400 })
    }

    // Verificar que no exista ya una license para este agente y estado
    const { data: existing } = await adminClient
      .from('licenses')
      .select('id')
      .eq('agent_id', agent_id)
      .eq('state', stateUpper)
      .single()

    if (existing) {
      return NextResponse.json({ 
        error: `Este agente ya tiene una licencia para el estado ${stateUpper}` 
      }, { status: 400 })
    }

    // Crear license
    const { data: license, error: insertError } = await adminClient
      .from('licenses')
      .insert({
        agent_id,
        license_number,
        state: stateUpper,
        status: status || 'active',
        document_url: document_url || null
      })
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

    if (insertError) {
      console.error('Error creating license:', insertError)
      return NextResponse.json({ error: 'Error al crear license' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'License creada exitosamente',
      license
    })
  } catch (error) {
    console.error('Error in POST /api/licenses:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}


