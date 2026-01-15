"use client"

import { useAdminData } from '@/contexts/admin-data-context'

export function useAdminStats() {
  const { stats, statsLoading, statsError, refreshStats } = useAdminData()
  return { stats, loading: statsLoading, error: statsError, refetch: refreshStats }
}

export function useAdminChartData() {
  const { chartData, chartDataLoading, chartDataError, refreshChartData } = useAdminData()
  return { 
    monthlyData: chartData?.monthlyData || [], 
    statusData: chartData?.statusData || [], 
    loading: chartDataLoading, 
    error: chartDataError, 
    refetch: refreshChartData 
  }
}

export function useRecentActivity() {
  const { recentActivity, recentActivityLoading, recentActivityError, refreshRecentActivity } = useAdminData()
  return { 
    recentApplications: recentActivity?.recentApplications || [], 
    recentUsers: recentActivity?.recentUsers || [], 
    loading: recentActivityLoading, 
    error: recentActivityError, 
    refetch: refreshRecentActivity 
  }
}
