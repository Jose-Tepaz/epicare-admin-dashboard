import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/appointments
 * Obtener lista de appointments con filtros
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
        error: 'No tienes permisos para ver appointments' 
      }, { status: 403 })
    }

    // Obtener parámetros
    const searchParams = request.nextUrl.searchParams
    const agentId = searchParams.get('agent_id')
    const companyId = searchParams.get('company_id')
    const status = searchParams.get('status')

    // Construir query
    let query = adminClient
      .from('appointments')
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
      .order('created_at', { ascending: false })

    // Aplicar filtros
    if (agentId) {
      query = query.eq('agent_profile_id', agentId)
    }

    if (companyId) {
      query = query.eq('company_id', companyId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data: appointments, error } = await query

    if (error) {
      console.error('Error fetching appointments:', error)
      return NextResponse.json({ error: 'Error al obtener appointments' }, { status: 500 })
    }

    return NextResponse.json({ appointments })
  } catch (error) {
    console.error('Error in GET /api/appointments:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

/**
 * POST /api/appointments
 * Crear nuevo appointment
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Solo admin y super_admin pueden crear appointments
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
        error: 'No tienes permisos para crear appointments' 
      }, { status: 403 })
    }

    // Obtener datos del body
    const body = await request.json()
    const {
      agent_profile_id,
      company_id,
      agent_code,
      agent_number,
      start_date,
      expiration_date,
      commission_percentage,
      additional_data
    } = body

    // Validaciones
    if (!agent_profile_id || !company_id || !agent_code || !agent_number) {
      return NextResponse.json({ 
        error: 'agent_profile_id, company_id, agent_code y agent_number son requeridos' 
      }, { status: 400 })
    }

    // Verificar que no exista ya un appointment para este agente y compañía
    const { data: existing } = await adminClient
      .from('appointments')
      .select('id')
      .eq('agent_profile_id', agent_profile_id)
      .eq('company_id', company_id)
      .single()

    if (existing) {
      return NextResponse.json({ 
        error: 'Este agente ya tiene un appointment con esta aseguradora' 
      }, { status: 400 })
    }

    // Crear appointment
    const { data: appointment, error: insertError } = await adminClient
      .from('appointments')
      .insert({
        agent_profile_id,
        company_id,
        agent_code,
        agent_number,
        start_date: start_date || null,
        expiration_date: expiration_date || null,
        commission_percentage: commission_percentage || null,
        additional_data: additional_data || null,
        status: 'active',
        is_active: true
      })
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

    if (insertError) {
      console.error('Error creating appointment:', insertError)
      return NextResponse.json({ error: 'Error al crear appointment' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Appointment creado exitosamente',
      appointment
    })
  } catch (error) {
    console.error('Error in POST /api/appointments:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}


