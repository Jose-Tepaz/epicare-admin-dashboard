"use client"

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAdminAuth } from '@/contexts/admin-auth-context'
import type { Document, DocumentFilters, DocumentStats, DocumentType, DocumentStatus } from '@/lib/types/admin'

export function useDocuments(filters: DocumentFilters = {}) {
  const { user, loading: authLoading, isAdmin, isSuperAdmin, isAgent, agentId, isSupportStaff, userScope, assignedAgentId } = useAdminAuth()
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDocuments = useCallback(async () => {
    if (authLoading || !user) return

    try {
      setLoading(true)
      setError(null)
      const supabase = createClient()

      let query = supabase
        .from('documents')
        .select(`
          *,
          status,
          status_changed_by,
          status_changed_at,
          client:users!documents_client_id_fkey(id, email, first_name, last_name),
          uploader:users!documents_uploaded_by_fkey(id, email, first_name, last_name),
          application:applications!documents_application_id_fkey(
            id, 
            status, 
            enrollment_data,
            carrier_name,
            company_id,
            insurance_companies:applications_company_id_fkey(id, name, slug)
          )
        `)
        .eq('is_current', true)
        .order('uploaded_at', { ascending: false })
      
      console.log('Fetching documents with filters:', { 
        search: filters.search, 
        document_type: filters.document_type,
        client_id: filters.client_id,
        user_id: user?.id,
        user_email: user?.email,
        user_role: isAdmin ? 'admin' : isSuperAdmin ? 'super_admin' : isAgent ? 'agent' : isSupportStaff ? 'support_staff' : 'unknown'
      })
      
      // Debug: Verificar si el problema es RLS o relaciones
      // Hacer una query simple primero para aislar el problema
      const { data: simpleData, error: simpleError } = await supabase
        .from('documents')
        .select('id, client_id, document_type, is_current, status, file_name, uploaded_at')
        .eq('is_current', true)
        .order('uploaded_at', { ascending: false })
      
      if (simpleError) {
        console.error('Simple query error (RLS issue?):', simpleError)
      } else {
        console.log('Simple query result (without relations):', {
          count: simpleData?.length,
          documents: simpleData?.map(d => ({
            id: d.id,
            client_id: d.client_id,
            document_type: d.document_type,
            is_current: d.is_current,
            status: (d as any).status,
            file_name: d.file_name
          }))
        })
      }

      // Aplicar filtros de búsqueda
      if (filters.search) {
        query = query.or(`file_name.ilike.%${filters.search}%`)
      }

      if (filters.document_type && filters.document_type !== 'all') {
        query = query.eq('document_type', filters.document_type)
      }

      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status)
      }

      if (filters.client_id) {
        query = query.eq('client_id', filters.client_id)
      }

      if (filters.date_from) {
        query = query.gte('uploaded_at', filters.date_from)
      }

      if (filters.date_to) {
        query = query.lte('uploaded_at', filters.date_to)
      }

      const { data, error: fetchError } = await query

      if (fetchError) {
        console.error('Error fetching documents:', fetchError)
        console.error('Error details:', {
          message: fetchError.message,
          details: fetchError.details,
          hint: fetchError.hint,
          code: fetchError.code
        })
        throw fetchError
      }

        console.log('Documents fetched successfully:', {
          count: data?.length,
          total_rows: data?.length,
          documents: data?.map(d => ({
            id: d.id,
            client_id: d.client_id,
            document_type: d.document_type,
            status: (d as any).status,
            is_current: d.is_current,
            file_name: d.file_name,
            has_client: !!d.client,
            has_uploader: !!d.uploader
          })),
          is_current_filter: true,
          user_id: user?.id,
          user_email: user?.email
        })
      
      // Verificar si hay documentos que no se cargaron por problemas de relaciones
      if (data) {
        const docsWithMissingRelations = data.filter(doc => !doc.client || !doc.uploader)
        if (docsWithMissingRelations.length > 0) {
          console.warn('Some documents have missing relations:', docsWithMissingRelations.map(d => ({
            id: d.id,
            client_id: d.client_id,
            has_client: !!d.client,
            has_uploader: !!d.uploader
          })))
        }
      }
      
      setDocuments(data || [])
    } catch (err) {
      console.error('Error fetching documents:', err)
      setError(err instanceof Error ? err.message : 'Error al cargar documentos')
    } finally {
      setLoading(false)
    }
  }, [authLoading, user, filters.search, filters.document_type, filters.status, filters.client_id, filters.date_from, filters.date_to, isAgent, agentId, isSupportStaff, userScope, assignedAgentId])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  return { documents, loading, error, refetch: fetchDocuments }
}

