"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAdminAuth } from '@/contexts/admin-auth-context'
import type { Document, DocumentFilters, DocumentStats, DocumentType, DocumentStatus } from '@/lib/types/admin'

export function useDocuments(filters: DocumentFilters = {}) {
  const { user, loading: authLoading, isAdmin, isSuperAdmin, isAgent, agentId, isSupportStaff, userScope, assignedAgentId } = useAdminAuth()
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Ref para controlar si el componente está montado
  const isMounted = useRef(true)
  // Ref para cancelar peticiones anteriores
  const abortControllerRef = useRef<AbortController | null>(null)
  // Ref para evitar llamadas concurrentes
  const fetchingRef = useRef(false)

  useEffect(() => {
    isMounted.current = true
    // Resetear fetchingRef cuando el componente se monta
    fetchingRef.current = false
    return () => {
      isMounted.current = false
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      // Resetear fetchingRef cuando el componente se desmonta
      fetchingRef.current = false
    }
  }, [])

  const fetchDocuments = useCallback(async () => {
    // Evitar llamadas concurrentes
    if (fetchingRef.current) {
      console.log('⏸️ Already fetching documents, skipping')
      return
    }

    // Si la autenticación está cargando, esperamos.
    if (authLoading) {
      console.log('⏳ Auth loading, skipping fetch')
      return
    }
    if (!user) {
      console.log('⏳ No user, skipping fetch')
      setLoading(false)
      return
    }

    fetchingRef.current = true

    // Cancelar petición anterior si existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    // Timeout de seguridad: 15 segundos (aumentado para dar más tiempo a la red)
    let timeoutCompleted = false
    const timeoutId = setTimeout(() => {
      timeoutCompleted = true
      if (isMounted.current) {
        console.warn('⚠️ Document fetch timed out, forcing completion')
        abortController.abort()
        setLoading(false)
      }
    }, 15000)

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
        .abortSignal(abortController.signal)
      
      console.log('Fetching documents with filters:', { 
        search: filters.search, 
        document_type: filters.document_type,
        client_id: filters.client_id,
        user_id: user?.id,
        user_email: user?.email,
        user_role: isAdmin ? 'admin' : isSuperAdmin ? 'super_admin' : isAgent ? 'agent' : isSupportStaff ? 'support_staff' : 'unknown'
      })
      
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
        // Ignorar errores de abort
        if (fetchError.code === '20' || fetchError.message.includes('AbortError')) {
          console.log('Request aborted')
          // No hacer nada más, dejar que llegue al finally
        } else {
          console.error('Error fetching documents:', fetchError)
          throw fetchError
        }
      } else if (isMounted.current && !timeoutCompleted) {
        console.log('Documents fetched successfully:', {
          count: data?.length
        })
        setDocuments(data || [])
      }
    } catch (err: any) {
      // Ignorar errores de abort
      if (err.name === 'AbortError' || err.message?.includes('AbortError') || err.code === '20') {
        console.log('Request aborted')
        // No hacer nada más, dejar que llegue al finally
      } else {
        console.error('Error fetching documents:', err)
        if (isMounted.current && !timeoutCompleted) {
          setError(err instanceof Error ? err.message : 'Error al cargar documentos')
        }
      }
    } finally {
      // SIEMPRE resetear fetchingRef, incluso si se abortó
      fetchingRef.current = false
      clearTimeout(timeoutId)
      if (isMounted.current && !timeoutCompleted) {
        setLoading(false)
      }
    }
  }, [authLoading, user, filters.search, filters.document_type, filters.status, filters.client_id, filters.date_from, filters.date_to, isAdmin, isSuperAdmin, isAgent, isSupportStaff])

  // Efecto principal que ejecuta fetchDocuments cuando cambian las dependencias
  useEffect(() => {
    // Esperar a que la autenticación termine
    if (authLoading) {
      return
    }
    
    // Si no hay usuario, no hacer fetch
    if (!user) {
      setLoading(false)
      setDocuments([])
      return
    }
    
    // Ejecutar fetch cuando:
    // 1. El usuario está autenticado
    // 2. Los filtros cambian
    // 3. El usuario cambia
    // El fetchingRef dentro de fetchDocuments evitará llamadas concurrentes
    fetchDocuments()
  }, [
    authLoading, 
    user?.id, 
    fetchDocuments,
    // Incluir filtros directamente para que se ejecute cuando cambien
    filters.search,
    filters.document_type,
    filters.status,
    filters.client_id,
    filters.date_from,
    filters.date_to
  ])

  return { documents, loading, error, refetch: fetchDocuments }
}

