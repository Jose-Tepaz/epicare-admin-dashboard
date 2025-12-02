"use client"

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface ClientApplication {
  id: string
  user_id: string
  status: string
  company_id: string | null
  carrier_name: string | null
  enrollment_data: any
  created_at: string
  updated_at: string
  insurance_companies?: {
    id: string
    name: string
    slug: string
  } | null
}

export function useClientApplications(clientId: string | null) {
  const [applications, setApplications] = useState<ClientApplication[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const searchApplications = useCallback(async (searchTerm: string = '') => {
    if (!clientId) {
      setApplications([])
      return
    }

    try {
      setLoading(true)
      setError(null)
      const supabase = createClient()

      console.log('Searching applications for client:', clientId)

      let query = supabase
        .from('applications')
        .select(`
          id, 
          user_id, 
          status, 
          company_id,
          carrier_name,
          enrollment_data, 
          created_at, 
          updated_at,
          insurance_companies(id, name, slug)
        `)
        .eq('user_id', clientId)
        .order('created_at', { ascending: false })
        .limit(50)

      // Si hay término de búsqueda, filtrar por status o carrier_name
      // Nota: No podemos filtrar directamente por insurance_companies.name en el OR
      // porque es una relación, así que filtramos por carrier_name que suele tener el mismo valor
      if (searchTerm) {
        query = query.or(
          `status.ilike.%${searchTerm}%,carrier_name.ilike.%${searchTerm}%`
        )
      }

      const { data, error: fetchError } = await query

      if (fetchError) {
        console.error('Query error:', fetchError)
        throw fetchError
      }

      console.log('Applications found:', data?.length, data)
      setApplications((data as unknown as ClientApplication[]) || [])
    } catch (err) {
      console.error('Error searching applications:', err)
      setError(err instanceof Error ? err.message : 'Error al buscar aplicaciones')
    } finally {
      setLoading(false)
    }
  }, [clientId])

  return { applications, loading, error, searchApplications }
}

