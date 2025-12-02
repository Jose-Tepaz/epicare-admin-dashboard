"use client"

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface ClientOption {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  phone: string | null
}

export function useClientsSearch(initialSearchTerm: string = '') {
  const [clients, setClients] = useState<ClientOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Debounce search term para evitar muchas peticiones
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(initialSearchTerm)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(initialSearchTerm)
    }, 500)
    return () => clearTimeout(timer)
  }, [initialSearchTerm])

  const searchClients = useCallback(async (term: string) => {
    try {
      setLoading(true)
      setError(null)
      const supabase = createClient()

      console.log('Searching clients with term:', term)

      let query = supabase
        .from('users')
        .select('id, email, first_name, last_name, phone, role')
        .eq('role', 'client')
        .order('created_at', { ascending: false })
        .limit(50)

      if (term) {
        query = query.or(
          `email.ilike.%${term}%,first_name.ilike.%${term}%,last_name.ilike.%${term}%`
        )
      }

      const { data, error: fetchError } = await query

      if (fetchError) {
        console.error('Query error:', fetchError)
        throw fetchError
      }

      console.log('Clients found:', data?.length)
      setClients(data || [])
    } catch (err) {
      console.error('Error searching clients:', err)
      setError(err instanceof Error ? err.message : 'Error al buscar clientes')
    } finally {
      setLoading(false)
    }
  }, [])

  // Ejecutar búsqueda cuando cambia el término debounced
  useEffect(() => {
    searchClients(debouncedSearchTerm)
  }, [debouncedSearchTerm, searchClients])

  return { clients, loading, error, searchClients }
}