export function useDocumentStats() {
  const { user, loading: authLoading } = useAdminAuth()
  const [stats, setStats] = useState<DocumentStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading || !user) return

    const fetchStats = async () => {
      try {
        setLoading(true)
        const supabase = createClient()

        // Total documents
        const { count: total } = await supabase
          .from('documents')
          .select('*', { count: 'exact', head: true })
          .eq('is_current', true)

        // Uploaded today
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const { count: uploadedToday } = await supabase
          .from('documents')
          .select('*', { count: 'exact', head: true })
          .eq('is_current', true)
          .gte('uploaded_at', today.toISOString())

        // By type
        const { data: byType } = await supabase
          .from('documents')
          .select('document_type')
          .eq('is_current', true)

        const typeCounts = {
          medical: 0,
          identification: 0,
          financial: 0,
          property: 0,
          other: 0,
        }

        byType?.forEach((doc) => {
          typeCounts[doc.document_type as DocumentType] = (typeCounts[doc.document_type as DocumentType] || 0) + 1
        })

        // Expired
        const { count: expired } = await supabase
          .from('documents')
          .select('*', { count: 'exact', head: true })
          .eq('is_current', true)
          .not('expires_at', 'is', null)
          .lt('expires_at', new Date().toISOString())

        // Count by status
        const { data: byStatus } = await supabase
          .from('documents')
          .select('status')
          .eq('is_current', true)

        const statusCounts = {
          received: 0,
          under_review: 0,
          approved: 0,
          rejected: 0,
          expired: 0,
        }

        byStatus?.forEach((doc) => {
          const status = doc.status as DocumentStatus
          if (status && statusCounts.hasOwnProperty(status)) {
            statusCounts[status] = (statusCounts[status] || 0) + 1
          }
        })

        // Also count expired by expires_at
        const expiredCount = expired || 0
        const statusExpired = statusCounts.expired || 0
        const totalExpired = Math.max(expiredCount, statusExpired)

        setStats({
          total: total || 0,
          received: statusCounts.received || 0,
          under_review: statusCounts.under_review || 0,
          approved: statusCounts.approved || 0,
          rejected: statusCounts.rejected || 0,
          expired: totalExpired,
          uploaded_today: uploadedToday || 0,
          by_type: typeCounts,
        })
      } catch (err) {
        console.error('Error fetching stats:', err)
        setError(err instanceof Error ? err.message : 'Error al cargar estadísticas')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [authLoading, user])

  return { stats, loading, error }
}

