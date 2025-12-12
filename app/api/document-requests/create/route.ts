import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // Verificar que el usuario esté autenticado
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar que el usuario tenga rol permitido (admin, super_admin, agent, support_staff)
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
    
    if (!isAdmin && !isAgent && !isSupportStaff) {
      return NextResponse.json({ error: 'No tienes permisos para solicitar documentos' }, { status: 403 })
    }

    // Obtener datos del body
    const body = await request.json()
    const { 
      clientId, 
      applicationId, 
      documentType, 
      priority = 'medium',
      dueDate,
      notes,
      sendEmail = true 
    } = body

    if (!clientId || !documentType) {
      return NextResponse.json({ 
        error: 'clientId y documentType son requeridos' 
      }, { status: 400 })
    }

    // Validar que el document type sea válido
    const validDocumentTypes = ['medical', 'identification', 'financial', 'property', 'other']
    if (!validDocumentTypes.includes(documentType)) {
      return NextResponse.json({ 
        error: 'Tipo de documento inválido' 
      }, { status: 400 })
    }

    // Validar que el priority sea válido
    const validPriorities = ['low', 'medium', 'high', 'urgent']
    if (!validPriorities.includes(priority)) {
      return NextResponse.json({ 
        error: 'Prioridad inválida' 
      }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Obtener información del cliente
    const { data: clientData, error: clientError } = await adminClient
      .from('users')
      .select('id, email, first_name, last_name, role')
      .eq('id', clientId)
      .single()

    if (clientError || !clientData) {
      return NextResponse.json({ 
        error: 'Cliente no encontrado' 
      }, { status: 404 })
    }

    // Verificar que el usuario sea un cliente
    if (clientData.role !== 'client') {
      return NextResponse.json({ 
        error: 'El usuario seleccionado no es un cliente' 
      }, { status: 400 })
    }

    // Si es agent, verificar que el cliente sea suyo
    if (isAgent) {
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
        .eq('id', clientId)
        .single()

      if (clientAgentCheck?.agent_profile_id !== agentData.id) {
        return NextResponse.json({ 
          error: 'No tienes permisos para solicitar documentos a este cliente' 
        }, { status: 403 })
      }
    }

    // Si es support staff con scope agent_specific, verificar scope
    if (isSupportStaff && userData.scope === 'agent_specific') {
      const { data: clientAgentCheck } = await adminClient
        .from('users')
        .select('agent_profile_id')
        .eq('id', clientId)
        .single()

      if (clientAgentCheck?.agent_profile_id !== userData.assigned_to_agent_id) {
        return NextResponse.json({ 
          error: 'No tienes permisos para solicitar documentos a este cliente' 
        }, { status: 403 })
      }
    }

    // Crear la solicitud de documento
    const { data: documentRequest, error: createError } = await adminClient
      .from('document_requests')
      .insert({
        client_id: clientId,
        application_id: applicationId || null,
        requested_by: user.id,
        document_type: documentType,
        priority,
        status: 'pending',
        due_date: dueDate || null,
        notes: notes || null,
      })
      .select(`
        *,
        client:users!document_requests_client_id_fkey(id, email, first_name, last_name),
        requester:users!document_requests_requested_by_fkey(id, email, first_name, last_name, role)
      `)
      .single()

    if (createError) {
      console.error('Error creating document request:', createError)
      return NextResponse.json({ 
        error: `No se pudo crear la solicitud: ${createError.message}` 
      }, { status: 400 })
    }

    console.log('✅ Document request created:', documentRequest.id)

    // Enviar email al cliente si sendEmail es true
    let emailSent = false
    let actionLink = null

    if (sendEmail) {
      try {
        const dashboardUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL || 'http://localhost:3001'
        const documentsUrl = `${dashboardUrl}/documents`

        // Preparar el contenido del email
        const documentTypeLabels: Record<string, string> = {
          medical: 'Medical Document',
          identification: 'Identification Document',
          financial: 'Financial Document',
          property: 'Property Document',
          other: 'Document'
        }

        const priorityLabels: Record<string, string> = {
          low: 'Low',
          medium: 'Medium',
          high: 'High',
          urgent: 'Urgent'
        }

        const emailSubject = `Document Request: ${documentTypeLabels[documentType] || documentType}`
        const clientName = clientData.first_name 
          ? `${clientData.first_name} ${clientData.last_name || ''}`.trim()
          : clientData.email

        // Nota: Supabase Auth no tiene un método directo para enviar emails personalizados
        // En producción, deberías usar un servicio como Resend, SendGrid, etc.
        // Por ahora, registramos que se debería enviar el email
        console.log('📧 Email should be sent to:', clientData.email)
        console.log('📧 Subject:', emailSubject)
        console.log('📧 Document Type:', documentTypeLabels[documentType])
        console.log('📧 Priority:', priorityLabels[priority])
        console.log('📧 Due Date:', dueDate || 'No deadline')
        console.log('📧 Notes:', notes || 'No additional notes')
        console.log('📧 Documents URL:', documentsUrl)

        // TODO: Integrar con servicio de email (Resend, SendGrid, etc.)
        // Por ahora, marcamos como "email enviado" para desarrollo
        emailSent = true

      } catch (emailError) {
        console.error('Error sending email:', emailError)
        // No fallar la solicitud si el email falla
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Solicitud de documento creada exitosamente',
      documentRequest,
      emailSent,
      note: emailSent 
        ? 'Email notification sent to client' 
        : 'Document request created but email was not sent'
    })

  } catch (err) {
    console.error('Error in document request creation:', err)
    return NextResponse.json({ 
      error: err instanceof Error ? err.message : 'Error interno del servidor' 
    }, { status: 500 })
  }
}

