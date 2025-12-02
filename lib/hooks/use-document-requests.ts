"use client"

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { 
  DocumentRequest, 
  DocumentRequestFilters, 
  DocumentRequestStats,
  DocumentRequestPriority,
  DocumentRequestStatus,
  DocumentType
} from '@/lib/types/admin'

/**
 * Hook para obtener solicitudes de documentos con filtros
 */
export function useDocumentRequests(filters: DocumentRequestFilters = {}) {
  const [requests, setRequests] = useState<DocumentRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError('No autenticado')
        return
      }

      console.log('Fetching document requests with filters:', filters)

      let query = supabase
        .from('document_requests')
        .select(`
          *,
          client:users!document_requests_client_id_fkey(id, email, first_name, last_name, phone),
          requester:users!document_requests_requested_by_fkey(id, email, first_name, last_name, role),
          fulfiller:users!document_requests_fulfilled_by_fkey(id, email, first_name, last_name),
          document:documents(id, file_name, file_url, uploaded_at),
          application:applications!document_requests_application_id_fkey(
            id,
            status,
            enrollment_data,
            carrier_name,
            company_id
          )
        `)
        .order('created_at', { ascending: false })

      // Aplicar filtros
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status)
      }

      if (filters.priority && filters.priority !== 'all') {
        query = query.eq('priority', filters.priority)
      }

      if (filters.document_type && filters.document_type !== 'all') {
        query = query.eq('document_type', filters.document_type)
      }

      if (filters.client_id) {
        query = query.eq('client_id', filters.client_id)
      }

      if (filters.date_from) {
        query = query.gte('created_at', filters.date_from)
      }

      if (filters.date_to) {
        query = query.lte('created_at', filters.date_to)
      }

      // Búsqueda por texto (en nombre del cliente o notas)
      if (filters.search) {
        // Nota: La búsqueda en campos relacionados es compleja en Supabase
        // Por ahora, filtraremos en el cliente después de obtener los datos
      }

      const { data, error: fetchError } = await query

      if (fetchError) {
        console.error('Error fetching document requests:', fetchError)
        throw fetchError
      }

      let filteredData = data || []

      // Filtrar por búsqueda de texto en el cliente
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        filteredData = filteredData.filter((req) => {
          const clientName = `${req.client?.first_name || ''} ${req.client?.last_name || ''}`.toLowerCase()
          const clientEmail = req.client?.email?.toLowerCase() || ''
          const notes = req.notes?.toLowerCase() || ''
          
          return (
            clientName.includes(searchLower) ||
            clientEmail.includes(searchLower) ||
            notes.includes(searchLower)
          )
        })
      }

      console.log('Document requests fetched:', filteredData.length)
      setRequests(filteredData)
    } catch (err) {
      console.error('Error fetching document requests:', err)
      setError(err instanceof Error ? err.message : 'Error al cargar solicitudes')
    } finally {
      setLoading(false)
    }
  }, [filters.status, filters.priority, filters.document_type, filters.client_id, filters.date_from, filters.date_to, filters.search])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  return { requests, loading, error, refetch: fetchRequests }
}

/**
 * Hook para obtener estadísticas de solicitudes de documentos
 */
