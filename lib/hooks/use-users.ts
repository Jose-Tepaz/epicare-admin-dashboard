"use client"

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UserFilters, PaginationParams, AdminUser } from '@/lib/types/admin'
import { useAdminAuth } from '@/contexts/admin-auth-context'
import { toast } from 'sonner'

export interface UserWithStats {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  created_at: string
  profile_completed: boolean | null
  password_set: boolean | null
  roles: Array<{
    id: string
    name: string
    description: string | null
  }>
  application_count: number
}

export function useUsers(
  filters: UserFilters = {},
  pagination: PaginationParams = { page: 1, pageSize: 25 }
) {
  const { user, loading: authLoading, isAgent, agentId, activeRole } = useAdminAuth()
  const [users, setUsers] = useState<UserWithStats[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Serializar role array para dependencia estable
  const roleKey = useMemo(() => {
    return filters.role?.slice().sort().join(',') || ''
  }, [filters.role])

  const fetchUsers = useCallback(async () => {
    // Esperar a que la autenticación esté lista
    if (authLoading || !user) {
      return
    }

    // Si es agente pero agentId aún no está disponible, esperar un poco más
    // Esto maneja el race condition donde el contexto aún está cargando agentId
    const isActuallyAgent = activeRole === 'agent'
    
    try {
      setLoading(true)
      setError(null)
      const supabase = createClient()

      console.log('🔄 Fetching users with filters:', { 
        roleKey, 
        search: filters.search, 
        page: pagination.page, 
        isAgent, 
        agentId,
        activeRole,
        isActuallyAgent
      })

      let usersData: any[] = []
      let count = 0

      // Si el usuario actual es un agente, incluir también clientes secundarios de agent_clients
      // Usar activeRole para detectar si es agente (más confiable que isAgent durante carga inicial)
      console.log('🔍 Checking agent condition:', { isAgent, agentId, activeRole, isActuallyAgent, user: user?.id })
      
      // Si es agente pero agentId no está disponible aún, obtenerlo ahora
      let finalAgentId = agentId
      if (isActuallyAgent && !finalAgentId) {
        console.log('⚠️ Agent detected but agentId not available, fetching it now...')
        const { data: agentProfile } = await supabase
          .from('agent_profiles')
          .select('id')
          .eq('user_id', user.id)
          .single()
        
        if (agentProfile) {
          finalAgentId = agentProfile.id
          console.log('✅ Agent ID fetched:', finalAgentId)
        }
      }
      
      if (isActuallyAgent && finalAgentId) {
        console.log('✅ Agent viewing users - using API endpoint to bypass RLS', { agentId: finalAgentId })
        
        // Usar el endpoint de API que bypass RLS en lugar de queries directas
        try {
          const response = await fetch(`/api/agent-clients?agent_profile_id=${finalAgentId}`)
          if (!response.ok) {
            throw new Error(`API error: ${response.statusText}`)
          }
          
          const apiData = await response.json()
          console.log('🔍 API response:', apiData)
          
          if (apiData.data && Array.isArray(apiData.data)) {
            // El endpoint devuelve relaciones con datos del cliente dentro de relation.client
            // Extraer los datos de los clientes y eliminar duplicados
            const clientMap = new Map<string, any>()
            
            apiData.data.forEach((relation: any) => {
              if (relation.client) {
                const clientId = relation.client.id
                if (!clientMap.has(clientId)) {
                  clientMap.set(clientId, {
                    id: relation.client.id,
                    email: relation.client.email,
                    first_name: relation.client.first_name,
                    last_name: relation.client.last_name,
                    phone: relation.client.phone,
                    role: 'client',
                    created_at: relation.client.created_at,
                    profile_completed: relation.client.profile_completed,
                    password_set: relation.client.password_set,
                  })
                }
              }
            })
            
            usersData = Array.from(clientMap.values())
            
            console.log('✅ Clients from API:', usersData.length, usersData.map((u: any) => ({ id: u.id, email: u.email })))
            
            // Aplicar filtros de fecha y búsqueda
            let filteredClients = usersData

            if (filters.startDate) {
              filteredClients = filteredClients.filter((c: any) => 
                new Date(c.created_at) >= new Date(filters.startDate!)
              )
            }

            if (filters.endDate) {
              filteredClients = filteredClients.filter((c: any) => 
                new Date(c.created_at) <= new Date(filters.endDate!)
              )
            }

            if (filters.search) {
              const searchLower = filters.search.toLowerCase()
              filteredClients = filteredClients.filter((c: any) => 
                c.email?.toLowerCase().includes(searchLower) ||
                c.first_name?.toLowerCase().includes(searchLower) ||
                c.last_name?.toLowerCase().includes(searchLower)
              )
            }

            console.log('✅ Filtered clients AFTER filters:', { 
              total: filteredClients.length,
              clientEmails: filteredClients.map((u: any) => u.email)
            })

            usersData = filteredClients
            count = filteredClients.length
          } else {
            console.warn('⚠️ API response format unexpected:', apiData)
            usersData = []
            count = 0
          }
        } catch (apiError) {
          console.error('❌ Error fetching clients from API:', apiError)
          // Fallback a query normal si el API falla
          throw apiError
        }
      } else {
        // Para admins o usuarios no-agentes, usar query normal
        let query = supabase
          .from('users')
          .select(`
            id,
            email,
            first_name,
            last_name,
            phone,
            role,
            created_at,
            profile_completed,
            password_set
          `, { count: 'exact' })

        // Aplicar filtros de fecha
        if (filters.startDate) {
          query = query.gte('created_at', filters.startDate)
        }

        if (filters.endDate) {
          query = query.lte('created_at', filters.endDate)
        }

        if (filters.search) {
          query = query.or(`email.ilike.%${filters.search}%,first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%`)
        }

        // Ordenar y paginar
        const from = (pagination.page - 1) * pagination.pageSize
        const to = from + pagination.pageSize - 1

        query = query
          .order('created_at', { ascending: false })
          .range(from, to)

        const { data: queryData, error: fetchError, count: queryCount } = await query

        if (fetchError) {
          console.error('❌ Supabase query error:', fetchError)
          throw fetchError
        }

        usersData = queryData || []
        count = queryCount || 0
      }

      // Ordenar por fecha de creación (más recientes primero) si es agente
      if (isAgent && agentId) {
        usersData.sort((a: any, b: any) => {
          const dateA = new Date(a.created_at).getTime()
          const dateB = new Date(b.created_at).getTime()
          return dateB - dateA
        })

        // Aplicar paginación manualmente
        const from = (pagination.page - 1) * pagination.pageSize
        const to = from + pagination.pageSize
        usersData = usersData.slice(from, to)
      }

      console.log('✅ Users fetched:', usersData?.length || 0, 'users')

      // Para cada usuario, obtener count de applications
      // ✅ Ahora usamos users.role directamente (ya viene en la query)
      const usersWithDetails = await Promise.all(
        (usersData || []).map(async (user: any) => {
          try {
            // Obtener count de applications
            const { count: appCount } = await supabase
              .from('applications')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', user.id)

            return {
              ...user,
              // Convertir role string a formato de array para compatibilidad con código existente
              roles: user.role ? [{ 
                id: user.role, 
                name: user.role, 
                description: null 
              }] : [],
              application_count: appCount || 0,
            }
          } catch (err) {
            console.error(`Error fetching details for user ${user.id}:`, err)
            return {
              ...user,
              roles: user.role ? [{ 
                id: user.role, 
                name: user.role, 
                description: null 
              }] : [],
              application_count: 0,
            }
          }
        })
      )

      // Filtrar por rol si es necesario
      let filteredUsers = usersWithDetails
      if (filters.role && filters.role.length > 0) {
        filteredUsers = usersWithDetails.filter(user => 
          user.roles.some((role: { name: string }) => filters.role!.includes(role.name))
        )
        // Actualizar count si se aplicó filtro de rol
        if (isActuallyAgent && finalAgentId) {
          count = filteredUsers.length
        }
      }

      console.log('✅ Setting users:', filteredUsers.length)
      setUsers(filteredUsers)
      setTotal(count || 0)
    } catch (err) {
      console.error('❌ Error fetching users:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setUsers([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [
    authLoading,
    user,
    roleKey,
    filters.search,
    filters.startDate,
    filters.endDate,
    pagination.page,
    pagination.pageSize,
    isAgent,
    agentId,
    activeRole, // Agregar para detectar cuando el rol cambia
  ])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  return {
    users,
    total,
    loading,
    error,
    refetch: fetchUsers,
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages: Math.ceil(total / pagination.pageSize),
    },
  }
}

/**
 * Hook para obtener un usuario por ID con todas sus relaciones
 */
export function useUserDetails(userId: string | null) {
  const [user, setUser] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (userId) {
      fetchUserDetails()
    }
  }, [userId])

  const fetchUserDetails = async () => {
    if (!userId) return

    try {
      setLoading(true)
      setError(null)
      const supabase = createClient()

      // Obtener usuario desde la vista users_with_role_switching que tiene toda la información de roles
      const { data: userViewData, error: viewError } = await supabase
        .from('users_with_role_switching')
        .select('*')
        .eq('id', userId)
        .single()

      if (viewError) throw viewError

      // También obtener los datos completos del usuario desde users para tener todos los campos
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (userError) throw userError

      // Obtener los user_roles con sus IDs para poder eliminarlos
      const { data: userRolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select(`
          id,
          role_id,
          roles:role_id (
            id,
            name,
            description
          )
        `)
        .eq('user_id', userId)

      // Obtener applications
      const { data: applications } = await supabase
        .from('applications')
        .select(`
          id,
          status,
          created_at,
          insurance_companies:insurance_company_id (
            name
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      // Construir el array de roles usando la información de la vista
      const primaryRoleName = (userViewData.primary_role || userData.role || '').trim()
      const primaryRoleNameLower = primaryRoleName.toLowerCase()
      
      // available_roles puede venir como array de PostgreSQL, asegurarse de que sea un array
      let availableRoles: string[] = []
      if (userViewData.available_roles) {
        if (Array.isArray(userViewData.available_roles)) {
          // Filtrar valores null/undefined y convertir a string
          availableRoles = userViewData.available_roles
            .filter((r: any): r is string => r != null && typeof r === 'string')
            .map((r: string) => r.trim())
            .filter((r: string) => r.length > 0)
        } else if (typeof userViewData.available_roles === 'string') {
          // Si viene como string, intentar parsearlo
          try {
            const parsed = JSON.parse(userViewData.available_roles)
            if (Array.isArray(parsed)) {
              availableRoles = parsed
                .filter((r: any): r is string => r != null && typeof r === 'string')
                .map((r: string) => r.trim())
                .filter((r: string) => r.length > 0)
            } else {
              availableRoles = [userViewData.available_roles.trim()].filter(r => r.length > 0)
            }
          } catch {
            availableRoles = [userViewData.available_roles.trim()].filter(r => r.length > 0)
          }
        }
      }
      
      // Si no hay available_roles, usar solo el rol principal
      if (availableRoles.length === 0 && primaryRoleName) {
        availableRoles = [primaryRoleName]
      }
      
      // Asegurarse de que el rol principal esté en available_roles
      // Validar que primaryRoleName no sea vacío antes de comparar
      if (primaryRoleName && primaryRoleNameLower && !availableRoles.some(r => r && r.toLowerCase() === primaryRoleNameLower)) {
        availableRoles.unshift(primaryRoleName) // Agregar al inicio
      }

      const allRoles: any[] = []

      // Crear un mapa de user_role_id por nombre de rol para poder eliminar roles adicionales
      const roleIdMap = new Map<string, string>()
      if (userRolesData && !rolesError) {
        userRolesData.forEach((ur: any) => {
          if (ur.roles && ur.roles.name && typeof ur.roles.name === 'string') {
            const roleName = ur.roles.name.trim()
            if (roleName.length > 0) {
              roleIdMap.set(roleName.toLowerCase(), ur.id)
            }
          }
        })
      }

      // Procesar cada rol disponible
      availableRoles.forEach((roleName: string) => {
        // Validar que roleName no sea null/undefined antes de procesar
        if (!roleName || typeof roleName !== 'string') {
          return // Saltar este rol si no es válido
        }
        
        const roleNameTrimmed = roleName.trim()
        if (roleNameTrimmed.length === 0) {
          return // Saltar si está vacío después de trim
        }
        
        const roleNameLower = roleNameTrimmed.toLowerCase()
        const isPrimary = roleNameLower === primaryRoleNameLower
        const userRoleId = roleIdMap.get(roleNameLower)

        if (isPrimary) {
          // Es el rol principal (viene de users.role)
          allRoles.push({
            id: `primary-${primaryRoleNameLower}`,
            name: primaryRoleName, // Usar el nombre exacto del primary_role
            description: null,
            is_primary: true,
            user_role_id: null, // El rol principal NO tiene user_role_id
            primary_role: true,
            from_users_table: true
          })
        } else {
          // Es un rol adicional (viene de user_roles)
          allRoles.push({
            id: userRoleId || `role-${roleNameLower}`,
            name: roleNameTrimmed,
            description: null,
            is_primary: false,
            primary_role: false,
            from_users_table: false,
            user_role_id: userRoleId || undefined // Los roles adicionales SÍ tienen user_role_id
          })
        }
      })

      // Asegurarse de que el rol principal siempre esté primero
      const sortedRoles = allRoles.sort((a, b) => {
        if (a.is_primary && !b.is_primary) return -1
        if (!a.is_primary && b.is_primary) return 1
        return a.name.localeCompare(b.name)
      })
      
      // Log para debugging (remover en producción si es necesario)
      console.log('🔍 User roles debug:', {
        primaryRoleName,
        availableRoles,
        sortedRoles: sortedRoles.map(r => ({ name: r.name, is_primary: r.is_primary, user_role_id: r.user_role_id }))
      })

      setUser({
        ...userData,
        roles: sortedRoles,
        applications: applications || [],
      })
    } catch (err) {
      console.error('Error fetching user details:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  return { user, loading, error, refetch: fetchUserDetails }
}

/**
 * Hook para asignar un rol a un usuario (solo admin)
 */
export function useAssignRole() {
  const [assigning, setAssigning] = useState(false)

  const assignRole = async (userId: string, roleId: string) => {
    try {
      setAssigning(true)
      const supabase = createClient()

      // Obtener el nombre del rol para determinar si usar la API especial
      const { data: roleData, error: roleError } = await supabase
        .from('roles')
        .select('id, name')
        .eq('id', roleId)
        .single()

      if (roleError || !roleData) {
        toast.error('Error al obtener información del rol')
        return false
      }

      const roleName = roleData.name

      // Si el rol es 'agent', usar la API route especial que maneja agent_profile
      if (roleName === 'agent') {
        const response = await fetch(`/api/users/${userId}/assign-role`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ roleId }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Error al asignar el rol')
        }

        toast.success(data.message || 'Rol asignado correctamente')
        if (data.warning) {
          toast.warning(data.warning)
        }
        return true
      }

      // Para otros roles, usar la lógica anterior (insertar directamente)
      // Verificar si el usuario ya tiene ese rol
      const { data: existing } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .eq('role_id', roleId)
        .single()

      if (existing) {
        toast.error('El usuario ya tiene este rol')
        return false
      }

      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role_id: roleId })

      if (error) throw error

      toast.success('Rol asignado correctamente')
      return true
    } catch (err) {
      console.error('Error assigning role:', err)
      const errorMessage = err instanceof Error ? err.message : 'Error al asignar el rol'
      toast.error(errorMessage)
      return false
    } finally {
      setAssigning(false)
    }
  }

  return { assignRole, assigning }
}

/**
 * Hook para remover un rol de un usuario (solo admin)
 */
export function useRemoveRole() {
  const [removing, setRemoving] = useState(false)

  const removeRole = async (userRoleId: string) => {
    try {
      setRemoving(true)
      const supabase = createClient()

      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', userRoleId)

      if (error) throw error

      toast.success('Rol removido correctamente')
      return true
    } catch (err) {
      console.error('Error removing role:', err)
      toast.error('Error al remover el rol')
      return false
    } finally {
      setRemoving(false)
    }
  }

  return { removeRole, removing }
}

/**
 * Hook para actualizar información de un usuario (solo admin)
 */
export function useUpdateUser() {
  const [updating, setUpdating] = useState(false)

  const updateUser = async (userId: string, updates: Partial<{
    first_name: string
    last_name: string
    phone: string
  }>) => {
    try {
      setUpdating(true)
      const supabase = createClient()

      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)

      if (error) throw error

      toast.success('Usuario actualizado correctamente')
      return true
    } catch (err) {
      console.error('Error updating user:', err)
      toast.error('Error al actualizar el usuario')
      return false
    } finally {
      setUpdating(false)
    }
  }

  return { updateUser, updating }
}

/**
 * Hook para crear un nuevo usuario (solo admin)
 */
export function useCreateUser() {
  const [creating, setCreating] = useState(false)

  const createUser = async (userData: {
    email: string
    first_name: string
    last_name: string
    phone?: string
    address?: string
    state?: string
    city?: string
    zipcode?: string
    role: string // ✅ Ahora espera el nombre del rol directamente
    agent_profile_id?: string // ID del agente a asignar (opcional)
    unique_link_code?: string // Link único del agente (opcional)
    npn?: string // NPN (opcional)
    epicare_number?: string // Epicare Number (opcional)
  }) => {
    try {
      setCreating(true)
      
      const response = await fetch('/api/users/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear el usuario')
      }

      toast.success('Usuario creado correctamente')
      return { success: true, user: data.user }
    } catch (err) {
      console.error('Error creating user:', err)
      const errorMessage = err instanceof Error ? err.message : 'Error al crear el usuario'
      toast.error(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setCreating(false)
    }
  }

  return { createUser, creating }
}

/**
 * Hook para obtener todos los roles disponibles
 */
export function useAvailableRoles() {
  const [roles, setRoles] = useState<Array<{ id: string; name: string; description: string | null }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRoles()
  }, [])

  const fetchRoles = async () => {
    try {
      setLoading(true)
      const supabase = createClient()

      const { data, error } = await supabase
        .from('roles')
        .select('id, name, description')
        .order('name')

      if (error) throw error

      setRoles(data || [])
    } catch (err) {
      console.error('Error fetching roles:', err)
    } finally {
      setLoading(false)
    }
  }

  return { roles, loading, refetch: fetchRoles }
}

/**
 * Hook para obtener estadísticas de usuarios
 */
export function useUsersStats() {
  const [stats, setStats] = useState({
    total: 0,
    newThisMonth: 0,
    withApplications: 0,
    admins: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const supabase = createClient()

      // Total users
      const { count: total } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })

      // New this month
      const firstDayOfMonth = new Date()
      firstDayOfMonth.setDate(1)
      firstDayOfMonth.setHours(0, 0, 0, 0)

      const { count: newThisMonth } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', firstDayOfMonth.toISOString())

      // Users with applications
      const { data: usersWithApps } = await supabase
        .from('applications')
        .select('user_id')

      const uniqueUsersWithApps = new Set(usersWithApps?.map((a: any) => a.user_id) || [])

      // Admin users
      const { data: adminRoles } = await supabase
        .from('user_roles')
        .select('user_id, roles:role_id(name)')
      
      const adminUsers = adminRoles?.filter((ur: any) => 
        ['admin', 'support_staff'].includes(ur.roles?.name)
      ) || []

      setStats({
        total: total || 0,
        newThisMonth: newThisMonth || 0,
        withApplications: uniqueUsersWithApps.size,
        admins: new Set(adminUsers.map(u => u.user_id)).size,
      })
    } catch (err) {
      console.error('Error fetching users stats:', err)
    } finally {
      setLoading(false)
    }
  }

  return { stats, loading, refetch: fetchStats }
}

/**
 * Hook para eliminar un usuario (solo admin)
 */
export function useDeleteUser() {
  const [deleting, setDeleting] = useState(false)

  const deleteUser = async (userId: string) => {
    try {
      setDeleting(true)
      
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al eliminar el usuario')
      }

      toast.success('Usuario eliminado correctamente')
      return { success: true }
    } catch (err) {
      console.error('Error deleting user:', err)
      const errorMessage = err instanceof Error ? err.message : 'Error al eliminar el usuario'
      toast.error(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setDeleting(false)
    }
  }

  return { deleteUser, deleting }
}

/**
 * Hook para reenviar invitación a un usuario (solo admin)
 */
export function useResendInvite() {
  const [resending, setResending] = useState(false)

  const resendInvite = async (userId: string) => {
    try {
      setResending(true)
      
      const response = await fetch('/api/users/resend-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al reenviar la invitación')
      }

      // Si hay actionLink, mostrar modal con el link
      if (data.actionLink) {
        console.log('🔗 Action link disponible:', data.actionLink)
        toast.success('Link de invitación generado', {
          description: data.note || 'El link está disponible para copiar',
          duration: 5000
        })
        return { success: true, actionLink: data.actionLink, emailSent: data.emailSent }
      }

      // Si no hay actionLink, el email se envió automáticamente
      toast.success(data.message || 'Invitación reenviada correctamente')
      return { success: true, emailSent: true }
    } catch (err) {
      console.error('Error resending invite:', err)
      const errorMessage = err instanceof Error ? err.message : 'Error al reenviar la invitación'
      toast.error(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setResending(false)
    }
  }

  return { resendInvite, resending }
}

