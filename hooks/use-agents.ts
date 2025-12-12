/**
 * Hook para cargar y gestionar lista de agentes
 * 
 * Usado en el formulario de creación de usuarios para que
 * admins/super_admins puedan seleccionar manualmente el agente
 * a asignar a un nuevo cliente.
 * 
 * @module use-agents
 */

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface Agent {
  id: string
  business_name: string | null
  user_id: string
  is_active: boolean
  is_default: boolean
  email: string | null
  phone: string | null
  users: {
    first_name: string
    last_name: string
    email: string
  }
}

export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadAgents()
  }, [])

  const loadAgents = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const supabase = createClient()
      const { data, error: fetchError } = await supabase
        .from('agent_profiles')
        .select(`
          id, 
          business_name, 
          user_id, 
          is_active, 
          is_default,
          email,
          phone,
          users!inner(
            first_name, 
            last_name, 
            email
          )
        `)
        .eq('is_active', true)
        .order('business_name', { nullsFirst: false })

      if (fetchError) {
        throw fetchError
      }

      setAgents(data || [])
    } catch (err) {
      console.error('Error loading agents:', err)
      setError(err instanceof Error ? err.message : 'Error loading agents')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Obtiene el nombre completo de un agente para mostrar
   */
  const getAgentDisplayName = (agent: Agent): string => {
    if (agent.business_name) {
      return agent.business_name
    }
    return `${agent.users.first_name} ${agent.users.last_name}`.trim()
  }

  /**
   * Obtiene el agente por defecto
   */
  const getDefaultAgent = (): Agent | undefined => {
    return agents.find(agent => agent.is_default)
  }

  return { 
    agents, 
    loading, 
    error, 
    refetch: loadAgents,
    getAgentDisplayName,
    getDefaultAgent
  }
}
