"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAdminAuth } from '@/contexts/admin-auth-context'
import { AdminStats } from '@/lib/types/admin'

interface AdminDataState {
  stats: AdminStats | null
  statsLoading: boolean
  statsError: string | null
  
  chartData: { monthlyData: any[], statusData: any[] } | null
  chartDataLoading: boolean
  chartDataError: string | null

  recentActivity: { recentApplications: any[], recentUsers: any[] } | null
  recentActivityLoading: boolean
  recentActivityError: string | null

  refreshStats: () => Promise<void>
  refreshChartData: () => Promise<void>
  refreshRecentActivity: () => Promise<void>
  refreshAll: () => Promise<void>
}

const AdminDataContext = createContext<AdminDataState | undefined>(undefined)

export function AdminDataProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading, isAgent, agentId, isSupportStaff, userScope, assignedAgentId } = useAdminAuth()
  
  // Stats State
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [statsError, setStatsError] = useState<string | null>(null)

  // Chart Data State
  const [chartData, setChartData] = useState<{ monthlyData: any[], statusData: any[] } | null>(null)
  const [chartDataLoading, setChartDataLoading] = useState(true)
  const [chartDataError, setChartDataError] = useState<string | null>(null)

  // Recent Activity State
  const [recentActivity, setRecentActivity] = useState<{ recentApplications: any[], recentUsers: any[] } | null>(null)
  const [recentActivityLoading, setRecentActivityLoading] = useState(true)
  const [recentActivityError, setRecentActivityError] = useState<string | null>(null)

  const refreshStats = useCallback(async () => {
    try {
      setStatsLoading(true)
      setStatsError(null)
      const supabase = createClient()

      const now = new Date()
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      const addAgentFilter = (query: any) => {
        if (isAgent && agentId) {
          return query.eq('assigned_agent_id', agentId)
        } else if (isSupportStaff && userScope === 'agent_specific' && assignedAgentId) {
          return query.eq('assigned_agent_id', assignedAgentId)
        }
        return query
      }

      // 1. Total applications
      let totalAppsQuery = supabase.from('applications').select('*', { count: 'exact', head: true })
      totalAppsQuery = addAgentFilter(totalAppsQuery)
      const { count: totalApplications, error: totalAppsError } = await totalAppsQuery
      if (totalAppsError) throw totalAppsError

      // 2. Active users
      let activeUsersQuery = supabase.from('applications').select('user_id')
      activeUsersQuery = addAgentFilter(activeUsersQuery)
      const { data: activeUsersData, error: activeUsersError } = await activeUsersQuery
      if (activeUsersError) throw activeUsersError
      const uniqueUsers = new Set(activeUsersData?.map((app: any) => app.user_id))
      const activeUsers = uniqueUsers.size

      // 3. Applications this month
      let monthAppsQuery = supabase.from('applications').select('*', { count: 'exact', head: true }).gte('created_at', firstDayOfMonth.toISOString())
      monthAppsQuery = addAgentFilter(monthAppsQuery)
      const { count: applicationsThisMonth, error: monthAppsError } = await monthAppsQuery
      if (monthAppsError) throw monthAppsError

      // 4. New users this month
      let newUsersQuery = supabase.from('users').select('*', { count: 'exact', head: true }).gte('created_at', firstDayOfMonth.toISOString())
      if (isAgent && agentId) {
        newUsersQuery = newUsersQuery.eq('agent_profile_id', agentId)
      } else if (isSupportStaff && userScope === 'agent_specific' && assignedAgentId) {
        newUsersQuery = newUsersQuery.eq('agent_profile_id', assignedAgentId)
      }
      const { count: newUsersThisMonth, error: newUsersError } = await newUsersQuery
      if (newUsersError) throw newUsersError

      // 5. Pending applications
      let pendingQuery = supabase.from('applications').select('*', { count: 'exact', head: true }).in('status', ['submitted', 'pending_approval'])
      pendingQuery = addAgentFilter(pendingQuery)
      const { count: pendingApplications, error: pendingError } = await pendingQuery
      if (pendingError) throw pendingError

      // 6. Approved applications
      let approvedQuery = supabase.from('applications').select('*', { count: 'exact', head: true }).in('status', ['approved', 'active'])
      approvedQuery = addAgentFilter(approvedQuery)
      const { count: approvedApplications, error: approvedError } = await approvedQuery
      if (approvedError) throw approvedError

      // 7. Rejected applications
      let rejectedQuery = supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'rejected')
      rejectedQuery = addAgentFilter(rejectedQuery)
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
      setStatsError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setStatsLoading(false)
    }
  }, [isAgent, agentId, isSupportStaff, userScope, assignedAgentId])

  const refreshChartData = useCallback(async () => {
    try {
      setChartDataLoading(true)
      setChartDataError(null)
      const supabase = createClient()

      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

      let query = supabase
        .from('applications')
        .select('id, status, created_at')
        .gte('created_at', sixMonthsAgo.toISOString())
        .order('created_at', { ascending: true })

      if (isAgent && agentId) {
        query = query.eq('assigned_agent_id', agentId)
      } else if (isSupportStaff && userScope === 'agent_specific' && assignedAgentId) {
        query = query.eq('assigned_agent_id', assignedAgentId)
      }

      const { data: applications, error: appsError } = await query
      if (appsError) throw appsError

      // Monthly Data Processing
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

      // Status Data Processing
      const statusMap = new Map<string, number>()
      applications?.forEach((app: any) => {
        const count = statusMap.get(app.status) || 0
        statusMap.set(app.status, count + 1)
      })

      const total = applications?.length || 1
      const statusConfig: Record<string, { name: string; color: string }> = {
        'draft': { name: 'Draft', color: '#6B7280' },
        'submitted': { name: 'Submitted', color: '#3B82F6' },
        'pending_approval': { name: 'Pending Approval', color: '#F59E0B' },
        'approved': { name: 'Approved', color: '#10B981' },
        'rejected': { name: 'Rejected', color: '#EF4444' },
        'active': { name: 'Active', color: '#059669' },
        'cancelled': { name: 'Cancelled', color: '#9CA3AF' },
      }

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
        .filter(item => item.value > 0)
        .sort((a, b) => b.count - a.count)

      setChartData({
        monthlyData: Array.from(monthlyMap.values()).slice(-6),
        statusData: statusDistribution
      })

    } catch (err) {
      console.error('Error fetching chart data:', err)
      setChartDataError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setChartDataLoading(false)
    }
  }, [isAgent, agentId, isSupportStaff, userScope, assignedAgentId])

  const refreshRecentActivity = useCallback(async () => {
    try {
      setRecentActivityLoading(true)
      setRecentActivityError(null)
      const supabase = createClient()

      // Recent Applications
      let appsQuery = supabase
        .from('applications')
        .select('id, status, created_at, email')
        .order('created_at', { ascending: false })
        .limit(10)
      
      if (isAgent && agentId) {
        appsQuery = appsQuery.eq('assigned_agent_id', agentId)
      } else if (isSupportStaff && userScope === 'agent_specific' && assignedAgentId) {
        appsQuery = appsQuery.eq('assigned_agent_id', assignedAgentId)
      }

      const { data: apps, error: appsError } = await appsQuery
      if (appsError) throw appsError

      // Recent Users
      let usersQuery = supabase
        .from('users')
        .select('id, email, first_name, last_name, created_at')
        .order('created_at', { ascending: false })
        .limit(5)
      
      if (isAgent && agentId) {
        usersQuery = usersQuery.eq('agent_profile_id', agentId)
      } else if (isSupportStaff && userScope === 'agent_specific' && assignedAgentId) {
        usersQuery = usersQuery.eq('agent_profile_id', assignedAgentId)
      }

      const { data: users, error: usersError } = await usersQuery
      if (usersError) throw usersError

      setRecentActivity({
        recentApplications: apps || [],
        recentUsers: users || []
      })

    } catch (err) {
      console.error('Error fetching recent activity:', err)
      setRecentActivityError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setRecentActivityLoading(false)
    }
  }, [isAgent, agentId, isSupportStaff, userScope, assignedAgentId])

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshStats(), refreshChartData(), refreshRecentActivity()])
  }, [refreshStats, refreshChartData, refreshRecentActivity])

  useEffect(() => {
    if (!authLoading && user?.id) {
      refreshAll()
    }
  }, [authLoading, user?.id, refreshAll])

  return (
    <AdminDataContext.Provider value={{
      stats, statsLoading, statsError,
      chartData, chartDataLoading, chartDataError,
      recentActivity, recentActivityLoading, recentActivityError,
      refreshStats, refreshChartData, refreshRecentActivity, refreshAll
    }}>
      {children}
    </AdminDataContext.Provider>
  )
}

export function useAdminData() {
  const context = useContext(AdminDataContext)
  if (context === undefined) {
    throw new Error('useAdminData must be used within an AdminDataProvider')
  }
  return context
}
