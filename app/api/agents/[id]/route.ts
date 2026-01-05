import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/agents/[id]
 * Obtener detalles completos de un agente
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const agentId = params.id

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

    // Obtener agent_profile
    let query = adminClient
      .from('agent_profiles')
      .select(`
        *,
        user:users!agent_profiles_user_id_fkey (
          id,
          email,
          created_at
        )
      `)
      .eq('id', agentId)

    // Si es agente, verificar que sea su propio perfil
    if (isAgent) {
      query = query.eq('user_id', user.id)
    }

    const { data: agent, error } = await query.single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Agente no encontrado' }, { status: 404 })
      }
      console.error('Error fetching agent:', error)
      return NextResponse.json({ error: 'Error al obtener agente' }, { status: 500 })
    }

    // Obtener appointments del agente
    const { data: appointments } = await adminClient
      .from('appointments')
      .select(`
        *,
        company:insurance_companies!appointments_company_id_fkey (
          id,
          name,
          logo_url
        )
      `)
      .eq('agent_profile_id', agentId)
      .order('created_at', { ascending: false })

    // Obtener licenses del agente
    const { data: licenses } = await adminClient
      .from('licenses')
      .select('*')
      .eq('agent_id', agentId)
      .order('state', { ascending: true })

    // Obtener clientes asignados (desde agent_clients)
    const { data: clientRelations, count: clientsCount } = await adminClient
      .from('agent_clients')
      .select(`
        *,
        client:users!agent_clients_client_id_fkey (
          id,
          email,
          first_name,
          last_name,
          phone,
          created_at
        )
      `, { count: 'exact' })
      .eq('agent_id', agentId)
      .order('assigned_at', { ascending: false })
      .limit(10) // Solo los 10 más recientes para el detalle

    // Obtener applications vendidas por este agente
    const { count: applicationsCount } = await adminClient
      .from('applications')
      .select('id', { count: 'exact', head: true })
      .eq('assigned_agent_id', agentId)

    return NextResponse.json({
      agent,
      appointments: appointments || [],
      licenses: licenses || [],
      clients: clientRelations || [],
      stats: {
        total_clients: clientsCount || 0,
        total_applications: applicationsCount || 0,
        total_appointments: appointments?.length || 0,
        total_licenses: licenses?.length || 0
      }
    })
  } catch (error) {
    console.error('Error in GET /api/agents/[id]:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

/**
 * PUT /api/agents/[id]
 * Actualizar información de un agente
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const agentId = params.id

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

    // Verificar que el agente existe
    const { data: existingAgent, error: fetchError } = await adminClient
      .from('agent_profiles')
      .select('user_id')
      .eq('id', agentId)
      .single()

    if (fetchError || !existingAgent) {
      return NextResponse.json({ error: 'Agente no encontrado' }, { status: 404 })
    }

    // Si es agente, solo puede editar su propio perfil
    if (isAgent && existingAgent.user_id !== user.id) {
      return NextResponse.json({ 
        error: 'No tienes permisos para editar este agente' 
      }, { status: 403 })
    }

    // Obtener datos del body
    const body = await request.json()
    const {
      first_name,
      last_name,
      phone,
      email,
      unique_link_code,
      npm,
      epicare_number,
      business_name,
      photo_url,
      status,
      is_default
    } = body

    // Los agentes solo pueden editar ciertos campos
    const updateData: any = {}

    if (first_name) updateData.first_name = first_name
    if (last_name) updateData.last_name = last_name
    if (phone !== undefined) updateData.phone = phone
    if (email) updateData.email = email
    if (photo_url !== undefined) updateData.photo_url = photo_url
    
    // Solo admin puede cambiar estos campos
    if (isAdmin) {
      if (unique_link_code !== undefined) updateData.unique_link_code = unique_link_code
      if (npm !== undefined) updateData.npm = npm
      if (epicare_number !== undefined) updateData.epicare_number = epicare_number
      if (business_name !== undefined) updateData.business_name = business_name
      if (status) updateData.status = status
      if (is_default !== undefined) updateData.is_default = is_default
    }

    // Validar unique_link_code si se está actualizando
    if (updateData.unique_link_code) {
      const codeRegex = /^[a-z0-9-]{3,50}$/
      if (!codeRegex.test(updateData.unique_link_code)) {
        return NextResponse.json({ 
          error: 'El código del link debe tener entre 3-50 caracteres (solo letras minúsculas, números y guiones)' 
        }, { status: 400 })
      }

      // Verificar que no exista en otro agente
      const { data: existing } = await adminClient
        .from('agent_profiles')
        .select('id')
        .eq('unique_link_code', updateData.unique_link_code)
        .neq('id', agentId)
        .single()

      if (existing) {
        return NextResponse.json({ 
          error: 'El código de link ya está en uso' 
        }, { status: 400 })
      }
    }

    // Si se marca como default, desmarcar otros
    if (isAdmin && updateData.is_default === true) {
      await adminClient
        .from('agent_profiles')
        .update({ is_default: false })
        .neq('id', agentId)
    }

    // Actualizar agent_profile
    const { data: updatedAgent, error: updateError } = await adminClient
      .from('agent_profiles')
      .update(updateData)
      .eq('id', agentId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating agent:', updateError)
      return NextResponse.json({ error: 'Error al actualizar agente' }, { status: 500 })
    }

    // Si se actualizaron datos básicos, también actualizar tabla users
    if (first_name || last_name || phone) {
      const userUpdateData: any = {}
      if (first_name) userUpdateData.first_name = first_name
      if (last_name) userUpdateData.last_name = last_name
      if (phone !== undefined) userUpdateData.phone = phone

      await adminClient
        .from('users')
        .update(userUpdateData)
        .eq('id', existingAgent.user_id)
    }

    return NextResponse.json({
      success: true,
      message: 'Agente actualizado exitosamente',
      agent: updatedAgent
    })
  } catch (error) {
    console.error('Error in PUT /api/agents/[id]:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

/**
 * DELETE /api/agents/[id]
 * Desactivar un agente (soft delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const agentId = params.id

    // Verificar autenticación
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Solo admin y super_admin pueden desactivar agentes
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
        error: 'No tienes permisos para desactivar agentes' 
      }, { status: 403 })
    }

    // Verificar que el agente existe
    const { data: existingAgent, error: fetchError } = await adminClient
      .from('agent_profiles')
      .select('user_id, is_default')
      .eq('id', agentId)
      .single()

    if (fetchError || !existingAgent) {
      return NextResponse.json({ error: 'Agente no encontrado' }, { status: 404 })
    }

    // No permitir desactivar el agente por defecto
    if (existingAgent.is_default) {
      return NextResponse.json({ 
        error: 'No se puede desactivar el agente por defecto. Asigna otro agente como default primero.' 
      }, { status: 400 })
    }

    // Desactivar agente (soft delete)
    const { error: updateError } = await adminClient
      .from('agent_profiles')
      .update({ 
        status: 'inactive',
        is_active: false 
      })
      .eq('id', agentId)

    if (updateError) {
      console.error('Error deactivating agent:', updateError)
      return NextResponse.json({ error: 'Error al desactivar agente' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Agente desactivado exitosamente'
    })
  } catch (error) {
    console.error('Error in DELETE /api/agents/[id]:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