export function useDocumentRequestStats() {
  const [stats, setStats] = useState<DocumentRequestStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      setLoading(true)
      setError(null)

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError('No autenticado')
        return
      }

      // Obtener conteos por status
      const { count: total } = await supabase
        .from('document_requests')
        .select('*', { count: 'exact', head: true })

      const { count: pending } = await supabase
        .from('document_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')

      const { count: fulfilled } = await supabase
        .from('document_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'fulfilled')

      const { count: expired } = await supabase
        .from('document_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'expired')

      const { count: cancelled } = await supabase
        .from('document_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'cancelled')

      // Obtener conteos por prioridad
      const { count: lowPriority } = await supabase
        .from('document_requests')
        .select('*', { count: 'exact', head: true })
        .eq('priority', 'low')

      const { count: mediumPriority } = await supabase
        .from('document_requests')
        .select('*', { count: 'exact', head: true })
        .eq('priority', 'medium')

      const { count: highPriority } = await supabase
        .from('document_requests')
        .select('*', { count: 'exact', head: true })
        .eq('priority', 'high')

      const { count: urgentPriority } = await supabase
        .from('document_requests')
        .select('*', { count: 'exact', head: true })
        .eq('priority', 'urgent')

      // Obtener conteos por tipo de documento
      const { count: medical } = await supabase
        .from('document_requests')
        .select('*', { count: 'exact', head: true })
        .eq('document_type', 'medical')

      const { count: identification } = await supabase
        .from('document_requests')
        .select('*', { count: 'exact', head: true })
        .eq('document_type', 'identification')

      const { count: financial } = await supabase
        .from('document_requests')
        .select('*', { count: 'exact', head: true })
        .eq('document_type', 'financial')

      const { count: property } = await supabase
        .from('document_requests')
        .select('*', { count: 'exact', head: true })
        .eq('document_type', 'property')

      const { count: other } = await supabase
        .from('document_requests')
        .select('*', { count: 'exact', head: true })
        .eq('document_type', 'other')

      setStats({
        total: total || 0,
        pending: pending || 0,
        fulfilled: fulfilled || 0,
        expired: expired || 0,
        cancelled: cancelled || 0,
        by_priority: {
          low: lowPriority || 0,
          medium: mediumPriority || 0,
          high: highPriority || 0,
          urgent: urgentPriority || 0,
        },
        by_type: {
          medical: medical || 0,
          identification: identification || 0,
          financial: financial || 0,
          property: property || 0,
          other: other || 0,
        },
      })
    } catch (err) {
      console.error('Error fetching document request stats:', err)
      setError(err instanceof Error ? err.message : 'Error al cargar estadísticas')
    } finally {
      setLoading(false)
    }
  }

  return { stats, loading, error, refetch: fetchStats }
}

/**
 * Hook para crear una solicitud de documento
 */
export function useCreateDocumentRequest() {
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createRequest = async (
    clientId: string,
    documentType: DocumentType,
    priority: DocumentRequestPriority = 'medium',
    options: {
      applicationId?: string
      dueDate?: string
      notes?: string
      sendEmail?: boolean
    } = {}
  ): Promise<DocumentRequest | null> => {
    try {
      setCreating(true)
      setError(null)

      const response = await fetch('/api/document-requests/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId,
          documentType,
          priority,
          applicationId: options.applicationId,
          dueDate: options.dueDate,
          notes: options.notes,
          sendEmail: options.sendEmail !== false, // default true
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear solicitud')
      }

      toast.success(data.message || 'Solicitud creada exitosamente')
      
      if (data.emailSent) {
        toast.info('Email enviado al cliente')
      }

      return data.documentRequest
    } catch (err) {
      console.error('Error creating document request:', err)
      const errorMessage = err instanceof Error ? err.message : 'Error al crear solicitud'
      setError(errorMessage)
      toast.error(errorMessage)
      return null
    } finally {
      setCreating(false)
    }
  }

  return { createRequest, creating, error }
}

/**
 * Hook para marcar una solicitud como cumplida
 */
export function useFulfillDocumentRequest() {
  const [fulfilling, setFulfilling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fulfillRequest = async (
    requestId: string,
    documentId?: string
  ): Promise<boolean> => {
    try {
      setFulfilling(true)
      setError(null)

      const response = await fetch(`/api/document-requests/${requestId}/fulfill`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al cumplir solicitud')
      }

      toast.success(data.message || 'Solicitud marcada como cumplida')
      return true
    } catch (err) {
      console.error('Error fulfilling document request:', err)
      const errorMessage = err instanceof Error ? err.message : 'Error al cumplir solicitud'
      setError(errorMessage)
      toast.error(errorMessage)
      return false
    } finally {
      setFulfilling(false)
    }
  }

  return { fulfillRequest, fulfilling, error }
}

/**
 * Hook para cancelar una solicitud
 */
export function useCancelDocumentRequest() {
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cancelRequest = async (requestId: string): Promise<boolean> => {
    try {
      setCancelling(true)
      setError(null)

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('No autenticado')
      }

      const { error: updateError } = await supabase
        .from('document_requests')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId)

      if (updateError) throw updateError

      toast.success('Solicitud cancelada exitosamente')
      return true
    } catch (err) {
      console.error('Error cancelling document request:', err)
      const errorMessage = err instanceof Error ? err.message : 'Error al cancelar solicitud'
      setError(errorMessage)
      toast.error(errorMessage)
      return false
    } finally {
      setCancelling(false)
    }
  }

  return { cancelRequest, cancelling, error }
}