export function useDocumentStats() {
  const { user, loading: authLoading } = useAdminAuth()
  const [stats, setStats] = useState<DocumentStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isMounted = useRef(true)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  useEffect(() => {
    if (authLoading || !user) return

    // Cancelar petición anterior
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    const fetchStats = async () => {
      try {
        setLoading(true)
        const supabase = createClient()

        // Usamos Promise.all para ejecutar consultas en paralelo
        // Total documents
        const totalPromise = supabase
          .from('documents')
          .select('*', { count: 'exact', head: true })
          .eq('is_current', true)
          .abortSignal(abortController.signal)

        // Uploaded today
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const uploadedTodayPromise = supabase
          .from('documents')
          .select('*', { count: 'exact', head: true })
          .eq('is_current', true)
          .gte('uploaded_at', today.toISOString())
          .abortSignal(abortController.signal)

        // By type
        const byTypePromise = supabase
          .from('documents')
          .select('document_type')
          .eq('is_current', true)
          .abortSignal(abortController.signal)

        // Expired
        const expiredPromise = supabase
          .from('documents')
          .select('*', { count: 'exact', head: true })
          .eq('is_current', true)
          .not('expires_at', 'is', null)
          .lt('expires_at', new Date().toISOString())
          .abortSignal(abortController.signal)

        // Count by status
        const byStatusPromise = supabase
          .from('documents')
          .select('status')
          .eq('is_current', true)
          .abortSignal(abortController.signal)

        const [
          { count: total },
          { count: uploadedToday },
          { data: byType },
          { count: expired },
          { data: byStatus }
        ] = await Promise.all([
          totalPromise,
          uploadedTodayPromise,
          byTypePromise,
          expiredPromise,
          byStatusPromise
        ])

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

        const expiredCount = expired || 0
        const statusExpired = statusCounts.expired || 0
        const totalExpired = Math.max(expiredCount, statusExpired)

        if (isMounted.current) {
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
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return
        console.error('Error fetching stats:', err)
        if (isMounted.current) {
          setError(err instanceof Error ? err.message : 'Error al cargar estadísticas')
        }
      } finally {
        if (isMounted.current) {
          setLoading(false)
        }
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

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName)

      // Marcar documentos anteriores como no actuales
      const { data: prevDocs } = await supabase
        .from('documents')
        .select('version, id')
        .eq('client_id', clientId)
        .eq('document_type', documentType)
        .order('version', { ascending: false })
        .limit(1)

      const nextVersion = prevDocs && prevDocs.length > 0 ? (prevDocs[0].version || 0) + 1 : 1

      const { error: updateError } = await supabase
        .from('documents')
        .update({ is_current: false })
        .eq('client_id', clientId)
        .eq('document_type', documentType)
        .eq('is_current', true)

      if (updateError) {
        console.warn('Error updating previous documents:', updateError)
      }

      // Create document record
      const { data: document, error: dbError } = await supabase
        .from('documents')
        .insert({
          client_id: clientId,
          application_id: applicationId || null,
          document_type: documentType,
          file_url: fileName,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: user.id,
          is_current: true,
          version: nextVersion,
          status: 'received',
        })
        .select(`
          *,
          client:users!documents_client_id_fkey(id, email, first_name, last_name),
          uploader:users!documents_uploaded_by_fkey(id, email, first_name, last_name)
        `)
        .single()

      if (dbError) {
        if (dbError.code === '23505' && (dbError.message?.includes('idx_one_current_doc_per_type') || dbError.details?.includes('idx_one_current_doc_per_type'))) {
          throw new Error('Ya existe un documento de este tipo para este cliente. Por favor espera un momento e intenta de nuevo.')
        }
        throw dbError
      }

      console.log('Document inserted successfully:', {
        id: document?.id
      })

      return document
    } catch (err) {
      console.error('Error uploading document:', err)
      
      let errorMessage = 'Error al subir documento'
      
      if (err instanceof Error) {
        errorMessage = err.message
      } else if (typeof err === 'object' && err !== null) {
        const supabaseError = err as any
        if (supabaseError.message) {
          errorMessage = supabaseError.message
        } else if (supabaseError.error?.message) {
          errorMessage = supabaseError.error.message
        }
      }
      
      if (errorMessage.includes('Bucket not found') || 
          errorMessage.includes('bucket') && errorMessage.includes('not') ||
          errorMessage.includes('no está configurado')) {
        errorMessage = 'El bucket de documentos no está configurado.'
      } else if (errorMessage.includes('permission') || errorMessage.includes('policy') || errorMessage.includes('RLS')) {
        errorMessage = 'No tienes permisos para subir documentos.'
      } else if (errorMessage.includes('size') || errorMessage.includes('too large') || errorMessage.includes('exceed')) {
        errorMessage = 'El archivo es demasiado grande. El límite es 10 MB.'
      } else if (errorMessage.includes('MIME') || errorMessage.includes('type') || errorMessage.includes('format')) {
        errorMessage = 'Tipo de archivo no permitido. Solo se permiten PDF, JPG y PNG.'
      } else if (errorMessage.includes('duplicate key') || errorMessage.includes('idx_one_current_doc_per_type') || errorMessage.includes('23505')) {
        errorMessage = 'Ya existe un documento de este tipo para este cliente.'
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
  const [viewingId, setViewingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [viewUrl, setViewUrl] = useState<string | null>(null)

  const viewDocument = async (fileUrl: string, mimeType: string | null) => {
    try {
      setViewingId(fileUrl)
      setError(null)

      const supabase = createClient()

      const { data, error: urlError } = await supabase.storage
        .from('documents')
        .createSignedUrl(fileUrl, 3600)

      if (urlError) throw urlError
      if (!data?.signedUrl) throw new Error('No se pudo generar URL de visualización')

      setViewUrl(data.signedUrl)
      window.open(data.signedUrl, '_blank')
    } catch (err) {
      console.error('Error viewing document:', err)
      setError(err instanceof Error ? err.message : 'Error al visualizar documento')
    } finally {
      setViewingId(null)
    }
  }

  const isViewing = (fileUrl: string) => viewingId === fileUrl

  return { viewDocument, isViewing, error, viewUrl }
}

export function useUpdateDocumentStatus() {
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateDocumentStatus = async (
    documentId: string,
    status: Document['status'],
    reason?: string
  ): Promise<boolean> => {
    try {
      setUpdating(true)
      setError(null)

      if (!documentId) throw new Error('Document ID is required')
      if (!status) throw new Error('Status is required')

      const supabase = createClient()
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) throw new Error('No autenticado')

      const updateData: any = {
        status,
        status_changed_by: user.id,
        status_changed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      if (status === 'expired') {
        updateData.marked_expired_by = user.id
        updateData.marked_expired_at = new Date().toISOString()
      }

      const { error: updateError } = await supabase
        .from('documents')
        .update(updateData)
        .eq('id', documentId)

      if (updateError) throw updateError

      return true
    } catch (err) {
      console.error('Error updating document status:', err)
      const errorMessage = err instanceof Error ? err.message : 'Error al actualizar estado'
      setError(errorMessage)
      if (typeof window !== 'undefined') alert(`Error: ${errorMessage}`)
      return false
    } finally {
      setUpdating(false)
    }
  }

  return { updateDocumentStatus, updating, error }
}
