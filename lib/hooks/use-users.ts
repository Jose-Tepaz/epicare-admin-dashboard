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
  const { user, loading: authLoading } = useAdminAuth()
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

    try {
      setLoading(true)
      setError(null)
      const supabase = createClient()

      console.log('🔄 Fetching users with filters:', { roleKey, search: filters.search, page: pagination.page })

      // Obtener usuarios
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

      const { data: usersData, error: fetchError, count } = await query

      if (fetchError) {
        console.error('❌ Supabase query error:', fetchError)
        throw fetchError
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
    filters.role,
    pagination.page,
    pagination.pageSize
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

      // Obtener usuario (✅ role ya viene en el select '*')
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (userError) throw userError

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

      setUser({
        ...userData,
        // ✅ Convertir role string a array para compatibilidad
        roles: userData.role ? [{ 
          id: userData.role, 
          name: userData.role, 
          description: null 
        }] : [],
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
      toast.error('Error al asignar el rol')
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

