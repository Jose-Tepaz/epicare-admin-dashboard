"use client"

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AdminStats } from '@/lib/types/admin'
import { useAdminAuth } from '@/contexts/admin-auth-context'

export function useAdminStats() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user, loading: authLoading, isAgent, agentId, isSupportStaff, userScope, assignedAgentId } = useAdminAuth()

  useEffect(() => {
    // Esperar a que la autenticación esté lista antes de hacer queries
    if (authLoading || !user) {
      return
    }
    fetchStats()
  }, [authLoading, user, isAgent, agentId, isSupportStaff, userScope, assignedAgentId])

  const fetchStats = async () => {
    try {
      setLoading(true)
      setError(null)
      const supabase = createClient()

      // Obtener fecha del inicio del mes actual
      const now = new Date()
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      // Construir filtros según rol y scope
      // Las RLS policies ya filtran automáticamente, pero agregamos filtros explícitos para optimización
      let agentFilter: any = {}
      
      if (isAgent && agentId) {
        // Agent: solo sus applications
        agentFilter = { agent_id: agentId }
      } else if (isSupportStaff && userScope === 'agent_specific' && assignedAgentId) {
        // Support staff con scope: solo del agent asignado
        agentFilter = { agent_id: assignedAgentId }
      }

      // 1. Total de applications (filtradas por RLS + agentFilter)
      let totalAppsQuery = supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
      
      if (Object.keys(agentFilter).length > 0) {
        totalAppsQuery = totalAppsQuery.match(agentFilter)
      }
      
      const { count: totalApplications, error: totalAppsError } = await totalAppsQuery
      if (totalAppsError) throw totalAppsError

      // 2. Usuarios activos (con al menos una application)
      let activeUsersQuery = supabase
        .from('applications')
        .select('user_id')
      
      if (Object.keys(agentFilter).length > 0) {
        activeUsersQuery = activeUsersQuery.match(agentFilter)
      }
        
      const { data: activeUsersData, error: activeUsersError } = await activeUsersQuery
      if (activeUsersError) throw activeUsersError

      const uniqueUsers = new Set(activeUsersData?.map((app: any) => app.user_id))
      const activeUsers = uniqueUsers.size

      // 3. Applications este mes
      let monthAppsQuery = supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', firstDayOfMonth.toISOString())
      
      if (Object.keys(agentFilter).length > 0) {
        monthAppsQuery = monthAppsQuery.match(agentFilter)
      }

      const { count: applicationsThisMonth, error: monthAppsError } = await monthAppsQuery
      if (monthAppsError) throw monthAppsError

      // 4. Nuevos usuarios este mes (filtrados por agent_id si aplica)
      let newUsersQuery = supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', firstDayOfMonth.toISOString())
      
      if (isAgent && agentId) {
        newUsersQuery = newUsersQuery.eq('agent_id', agentId)
      } else if (isSupportStaff && userScope === 'agent_specific' && assignedAgentId) {
        newUsersQuery = newUsersQuery.eq('agent_id', assignedAgentId)
      }

      const { count: newUsersThisMonth, error: newUsersError } = await newUsersQuery
      if (newUsersError) throw newUsersError

      // 5. Applications pendientes
      let pendingQuery = supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .in('status', ['submitted', 'pending_approval'])
      
      if (Object.keys(agentFilter).length > 0) {
        pendingQuery = pendingQuery.match(agentFilter)
      }

      const { count: pendingApplications, error: pendingError } = await pendingQuery
      if (pendingError) throw pendingError

      // 6. Applications aprobadas
      let approvedQuery = supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .in('status', ['approved', 'active'])
      
      if (Object.keys(agentFilter).length > 0) {
        approvedQuery = approvedQuery.match(agentFilter)
      }

      const { count: approvedApplications, error: approvedError } = await approvedQuery
      if (approvedError) throw approvedError

      // 7. Applications rechazadas
      let rejectedQuery = supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'rejected')
      
      if (Object.keys(agentFilter).length > 0) {
        rejectedQuery = rejectedQuery.match(agentFilter)
      }

      const { count: rejectedApplications, error: rejectedError } = await rejectedQuery
      if (rejectedError) throw rejectedError

      setStats({
        totalApplications: totalApplications || 0,
        activeUsers: activeUsers || 0,
        applicationsThisMonth: applicationsThisMonth || 0,
        newUsersThisMonth: newUsersThisMonth || 0,
        pendingApplications: pendingApplications || 0,
        approvedApplications: approvedApplications || 0,
        rejectedApplications: rejectedApplications || 0,
      })
    } catch (err) {
      console.error('Error fetching admin stats:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  return { stats, loading, error, refetch: fetchStats }
}

/**
 * Hook para obtener datos de gráficos del dashboard
 */
export function useAdminChartData() {
  const [monthlyData, setMonthlyData] = useState<any[]>([])
  const [statusData, setStatusData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { isAgent, agentId, isSupportStaff, userScope, assignedAgentId } = useAdminAuth()

  useEffect(() => {
    fetchChartData()
  }, [isAgent, agentId, isSupportStaff, userScope, assignedAgentId])

  const fetchChartData = async () => {
    try {
      setLoading(true)
      setError(null)
      const supabase = createClient()

      // Obtener applications de los últimos 6 meses
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

      // Construir query con filtros según rol
      let query = supabase
        .from('applications')
        .select('id, status, created_at')
        .gte('created_at', sixMonthsAgo.toISOString())
        .order('created_at', { ascending: true })

      // Agregar filtros según rol y scope
      if (isAgent && agentId) {
        query = query.eq('agent_id', agentId)
      } else if (isSupportStaff && userScope === 'agent_specific' && assignedAgentId) {
        query = query.eq('agent_id', assignedAgentId)
      }

      const { data: applications, error: appsError } = await query
      if (appsError) throw appsError

      // Agrupar por mes
      const monthlyMap = new Map<string, { month: string; total: number; approved: number }>()
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

      applications?.forEach((app: any) => {
        const date = new Date(app.created_at)
        const monthKey = `${months[date.getMonth()]} ${date.getFullYear()}`
        
        if (!monthlyMap.has(monthKey)) {
          monthlyMap.set(monthKey, { month: months[date.getMonth()], total: 0, approved: 0 })
        }
        
        const monthData = monthlyMap.get(monthKey)!
        monthData.total++
        if (app.status === 'approved' || app.status === 'active') {
          monthData.approved++
        }
      })

      setMonthlyData(Array.from(monthlyMap.values()).slice(-6))

      // Calcular distribución de status - mostrar todos los estados individuales
      const statusMap = new Map<string, number>()
      applications?.forEach((app: any) => {
        const count = statusMap.get(app.status) || 0
        statusMap.set(app.status, count + 1)
      })

      const total = applications?.length || 1
      
      // Mapeo de estados a colores y nombres legibles
      const statusConfig: Record<string, { name: string; color: string }> = {
        'draft': { name: 'Draft', color: '#6B7280' }, // Gray
        'submitted': { name: 'Submitted', color: '#3B82F6' }, // Blue
        'pending_approval': { name: 'Pending Approval', color: '#F59E0B' }, // Orange
        'approved': { name: 'Approved', color: '#10B981' }, // Green
        'rejected': { name: 'Rejected', color: '#EF4444' }, // Red
        'active': { name: 'Active', color: '#059669' }, // Dark Green
        'cancelled': { name: 'Cancelled', color: '#9CA3AF' }, // Light Gray
      }

      // Crear array con todos los estados que tienen aplicaciones
      const statusDistribution = Array.from(statusMap.entries())
        .map(([status, count]) => {
          const config = statusConfig[status] || { name: status, color: '#6B7280' }
          return {
            name: config.name,
            value: Math.round((count / total) * 100),
            count: count,
            color: config.color
          }
        })
        .filter(item => item.value > 0) // Solo mostrar estados con aplicaciones
        .sort((a, b) => b.count - a.count) // Ordenar por cantidad descendente

      setStatusData(statusDistribution)

    } catch (err) {
      console.error('Error fetching chart data:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  return { monthlyData, statusData, loading, error, refetch: fetchChartData }
}

/**
 * Hook para obtener actividad reciente
 */
export function useRecentActivity() {
  const [recentApplications, setRecentApplications] = useState<any[]>([])
  const [recentUsers, setRecentUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { isAgent, agentId, isSupportStaff, userScope, assignedAgentId } = useAdminAuth()

  useEffect(() => {
    fetchActivity()
  }, [isAgent, agentId, isSupportStaff, userScope, assignedAgentId])

  const fetchActivity = async () => {
    try {
      setLoading(true)
      setError(null)
      const supabase = createClient()

      // Últimas 10 applications (filtradas según rol)
      let appsQuery = supabase
        .from('applications')
        .select(`
          id,
          status,
          created_at,
          email
        `)
        .order('created_at', { ascending: false })
        .limit(10)
      
      if (isAgent && agentId) {
        appsQuery = appsQuery.eq('agent_id', agentId)
      } else if (isSupportStaff && userScope === 'agent_specific' && assignedAgentId) {
        appsQuery = appsQuery.eq('agent_id', assignedAgentId)
      }

      const { data: apps, error: appsError } = await appsQuery
      if (appsError) throw appsError
      setRecentApplications(apps || [])

      // Últimos 5 usuarios registrados (filtrados según rol)
      let usersQuery = supabase
        .from('users')
        .select('id, email, first_name, last_name, created_at')
        .order('created_at', { ascending: false })
        .limit(5)
      
      if (isAgent && agentId) {
        usersQuery = usersQuery.eq('agent_id', agentId)
      } else if (isSupportStaff && userScope === 'agent_specific' && assignedAgentId) {
        usersQuery = usersQuery.eq('agent_id', assignedAgentId)
      }

      const { data: users, error: usersError } = await usersQuery
      if (usersError) throw usersError
      setRecentUsers(users || [])

    } catch (err) {
      console.error('Error fetching recent activity:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  return { recentApplications, recentUsers, loading, error, refetch: fetchActivity }
}