export function useUploadDocument() {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const uploadDocument = async (
    file: File,
    clientId: string,
    documentType: DocumentType,
    applicationId?: string
  ): Promise<Document | null> => {
    try {
      setUploading(true)
      setError(null)

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('No autenticado')
      }

      // Upload file to storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${clientId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        console.error('Storage upload error:', uploadError)
        // Mensaje más específico para bucket no encontrado
        const errorMessage = uploadError.message || uploadError.toString() || ''
        const statusCode = (uploadError as any).statusCode || (uploadError as any).status
        if (errorMessage.includes('Bucket not found') || 
            errorMessage.includes('not found') || 
            statusCode === 400 ||
            errorMessage.toLowerCase().includes('bucket')) {
          throw new Error('El bucket de documentos no está configurado en Supabase Storage. Por favor crea el bucket "documents" en el Dashboard de Supabase (Storage → New bucket).')
        }
        throw uploadError
      }

      // Get public URL (aunque es privado, necesitamos la referencia)
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName)

      // Primero, obtener la versión máxima y marcar documentos anteriores como no actuales
      // Esto maneja el constraint idx_one_current_doc_per_type que requiere un solo documento actual por tipo
      const { data: prevDocs } = await supabase
        .from('documents')
        .select('version, id')
        .eq('client_id', clientId)
        .eq('document_type', documentType)
        .order('version', { ascending: false })
        .limit(1)

      const nextVersion = prevDocs && prevDocs.length > 0 ? (prevDocs[0].version || 0) + 1 : 1

      // Marcar todos los documentos anteriores del mismo tipo como no actuales
      const { error: updateError } = await supabase
        .from('documents')
        .update({ is_current: false })
        .eq('client_id', clientId)
        .eq('document_type', documentType)
        .eq('is_current', true)

      if (updateError) {
        console.warn('Error updating previous documents:', updateError)
        // Continuar de todas formas, puede que no haya documentos previos o no tengamos permisos
      }

      // Create document record con la nueva versión
      const { data: document, error: dbError } = await supabase
        .from('documents')
        .insert({
          client_id: clientId,
          application_id: applicationId || null,
          document_type: documentType,
          file_url: fileName, // Guardamos el path, no la URL completa
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: user.id,
          is_current: true,
          version: nextVersion,
          status: 'received', // Estado inicial: recibido
        })
        .select(`
          *,
          client:users!documents_client_id_fkey(id, email, first_name, last_name),
          uploader:users!documents_uploaded_by_fkey(id, email, first_name, last_name)
        `)
        .single()

      if (dbError) {
        // Si aún hay error de constraint único después de marcar como no actuales
        if (dbError.code === '23505' && (dbError.message?.includes('idx_one_current_doc_per_type') || dbError.details?.includes('idx_one_current_doc_per_type'))) {
          console.error('Still getting constraint violation after updating previous docs:', dbError)
          throw new Error('Ya existe un documento de este tipo para este cliente. Por favor espera un momento e intenta de nuevo.')
        }
        console.error('Database error inserting document:', dbError)
        throw dbError
      }

      console.log('Document inserted successfully:', {
        id: document?.id,
        client_id: document?.client_id,
        document_type: document?.document_type,
        is_current: document?.is_current,
        version: document?.version
      })

      return document
    } catch (err) {
      console.error('Error uploading document:', err)
      
      // Manejar diferentes tipos de errores
      let errorMessage = 'Error al subir documento'
      
      if (err instanceof Error) {
        errorMessage = err.message
      } else if (typeof err === 'object' && err !== null) {
        // Manejar errores de Supabase Storage
        const supabaseError = err as any
        if (supabaseError.message) {
          errorMessage = supabaseError.message
        } else if (supabaseError.error?.message) {
          errorMessage = supabaseError.error.message
        }
      }
      
      // Mensajes más amigables para errores comunes
      if (errorMessage.includes('Bucket not found') || 
          errorMessage.includes('bucket') && errorMessage.includes('not') ||
          errorMessage.includes('no está configurado')) {
        errorMessage = 'El bucket de documentos no está configurado en Supabase Storage. Ve a Supabase Dashboard → Storage → New bucket y crea un bucket llamado "documents" (privado, 10MB). Ver archivo SETUP-DOCUMENTS-STORAGE.md para instrucciones detalladas.'
      } else if (errorMessage.includes('permission') || errorMessage.includes('policy') || errorMessage.includes('RLS')) {
        errorMessage = 'No tienes permisos para subir documentos. Verifica que las políticas RLS estén ejecutadas. Contacta al administrador.'
      } else if (errorMessage.includes('size') || errorMessage.includes('too large') || errorMessage.includes('exceed')) {
        errorMessage = 'El archivo es demasiado grande. El límite es 10 MB.'
      } else if (errorMessage.includes('MIME') || errorMessage.includes('type') || errorMessage.includes('format')) {
        errorMessage = 'Tipo de archivo no permitido. Solo se permiten PDF, JPG y PNG.'
      } else if (errorMessage.includes('duplicate key') || errorMessage.includes('idx_one_current_doc_per_type') || errorMessage.includes('23505')) {
        errorMessage = 'Ya existe un documento de este tipo para este cliente. El sistema está actualizando la versión del documento.'
      }
      
      setError(errorMessage)
      return null
    } finally {
      setUploading(false)
    }
  }

  return { uploadDocument, uploading, error }
}

