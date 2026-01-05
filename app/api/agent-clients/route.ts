import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/agent-clients
 * Obtener relaciones agente-cliente con filtros
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 GET /api/agent-clients called')
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
    const isAdmin = ['admin', 'super_admin'].includes(userRole)
    const isAgent = userRole === 'agent'

    if (!isAdmin && !isAgent) {
      return NextResponse.json({ 
        error: 'No tienes permisos para ver relaciones agente-cliente' 
      }, { status: 403 })
    }

    // Obtener parámetros
    const searchParams = request.nextUrl.searchParams
    const agentId = searchParams.get('agent_id')
    const agentProfileId = searchParams.get('agent_profile_id') // También aceptar agent_profile_id
    const clientId = searchParams.get('client_id')

    // Determinar el agent_id a usar
    let targetAgentId = agentId || agentProfileId

    // Si es agente, solo ver sus propias relaciones
    if (isAgent) {
      // Obtener agent_profile_id del usuario
      const { data: agentProfile } = await adminClient
        .from('agent_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (agentProfile) {
        targetAgentId = agentProfile.id
      } else {
        // Agente sin perfil, no puede ver nada
        return NextResponse.json({ data: [] })
      }
    }

    if (!targetAgentId) {
      return NextResponse.json({ error: 'agent_id o agent_profile_id es requerido' }, { status: 400 })
    }

    // Construir query para obtener TODOS los clientes de agent_clients para este agente
    // Esto incluye tanto clientes principales como secundarios
    console.log('🔍 Querying agent_clients for agent_id:', targetAgentId)
    
    let query = adminClient
      .from('agent_clients')
      .select(`
        id,
        agent_id,
        client_id,
        assigned_at,
        assigned_by,
        source,
        created_at,
        agent:agent_profiles!agent_clients_agent_id_fkey (
          id,
          first_name,
          last_name,
          business_name,
          unique_link_code
        ),
        client:users!agent_clients_client_id_fkey (
          id,
          email,
          first_name,
          last_name,
          phone,
          created_at,
          agent_profile_id
        )
      `)
      .eq('agent_id', targetAgentId)

    // Aplicar filtro de client_id si está presente
    if (clientId) {
      query = query.eq('client_id', clientId)
    }

    // Ordenar por fecha de asignación (más recientes primero)
    query = query.order('assigned_at', { ascending: false })

    const { data: relations, error } = await query

    if (error) {
      console.error('❌ Error fetching agent_clients relations:', error)
      return NextResponse.json({ error: 'Error al obtener relaciones' }, { status: 500 })
    }

    console.log('✅ Debug agent-clients query:', {
      targetAgentId,
      relationsCount: relations?.length || 0,
      relations: relations?.map((r: any) => ({
        id: r.id,
        agent_id: r.agent_id,
        client_id: r.client_id,
        client_email: r.client?.email,
        client_agent_profile_id: r.client?.agent_profile_id,
        is_primary: r.client?.agent_profile_id === targetAgentId,
        source: r.source,
        assigned_at: r.assigned_at
      }))
    })

    // Agregar flag is_primary para identificar si es el agente principal
    const relationsWithPrimaryFlag = (relations || []).map((relation: any) => ({
      ...relation,
      is_primary: relation.client?.agent_profile_id === targetAgentId
    }))

    return NextResponse.json({ data: relationsWithPrimaryFlag })
  } catch (error) {
    console.error('Error in GET /api/agent-clients:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

/**
 * POST /api/agent-clients
 * Asignar cliente a un agente (relación multi-agente)
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Solo admin y super_admin pueden asignar clientes
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
        error: 'No tienes permisos para asignar clientes a agentes' 
      }, { status: 403 })
    }

    // Obtener datos del body
    const body = await request.json()
    const { agent_id, client_id } = body

    // Validaciones
    if (!agent_id || !client_id) {
      return NextResponse.json({ 
        error: 'agent_id y client_id son requeridos' 
      }, { status: 400 })
    }

    // Verificar que el agente existe
    const { data: agent, error: agentError } = await adminClient
      .from('agent_profiles')
      .select('id, status')
      .eq('id', agent_id)
      .single()

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Agente no encontrado' }, { status: 404 })
    }

    if (agent.status !== 'active') {
      return NextResponse.json({ 
        error: 'El agente no está activo' 
      }, { status: 400 })
    }

    // Verificar que el cliente existe y es realmente un cliente
    const { data: client, error: clientError } = await adminClient
      .from('users')
      .select('id, role')
      .eq('id', client_id)
      .single()

    if (clientError || !client) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    }

    if (client.role !== 'client') {
      return NextResponse.json({ 
        error: 'El usuario no es un cliente' 
      }, { status: 400 })
    }

    // Verificar si ya existe la relación
    const { data: existing } = await adminClient
      .from('agent_clients')
      .select('id')
      .eq('agent_id', agent_id)
      .eq('client_id', client_id)
      .single()

    if (existing) {
      return NextResponse.json({ 
        error: 'Este cliente ya está asignado a este agente' 
      }, { status: 400 })
    }

    // Crear relación
    const { data: relation, error: insertError } = await adminClient
      .from('agent_clients')
      .insert({
        agent_id,
        client_id,
        source: 'admin_reassignment',
        assigned_by: user.id
      })
      .select(`
        *,
        agent:agent_profiles!agent_clients_agent_id_fkey (
          id,
          first_name,
          last_name,
          business_name
        ),
        client:users!agent_clients_client_id_fkey (
          id,
          email,
          first_name,
          last_name,
          phone
        )
      `)
      .single()

    if (insertError) {
      console.error('Error creating agent-client relation:', insertError)
      return NextResponse.json({ error: 'Error al asignar cliente' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Cliente asignado exitosamente al agente',
      relation
    })
  } catch (error) {
    console.error('Error in POST /api/agent-clients:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

/**
 * DELETE /api/agent-clients
 * Desasignar cliente de un agente
 */
export async function DELETE(request: NextRequest) {
  try {
    // Verificar autenticación
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Solo admin y super_admin pueden desasignar clientes
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
        error: 'No tienes permisos para desasignar clientes' 
      }, { status: 403 })
    }

    // Obtener parámetros del body
    const body = await request.json()
    const { agent_id, client_id } = body

    if (!agent_id || !client_id) {
      return NextResponse.json({ 
        error: 'agent_id y client_id son requeridos' 
      }, { status: 400 })
    }

    // Verificar que el cliente tiene más de un agente
    const { count } = await adminClient
      .from('agent_clients')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', client_id)

    if (count === 1) {
      return NextResponse.json({ 
        error: 'No se puede desasignar. El cliente debe tener al menos un agente.' 
      }, { status: 400 })
    }

    // Verificar que no sea el agente principal (users.agent_profile_id)
    const { data: clientData } = await adminClient
      .from('users')
      .select('agent_profile_id')
      .eq('id', client_id)
      .single()

    if (clientData?.agent_profile_id === agent_id) {
      return NextResponse.json({ 
        error: 'No se puede desasignar el agente principal del cliente. Para cambiar el agente principal, asigna otro agente primero.' 
      }, { status: 400 })
    }

    // Eliminar relación
    const { error: deleteError } = await adminClient
      .from('agent_clients')
      .delete()
      .eq('agent_id', agent_id)
      .eq('client_id', client_id)

    if (deleteError) {
      console.error('Error deleting agent-client relation:', deleteError)
      return NextResponse.json({ error: 'Error al desasignar cliente' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Cliente desasignado exitosamente del agente'
    })
  } catch (error) {
    console.error('Error in DELETE /api/agent-clients:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}


