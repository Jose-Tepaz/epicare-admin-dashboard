"use client"

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ApplicationFilters, PaginationParams, PaginatedResponse } from '@/lib/types/admin'
import { toast } from 'sonner'

export interface ApplicationWithRelations {
  id: string
  user_id: string
  status: string
  created_at: string
  updated_at: string
  enrollment_data: any
  email: string
  carrier_name: string | null
  applicants: Array<{
    id: string
    first_name: string
    last_name: string
  }>
}

export function useApplications(
  filters: ApplicationFilters = {},
  pagination: PaginationParams = { page: 1, pageSize: 25 }
) {
  const [applications, setApplications] = useState<ApplicationWithRelations[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Serializar status array para dependencia estable
  const statusKey = useMemo(() => {
    return filters.status?.slice().sort().join(',') || ''
  }, [filters.status])

  const fetchApplications = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const supabase = createClient()

      let query = supabase
        .from('applications')
        .select(`
          id,
          user_id,
          status,
          created_at,
          updated_at,
          enrollment_data,
          email,
          carrier_name,
          applicants (
            id,
            first_name,
            last_name
          )
        `, { count: 'exact' })

      // Aplicar filtros
      if (filters.status && filters.status.length > 0) {
        query = query.in('status', filters.status)
      }

      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate)
      }

      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate)
      }

      if (filters.carrier) {
        query = query.eq('insurance_company_id', filters.carrier)
      }

      if (filters.search) {
        // Buscar en email directamente de la tabla applications
        query = query.ilike('email', `%${filters.search}%`)
      }

      // Ordenar y paginar
      const from = (pagination.page - 1) * pagination.pageSize
      const to = from + pagination.pageSize - 1

      query = query
        .order('created_at', { ascending: false })
        .range(from, to)

      const { data, error: fetchError, count } = await query

      if (fetchError) throw fetchError

      setApplications(data || [])
      setTotal(count || 0)
    } catch (err) {
      console.error('Error fetching applications:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [
    statusKey,
    filters.search,
    filters.startDate,
    filters.endDate,
    filters.carrier,
    pagination.page,
    pagination.pageSize
  ])

  useEffect(() => {
    fetchApplications()
  }, [fetchApplications])

  return {
    applications,
    total,
    loading,
    error,
    refetch: fetchApplications,
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages: Math.ceil(total / pagination.pageSize),
    },
  }
}

/**
 * Hook para obtener una application por ID con todas sus relaciones
 */
export function useApplicationDetails(applicationId: string | null) {
  const [application, setApplication] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (applicationId) {
      fetchApplicationDetails()
    }
  }, [applicationId])

  const fetchApplicationDetails = async () => {
    if (!applicationId) return

    try {
      setLoading(true)
      setError(null)
      const supabase = createClient()

      // Obtener la aplicación con relaciones que funcionan (sin foreign keys explícitas)
      const { data: appData, error: fetchError } = await supabase
        .from('applications')
        .select(`
          *,
          applicants (
            id,
            applicant_id,
            first_name,
            middle_initial,
            last_name,
            date_of_birth,
            gender,
            ssn,
            relationship,
            smoker,
            date_last_smoked,
            weight,
            height_feet,
            height_inches,
            has_prior_coverage,
            eligible_rate_tier,
            quoted_rate_tier,
            phone_numbers,
            created_at
          ),
          coverages (
            id,
            application_id,
            plan_key,
            carrier_name,
            effective_date,
            monthly_premium,
            payment_frequency,
            term,
            number_of_terms,
            termination_date,
            is_automatic_loan_provision_opted_in,
            riders,
            discounts,
            agent_number,
            created_at
          ),
          beneficiaries (
            id,
            application_id,
            beneficiary_id,
            first_name,
            middle_name,
            last_name,
            relationship,
            date_of_birth,
            allocation_percentage,
            addresses,
            phone_numbers,
            created_at
          ),
          application_submission_results (
            id,
            plan_type,
            plan_key,
            submission_received,
            policy_no,
            total_rate,
            effective_date,
            application_id_external,
            partner_application_id,
            submission_errors,
            created_at,
            updated_at
          )
        `)
        .eq('id', applicationId)
        .single()

      if (fetchError) throw fetchError

      // Obtener el usuario por separado si existe user_id
      if (appData?.user_id) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select(`
            id,
            email,
            first_name,
            last_name,
            phone,
            address,
            city,
            state,
            zip_code,
            country,
            date_of_birth,
            gender
          `)
          .eq('id', appData.user_id)
          .single()

        if (!userError && userData) {
          appData.users = userData
        }
      }

      // Obtener insurance_companies por separado si existe insurance_company_id
      if (appData?.insurance_company_id) {
        const { data: insuranceData, error: insuranceError } = await supabase
          .from('insurance_companies')
          .select(`
            id,
            name,
            slug
          `)
          .eq('id', appData.insurance_company_id)
          .single()

        if (!insuranceError && insuranceData) {
          appData.insurance_companies = insuranceData
        }
      }

      setApplication(appData)
    } catch (err) {
      console.error('Error fetching application details:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  return { application, loading, error, refetch: fetchApplicationDetails }
}

/**
 * Hook para actualizar el status de una application
 */
export function useUpdateApplicationStatus() {
  const [updating, setUpdating] = useState(false)

  const updateStatus = async (applicationId: string, newStatus: string) => {
    try {
      setUpdating(true)
      const supabase = createClient()

      const { error } = await supabase
        .from('applications')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', applicationId)

      if (error) throw error

      toast.success('Status actualizado correctamente')
      return true
    } catch (err) {
      console.error('Error updating application status:', err)
      toast.error('Error al actualizar el status')
      return false
    } finally {
      setUpdating(false)
    }
  }

  return { updateStatus, updating }
}

/**
 * Hook para eliminar una application (solo admin)
 */
export function useDeleteApplication() {
  const [deleting, setDeleting] = useState(false)

  const deleteApplication = async (applicationId: string) => {
    try {
      setDeleting(true)
      const supabase = createClient()

      // Soft delete: cambiar status a 'cancelled'
      const { error } = await supabase
        .from('applications')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', applicationId)

      if (error) throw error

      toast.success('Application cancelada correctamente')
      return true
    } catch (err) {
      console.error('Error deleting application:', err)
      toast.error('Error al cancelar la application')
      return false
    } finally {
      setDeleting(false)
    }
  }

  return { deleteApplication, deleting }
}

/**
 * Hook para obtener estadísticas de applications
 */
export function useApplicationsStats() {
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const supabase = createClient()

      // Total
      const { count: total } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })

      // Pending
      const { count: pending } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .in('status', ['submitted', 'pending_approval'])

      // Approved
      const { count: approved } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .in('status', ['approved', 'active'])

      // Rejected
      const { count: rejected } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'rejected')

      setStats({
        total: total || 0,
        pending: pending || 0,
        approved: approved || 0,
        rejected: rejected || 0,
      })
    } catch (err) {
      console.error('Error fetching applications stats:', err)
    } finally {
      setLoading(false)
    }
  }

  return { stats, loading, refetch: fetchStats }
}

