"use client"

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

// ============================================================================
// Types
// ============================================================================

export interface AgentProfile {
  id: string
  user_id: string
  unique_link_code: string | null
  npm: string | null
  epicare_number: string | null
  first_name: string | null
  last_name: string | null
  photo_url: string | null
  status: 'active' | 'inactive' | 'pending' | null
  join_date: string | null
  created_at: string
  updated_at: string
  user?: {
    email: string
    phone: string | null
  }
}

export interface Appointment {
  id: string
  agent_profile_id: string
  client_id: string
  insurance_company_id: string
  start_date: string | null
  expiration_date: string | null
  status: 'active' | 'expired' | 'pending'
  notes: string | null
  created_at: string
  updated_at: string
  insurance_company?: {
    name: string
  }
  client?: {
    first_name: string | null
    last_name: string | null
    email: string
  }
}

export interface License {
  id: string
  agent_profile_id: string
  state: string
  license_number: string
  issue_date: string
  expiration_date: string | null
  status: 'active' | 'expired' | 'pending' | 'suspended'
  document_url: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface AgentClient {
  id: string
  agent_profile_id: string
  client_id: string
  assigned_at: string
  assigned_by: string | null
  notes: string | null
  client?: {
    id: string
    first_name: string | null
    last_name: string | null
    email: string
    phone: string | null
    created_at: string
  }
}

// ============================================================================
// Hook: useAgentProfile - Obtener perfil de agente por user_id
// ============================================================================

export function useAgentProfile(userId: string | null) {
  const [agent, setAgent] = useState<AgentProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAgent = useCallback(async () => {
    if (!userId) {
      setAgent(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/agents?user_id=${userId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al obtener perfil de agente')
      }

      // La API devuelve un array, tomamos el primero
      const agentProfile = data.data?.[0] || null
      setAgent(agentProfile)
    } catch (err) {
      console.error('Error fetching agent profile:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setAgent(null)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchAgent()
  }, [fetchAgent])

  return { agent, loading, error, refetch: fetchAgent }
}

// ============================================================================
// Hook: useUpdateAgentProfile - Actualizar perfil de agente
// ============================================================================

export function useUpdateAgentProfile() {
  const [updating, setUpdating] = useState(false)

  const updateAgent = async (agentId: string, updates: Partial<AgentProfile>) => {
    try {
      setUpdating(true)

      const response = await fetch(`/api/agents/${agentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al actualizar perfil de agente')
      }

      toast.success('Perfil de agente actualizado correctamente')
      return { success: true, data: data.data }
    } catch (err) {
      console.error('Error updating agent profile:', err)
      const errorMessage = err instanceof Error ? err.message : 'Error al actualizar perfil de agente'
      toast.error(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setUpdating(false)
    }
  }

  return { updateAgent, updating }
}

// ============================================================================
// Hook: useAppointments - Obtener appointments de un agente
// ============================================================================

export function useAppointments(agentProfileId: string | null) {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAppointments = useCallback(async () => {
    if (!agentProfileId) {
      setAppointments([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/appointments?agent_profile_id=${agentProfileId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al obtener appointments')
      }

      setAppointments(data.data || [])
    } catch (err) {
      console.error('Error fetching appointments:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setAppointments([])
    } finally {
      setLoading(false)
    }
  }, [agentProfileId])

  useEffect(() => {
    fetchAppointments()
  }, [fetchAppointments])

  return { appointments, loading, error, refetch: fetchAppointments }
}

// ============================================================================
// Hook: useCreateAppointment - Crear nuevo appointment
// ============================================================================

export function useCreateAppointment() {
  const [creating, setCreating] = useState(false)

  const createAppointment = async (appointmentData: {
    agent_profile_id: string
    client_id: string
    insurance_company_id: string
    start_date?: string
    expiration_date?: string
    status?: 'active' | 'expired' | 'pending'
    notes?: string
  }) => {
    try {
      setCreating(true)

      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(appointmentData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear appointment')
      }

      toast.success('Appointment creado correctamente')
      return { success: true, data: data.data }
    } catch (err) {
      console.error('Error creating appointment:', err)
      const errorMessage = err instanceof Error ? err.message : 'Error al crear appointment'
      toast.error(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setCreating(false)
    }
  }

  return { createAppointment, creating }
}

// ============================================================================
// Hook: useUpdateAppointment - Actualizar appointment
// ============================================================================

export function useUpdateAppointment() {
  const [updating, setUpdating] = useState(false)

  const updateAppointment = async (appointmentId: string, updates: Partial<Appointment>) => {
    try {
      setUpdating(true)

      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al actualizar appointment')
      }

      toast.success('Appointment actualizado correctamente')
      return { success: true, data: data.data }
    } catch (err) {
      console.error('Error updating appointment:', err)
      const errorMessage = err instanceof Error ? err.message : 'Error al actualizar appointment'
      toast.error(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setUpdating(false)
    }
  }

  return { updateAppointment, updating }
}

// ============================================================================
// Hook: useDeleteAppointment - Eliminar appointment
// ============================================================================

export function useDeleteAppointment() {
  const [deleting, setDeleting] = useState(false)

  const deleteAppointment = async (appointmentId: string) => {
    try {
      setDeleting(true)

      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al eliminar appointment')
      }

      toast.success('Appointment eliminado correctamente')
      return { success: true }
    } catch (err) {
      console.error('Error deleting appointment:', err)
      const errorMessage = err instanceof Error ? err.message : 'Error al eliminar appointment'
      toast.error(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setDeleting(false)
    }
  }

  return { deleteAppointment, deleting }
}

// ============================================================================
// Hook: useLicenses - Obtener licenses de un agente
// ============================================================================

export function useLicenses(agentProfileId: string | null) {
  const [licenses, setLicenses] = useState<License[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLicenses = useCallback(async () => {
    if (!agentProfileId) {
      setLicenses([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/licenses?agent_profile_id=${agentProfileId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al obtener licenses')
      }

      setLicenses(data.data || [])
    } catch (err) {
      console.error('Error fetching licenses:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setLicenses([])
    } finally {
      setLoading(false)
    }
  }, [agentProfileId])

  useEffect(() => {
    fetchLicenses()
  }, [fetchLicenses])

  return { licenses, loading, error, refetch: fetchLicenses }
}

// ============================================================================
// Hook: useCreateLicense - Crear nueva license
// ============================================================================

export function useCreateLicense() {
  const [creating, setCreating] = useState(false)

  const createLicense = async (licenseData: {
    agent_profile_id: string
    state: string
    license_number: string
    issue_date: string
    expiration_date?: string
    status?: 'active' | 'expired' | 'pending' | 'suspended'
    notes?: string
  }) => {
    try {
      setCreating(true)

      const response = await fetch('/api/licenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(licenseData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear license')
      }

      toast.success('Licencia creada correctamente')
      return { success: true, data: data.data }
    } catch (err) {
      console.error('Error creating license:', err)
      const errorMessage = err instanceof Error ? err.message : 'Error al crear licencia'
      toast.error(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setCreating(false)
    }
  }

  return { createLicense, creating }
}

// ============================================================================
// Hook: useUpdateLicense - Actualizar license
// ============================================================================

export function useUpdateLicense() {
  const [updating, setUpdating] = useState(false)

  const updateLicense = async (licenseId: string, updates: Partial<License>) => {
    try {
      setUpdating(true)

      const response = await fetch(`/api/licenses/${licenseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al actualizar license')
      }

      toast.success('Licencia actualizada correctamente')
      return { success: true, data: data.data }
    } catch (err) {
      console.error('Error updating license:', err)
      const errorMessage = err instanceof Error ? err.message : 'Error al actualizar licencia'
      toast.error(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setUpdating(false)
    }
  }

  return { updateLicense, updating }
}

// ============================================================================
// Hook: useDeleteLicense - Eliminar license
// ============================================================================

export function useDeleteLicense() {
  const [deleting, setDeleting] = useState(false)

  const deleteLicense = async (licenseId: string) => {
    try {
      setDeleting(true)

      const response = await fetch(`/api/licenses/${licenseId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al eliminar license')
      }

      toast.success('Licencia eliminada correctamente')
      return { success: true }
    } catch (err) {
      console.error('Error deleting license:', err)
      const errorMessage = err instanceof Error ? err.message : 'Error al eliminar licencia'
      toast.error(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setDeleting(false)
    }
  }

  return { deleteLicense, deleting }
}

// ============================================================================
// Hook: useUploadLicenseDocument - Subir documento de license
// ============================================================================

export function useUploadLicenseDocument() {
  const [uploading, setUploading] = useState(false)

  const uploadDocument = async (licenseId: string, file: File) => {
    try {
      setUploading(true)

      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`/api/licenses/${licenseId}/upload`, {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al subir documento')
      }

      toast.success('Documento subido correctamente')
      return { success: true, data: data.data }
    } catch (err) {
      console.error('Error uploading license document:', err)
      const errorMessage = err instanceof Error ? err.message : 'Error al subir documento'
      toast.error(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setUploading(false)
    }
  }

  return { uploadDocument, uploading }
}

// ============================================================================
// Hook: useAgentClients - Obtener clientes asignados a un agente
// ============================================================================

export function useAgentClients(agentProfileId: string | null) {
  const [clients, setClients] = useState<AgentClient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchClients = useCallback(async () => {
    if (!agentProfileId) {
      setClients([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      console.log('🔍 useAgentClients: Fetching clients for agentProfileId:', agentProfileId)
      const response = await fetch(`/api/agent-clients?agent_profile_id=${agentProfileId}`)
      const data = await response.json()

      console.log('🔍 useAgentClients: Response:', {
        ok: response.ok,
        status: response.status,
        dataLength: data.data?.length || 0,
        data: data.data?.map((c: any) => ({
          id: c.id,
          client_id: c.client_id,
          client_email: c.client?.email,
          is_primary: c.is_primary,
          source: c.source
        }))
      })

      if (!response.ok) {
        throw new Error(data.error || 'Error al obtener clientes')
      }

      setClients(data.data || [])
    } catch (err) {
      console.error('Error fetching agent clients:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setClients([])
    } finally {
      setLoading(false)
    }
  }, [agentProfileId])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  return { clients, loading, error, refetch: fetchClients }
}

// ============================================================================
// Hook: useAssignClient - Asignar cliente a agente
// ============================================================================

export function useAssignClient() {
  const [assigning, setAssigning] = useState(false)

  const assignClient = async (agentProfileId: string, clientId: string, notes?: string) => {
    try {
      setAssigning(true)

      const response = await fetch('/api/agent-clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent_profile_id: agentProfileId,
          client_id: clientId,
          notes,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al asignar cliente')
      }

      toast.success('Cliente asignado correctamente')
      return { success: true, data: data.data }
    } catch (err) {
      console.error('Error assigning client:', err)
      const errorMessage = err instanceof Error ? err.message : 'Error al asignar cliente'
      toast.error(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setAssigning(false)
    }
  }

  return { assignClient, assigning }
}

// ============================================================================
// Hook: useUnassignClient - Desasignar cliente de agente
// ============================================================================

export function useUnassignClient() {
  const [unassigning, setUnassigning] = useState(false)

  const unassignClient = async (agentProfileId: string, clientId: string) => {
    try {
      setUnassigning(true)

      const response = await fetch(
        `/api/agent-clients?agent_profile_id=${agentProfileId}&client_id=${clientId}`,
        {
          method: 'DELETE',
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al desasignar cliente')
      }

      toast.success('Cliente desasignado correctamente')
      return { success: true }
    } catch (err) {
      console.error('Error unassigning client:', err)
      const errorMessage = err instanceof Error ? err.message : 'Error al desasignar cliente'
      toast.error(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setUnassigning(false)
    }
  }

  return { unassignClient, unassigning }
}

// ============================================================================
// Hook: useAgentStats - Obtener estadísticas de un agente
// ============================================================================

export function useAgentStats(agentProfileId: string | null) {
  const [stats, setStats] = useState({
    totalClients: 0,
    totalAppointments: 0,
    activeLicenses: 0,
    totalSales: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!agentProfileId) {
      setLoading(false)
      return
    }

    const fetchStats = async () => {
      try {
        setLoading(true)
        const supabase = createClient()

        // Total clientes
        const { count: clientsCount } = await supabase
          .from('agent_clients')
          .select('*', { count: 'exact', head: true })
          .eq('agent_profile_id', agentProfileId)

        // Total appointments
        const { count: appointmentsCount } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('agent_profile_id', agentProfileId)

        // Licencias activas
        const { count: licensesCount } = await supabase
          .from('licenses')
          .select('*', { count: 'exact', head: true })
          .eq('agent_profile_id', agentProfileId)
          .eq('status', 'active')

        // Total ventas (applications con este agente)
        const { count: salesCount } = await supabase
          .from('applications')
          .select('*', { count: 'exact', head: true })
          .eq('assigned_agent_id', agentProfileId)

        setStats({
          totalClients: clientsCount || 0,
          totalAppointments: appointmentsCount || 0,
          activeLicenses: licensesCount || 0,
          totalSales: salesCount || 0,
        })
      } catch (err) {
        console.error('Error fetching agent stats:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [agentProfileId])

  return { stats, loading }
}

