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
      
      // Obtener agent_profiles directamente (evita problemas con RLS en JOIN)
      const { data: profilesData, error: profilesError } = await supabase
        .from('agent_profiles')
        .select('id, business_name, user_id, is_active, is_default, email, phone')
        .eq('is_active', true)
        .order('business_name', { nullsFirst: false })

      if (profilesError) {
        console.error('Error obteniendo agent_profiles:', profilesError)
        throw new Error(`Error al cargar perfiles de agentes: ${profilesError.message || JSON.stringify(profilesError)}`)
      }

      if (!profilesData || profilesData.length === 0) {
        setAgents([])
        return
      }

      // Obtener los datos de usuarios por separado
      const userIds = profilesData
        .map(p => p.user_id)
        .filter((id): id is string => Boolean(id))
      
      let usersData: Array<{ id: string; first_name: string | null; last_name: string | null; email: string }> = []
      
      if (userIds.length > 0) {
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('id, first_name, last_name, email')
          .in('id', userIds)

        if (usersError) {
          console.warn('Error obteniendo usuarios (continuando sin datos de usuario):', usersError)
          // Continuamos sin los datos de usuario, usaremos los datos del perfil
        } else {
          usersData = users || []
        }
      }

      // Combinar los datos
      const combinedData: Agent[] = profilesData.map(profile => {
        const user = usersData.find(u => u.id === profile.user_id)
        return {
          ...profile,
          users: user ? {
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            email: user.email || profile.email || ''
          } : {
            first_name: '',
            last_name: '',
            email: profile.email || ''
          }
        }
      })

      setAgents(combinedData)
    } catch (err) {
      console.error('Error loading agents:', err)
      let errorMessage = 'Error al cargar agentes'
      
      if (err instanceof Error) {
        errorMessage = err.message
      } else if (err && typeof err === 'object') {
        if ('message' in err) {
          errorMessage = String(err.message)
        } else if ('code' in err) {
          errorMessage = `Error ${err.code}: ${JSON.stringify(err)}`
        } else {
          errorMessage = `Error desconocido: ${JSON.stringify(err)}`
        }
      }
      
      setError(errorMessage)
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
