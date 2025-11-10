"use client"

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AdminStats } from '@/lib/types/admin'

export function useAdminStats() {
  const [stats, setStats] = useState<AdminStats | null>(null)
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

      // Obtener fecha del inicio del mes actual
      const now = new Date()
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      // 1. Total de applications
      const { count: totalApplications, error: totalAppsError } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })

      if (totalAppsError) throw totalAppsError

      // 2. Usuarios activos (con al menos una application)
      const { data: activeUsersData, error: activeUsersError } = await supabase
        .from('applications')
        .select('user_id')
        
      if (activeUsersError) throw activeUsersError

      const uniqueUsers = new Set(activeUsersData?.map((app: any) => app.user_id))
      const activeUsers = uniqueUsers.size

      // 3. Applications este mes
      const { count: applicationsThisMonth, error: monthAppsError } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', firstDayOfMonth.toISOString())

      if (monthAppsError) throw monthAppsError

      // 4. Nuevos usuarios este mes
      const { count: newUsersThisMonth, error: newUsersError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', firstDayOfMonth.toISOString())

      if (newUsersError) throw newUsersError

      // 5. Applications pendientes
      const { count: pendingApplications, error: pendingError } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .in('status', ['submitted', 'pending_approval'])

      if (pendingError) throw pendingError

      // 6. Applications aprobadas
      const { count: approvedApplications, error: approvedError } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .in('status', ['approved', 'active'])

      if (approvedError) throw approvedError

      // 7. Applications rechazadas
      const { count: rejectedApplications, error: rejectedError } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'rejected')

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

  useEffect(() => {
    fetchChartData()
  }, [])

  const fetchChartData = async () => {
    try {
      setLoading(true)
      setError(null)
      const supabase = createClient()

      // Obtener applications de los últimos 6 meses
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

      const { data: applications, error: appsError } = await supabase
        .from('applications')
        .select('id, status, created_at')
        .gte('created_at', sixMonthsAgo.toISOString())
        .order('created_at', { ascending: true })

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

      // Calcular distribución de status
      const statusMap = new Map<string, number>()
      applications?.forEach((app: any) => {
        const count = statusMap.get(app.status) || 0
        statusMap.set(app.status, count + 1)
      })

      const total = applications?.length || 1
      const statusDistribution = [
        {
          name: 'Approved',
          value: Math.round(((statusMap.get('approved') || 0) + (statusMap.get('active') || 0)) / total * 100),
          color: '#10B981'
        },
        {
          name: 'Pending',
          value: Math.round(((statusMap.get('submitted') || 0) + (statusMap.get('pending_approval') || 0)) / total * 100),
          color: '#F59E0B'
        },
        {
          name: 'Under Review',
          value: Math.round((statusMap.get('draft') || 0) / total * 100),
          color: '#3B82F6'
        },
      ].filter(item => item.value > 0)

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

  useEffect(() => {
    fetchActivity()
  }, [])

  const fetchActivity = async () => {
    try {
      setLoading(true)
      setError(null)
      const supabase = createClient()

      // Últimas 10 applications
      const { data: apps, error: appsError } = await supabase
        .from('applications')
        .select(`
          id,
          status,
          created_at,
          email
        `)
        .order('created_at', { ascending: false })
        .limit(10)

      if (appsError) throw appsError
      setRecentApplications(apps || [])

      // Últimos 5 usuarios registrados
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, created_at')
        .order('created_at', { ascending: false })
        .limit(5)

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

