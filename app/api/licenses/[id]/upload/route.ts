import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/licenses/[id]/upload
 * Subir documento PDF de una license
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const licenseId = params.id

    // Verificar autenticación
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Solo admin y super_admin pueden subir documentos
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
        error: 'No tienes permisos para subir documentos' 
      }, { status: 403 })
    }

    // Verificar que la license existe
    const { data: license, error: fetchError } = await adminClient
      .from('licenses')
      .select('agent_id, state, license_number')
      .eq('id', licenseId)
      .single()

    if (fetchError || !license) {
      return NextResponse.json({ error: 'License no encontrada' }, { status: 404 })
    }

    // Obtener el archivo del FormData
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 })
    }

    // Validar que sea un PDF
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ 
        error: 'Solo se permiten archivos PDF' 
      }, { status: 400 })
    }

    // Validar tamaño (máximo 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'El archivo es demasiado grande. Máximo 5MB' 
      }, { status: 400 })
    }

    // Generar nombre único para el archivo
    const timestamp = Date.now()
    const fileName = `license-${license.agent_id}-${license.state}-${timestamp}.pdf`
    const filePath = `licenses/${license.agent_id}/${fileName}`

    // Convertir File a ArrayBuffer para Supabase Storage
    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = new Uint8Array(arrayBuffer)

    // Subir archivo a Supabase Storage
    const { data: uploadData, error: uploadError } = await adminClient.storage
      .from('documents') // Bucket de documents
      .upload(filePath, fileBuffer, {
        contentType: 'application/pdf',
        upsert: true
      })

    if (uploadError) {
      console.error('Error uploading file:', uploadError)
      return NextResponse.json({ 
        error: 'Error al subir archivo' 
      }, { status: 500 })
    }

    // Obtener URL pública del archivo
    const { data: urlData } = adminClient.storage
      .from('documents')
      .getPublicUrl(filePath)

    const documentUrl = urlData.publicUrl

    // Actualizar license con la URL del documento
    const { data: updatedLicense, error: updateError } = await adminClient
      .from('licenses')
      .update({ document_url: documentUrl })
      .eq('id', licenseId)
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

    if (updateError) {
      console.error('Error updating license with document URL:', updateError)
      // El archivo se subió pero no se actualizó la BD
      return NextResponse.json({ 
        error: 'Archivo subido pero error al actualizar registro' 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Documento subido exitosamente',
      license: updatedLicense,
      document_url: documentUrl
    })
  } catch (error) {
    console.error('Error in POST /api/licenses/[id]/upload:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

/**
 * DELETE /api/licenses/[id]/upload
 * Eliminar documento de una license
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const licenseId = params.id

    // Verificar autenticación
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Solo admin y super_admin pueden eliminar documentos
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
        error: 'No tienes permisos para eliminar documentos' 
      }, { status: 403 })
    }

    // Obtener license con document_url
    const { data: license, error: fetchError } = await adminClient
      .from('licenses')
      .select('document_url')
      .eq('id', licenseId)
      .single()

    if (fetchError || !license) {
      return NextResponse.json({ error: 'License no encontrada' }, { status: 404 })
    }

    if (!license.document_url) {
      return NextResponse.json({ 
        error: 'Esta license no tiene documento' 
      }, { status: 400 })
    }

    // Extraer el path del storage de la URL
    // Formato: https://[project].supabase.co/storage/v1/object/public/documents/licenses/...
    const urlParts = license.document_url.split('/documents/')
    if (urlParts.length < 2) {
      console.error('Invalid document URL format:', license.document_url)
      // Igualmente limpiar el campo en BD
    } else {
      const filePath = urlParts[1]

      // Eliminar archivo del storage
      const { error: deleteError } = await adminClient.storage
        .from('documents')
        .remove([filePath])

      if (deleteError) {
        console.error('Error deleting file from storage:', deleteError)
        // No es crítico, continuamos
      }
    }

    // Limpiar document_url en la BD
    const { error: updateError } = await adminClient
      .from('licenses')
      .update({ document_url: null })
      .eq('id', licenseId)

    if (updateError) {
      console.error('Error clearing document_url:', updateError)
      return NextResponse.json({ 
        error: 'Error al eliminar referencia del documento' 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Documento eliminado exitosamente'
    })
  } catch (error) {
    console.error('Error in DELETE /api/licenses/[id]/upload:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}


