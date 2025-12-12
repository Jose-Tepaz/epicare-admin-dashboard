import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar que el usuario esté autenticado
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const requestId = params.id

    if (!requestId) {
      return NextResponse.json({ 
        error: 'ID de solicitud requerido' 
      }, { status: 400 })
    }

    // Obtener datos del body
    const body = await request.json()
    const { documentId } = body

    const adminClient = createAdminClient()

    // Obtener la solicitud actual
    const { data: currentRequest, error: fetchError } = await adminClient
      .from('document_requests')
      .select('*, client:users!document_requests_client_id_fkey(id, email, role)')
      .eq('id', requestId)
      .single()

    if (fetchError || !currentRequest) {
      return NextResponse.json({ 
        error: 'Solicitud no encontrada' 
      }, { status: 404 })
    }

    // Verificar permisos del usuario
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role, scope, assigned_to_agent_id')
      .eq('id', user.id)
      .single()

    if (userError) {
      return NextResponse.json({ error: 'Error al verificar permisos' }, { status: 500 })
    }

    const userRole = userData?.role || ''
    const isAdmin = ['super_admin', 'admin'].includes(userRole)
    const isAgent = userRole === 'agent'
    const isSupportStaff = userRole === 'support_staff'
    const isClient = userRole === 'client'

    // Verificar que el usuario tenga permisos para cumplir esta solicitud
    if (isClient) {
      // El cliente solo puede cumplir sus propias solicitudes
      if (currentRequest.client_id !== user.id) {
        return NextResponse.json({ 
          error: 'No tienes permisos para cumplir esta solicitud' 
        }, { status: 403 })
      }
    } else if (isAgent) {
      // El agente solo puede cumplir solicitudes de sus clientes
      const { data: agentData } = await adminClient
        .from('agents')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!agentData) {
        return NextResponse.json({ 
          error: 'No se encontró información del agente' 
        }, { status: 500 })
      }

      const { data: clientAgentCheck } = await adminClient
        .from('users')
        .select('agent_profile_id')
        .eq('id', currentRequest.client_id)
        .single()

      if (clientAgentCheck?.agent_profile_id !== agentData.id) {
        return NextResponse.json({ 
          error: 'No tienes permisos para cumplir esta solicitud' 
        }, { status: 403 })
      }
    } else if (isSupportStaff && userData.scope === 'agent_specific') {
      // Support staff con scope agent_specific solo puede cumplir solicitudes de su agent asignado
      const { data: clientAgentCheck } = await adminClient
        .from('users')
        .select('agent_profile_id')
        .eq('id', currentRequest.client_id)
        .single()

      if (clientAgentCheck?.agent_profile_id !== userData.assigned_to_agent_id) {
        return NextResponse.json({ 
          error: 'No tienes permisos para cumplir esta solicitud' 
        }, { status: 403 })
      }
    } else if (!isAdmin && !isSupportStaff) {
      return NextResponse.json({ 
        error: 'No tienes permisos para cumplir solicitudes de documentos' 
      }, { status: 403 })
    }

    // Verificar que la solicitud esté en estado pending
    if (currentRequest.status !== 'pending') {
      return NextResponse.json({ 
        error: `La solicitud ya está en estado: ${currentRequest.status}` 
      }, { status: 400 })
    }

    // Si se proporciona documentId, verificar que existe y pertenece al cliente correcto
    if (documentId) {
      const { data: documentData, error: docError } = await adminClient
        .from('documents')
        .select('id, client_id, document_type')
        .eq('id', documentId)
        .single()

      if (docError || !documentData) {
        return NextResponse.json({ 
          error: 'Documento no encontrado' 
        }, { status: 404 })
      }

      if (documentData.client_id !== currentRequest.client_id) {
        return NextResponse.json({ 
          error: 'El documento no pertenece al cliente de esta solicitud' 
        }, { status: 400 })
      }

      // Verificar que el tipo de documento coincida
      if (documentData.document_type !== currentRequest.document_type) {
        console.warn(
          `⚠️ Document type mismatch: request expects ${currentRequest.document_type}, ` +
          `but document is ${documentData.document_type}`
        )
      }
    }

    // Actualizar la solicitud a fulfilled
    const { data: updatedRequest, error: updateError } = await adminClient
      .from('document_requests')
      .update({
        status: 'fulfilled',
        fulfilled_at: new Date().toISOString(),
        fulfilled_by: user.id,
        document_id: documentId || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .select(`
        *,
        client:users!document_requests_client_id_fkey(id, email, first_name, last_name),
        requester:users!document_requests_requested_by_fkey(id, email, first_name, last_name, role),
        fulfiller:users!document_requests_fulfilled_by_fkey(id, email, first_name, last_name),
        document:documents(id, file_name, file_url, uploaded_at)
      `)
      .single()

    if (updateError) {
      console.error('Error updating document request:', updateError)
      return NextResponse.json({ 
        error: `No se pudo actualizar la solicitud: ${updateError.message}` 
      }, { status: 400 })
    }

    console.log('✅ Document request fulfilled:', requestId)

    return NextResponse.json({
      success: true,
      message: 'Solicitud marcada como cumplida exitosamente',
      documentRequest: updatedRequest,
    })

  } catch (err) {
    console.error('Error fulfilling document request:', err)
    return NextResponse.json({ 
      error: err instanceof Error ? err.message : 'Error interno del servidor' 
    }, { status: 500 })
  }
}