export function useDownloadDocument() {
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const downloadDocument = async (fileUrl: string, fileName: string) => {
    try {
      setDownloading(true)
      setError(null)

      const supabase = createClient()

      const { data, error: downloadError } = await supabase.storage
        .from('documents')
        .download(fileUrl)

      if (downloadError) throw downloadError

      // Create blob and download
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error downloading document:', err)
      setError(err instanceof Error ? err.message : 'Error al descargar documento')
    } finally {
      setDownloading(false)
    }
  }

  return { downloadDocument, downloading, error }
}

export function useViewDocument() {
  const [viewing, setViewing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewUrl, setViewUrl] = useState<string | null>(null)

  const viewDocument = async (fileUrl: string, mimeType: string | null) => {
    try {
      setViewing(true)
      setError(null)

      const supabase = createClient()

      // Get signed URL for viewing (valid for 1 hour)
      const { data, error: urlError } = await supabase.storage
        .from('documents')
        .createSignedUrl(fileUrl, 3600)

      if (urlError) throw urlError
      if (!data?.signedUrl) throw new Error('No se pudo generar URL de visualización')

      setViewUrl(data.signedUrl)
      
      // Open in new tab
      window.open(data.signedUrl, '_blank')
    } catch (err) {
      console.error('Error viewing document:', err)
      setError(err instanceof Error ? err.message : 'Error al visualizar documento')
    } finally {
      setViewing(false)
    }
  }

  return { viewDocument, viewing, error, viewUrl }
}

export function useUpdateDocumentStatus() {
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateDocumentStatus = async (
    documentId: string,
    status: Document['status'],
    reason?: string
  ): Promise<boolean> => {
    console.log('🔄 updateDocumentStatus START:', { documentId, status })
    
    try {
      setUpdating(true)
      setError(null)

      if (!documentId) {
        throw new Error('Document ID is required')
      }

      if (!status) {
        throw new Error('Status is required')
      }

      const validStatuses = ['received', 'under_review', 'approved', 'rejected', 'expired']
      if (!validStatuses.includes(status)) {
        throw new Error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`)
      }

      console.log('📋 Validating user...')
      const supabase = createClient()
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError) {
        console.error('❌ Error getting user:', userError)
        throw userError
      }

      if (!user) {
        throw new Error('No autenticado')
      }

      console.log('✅ User authenticated:', user.id)

      const updateData: any = {
        status,
        status_changed_by: user.id,
        status_changed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      // Si el status es 'expired', también marcar como expired
      if (status === 'expired') {
        updateData.marked_expired_by = user.id
        updateData.marked_expired_at = new Date().toISOString()
      }

      console.log('📤 Sending update to Supabase:', { documentId, updateData })

      const { data, error: updateError } = await supabase
        .from('documents')
        .update(updateData)
        .eq('id', documentId)
        .select()

      if (updateError) {
        console.error('❌ Error updating document:', updateError)
        console.error('Error details:', {
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint,
          code: updateError.code
        })
        throw updateError
      }

      console.log('✅ Document updated successfully:', data)
      return true
    } catch (err) {
      console.error('❌ Error updating document status:', err)
      const errorMessage = err instanceof Error ? err.message : 'Error al actualizar estado del documento'
      setError(errorMessage)
      // Mostrar alerta al usuario
      if (typeof window !== 'undefined') {
        alert(`Error al actualizar estado: ${errorMessage}`)
      }
      return false
    } finally {
      setUpdating(false)
      console.log('🔄 updateDocumentStatus END')
    }
  }

  return { updateDocumentStatus, updating, error }
}

