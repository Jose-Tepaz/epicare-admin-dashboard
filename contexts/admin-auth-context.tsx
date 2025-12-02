"use client"

import React, { createContext, useContext, useEffect, useState, useMemo, useRef } from 'react'
import { User } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'
import { UserRole, getRolePermissions, RolePermissions, canAccessAdminDashboard } from '@/lib/types/admin'
import { useRouter, usePathname } from 'next/navigation'

interface AdminAuthContextType {
  user: User | null
  userRoles: UserRole[]
  permissions: RolePermissions
  loading: boolean
  isSuperAdmin: boolean
  isAdmin: boolean
  isAgent: boolean
  isSupportStaff: boolean
  hasAdminAccess: boolean
  userScope: 'global' | 'agent_specific'
  assignedAgentId: string | null
  agentId: string | null
  signOut: () => Promise<void>
  refreshRoles: () => Promise<void>
  canAccessApplication: (applicationId: string) => Promise<boolean>
  canAccessClient: (clientId: string) => Promise<boolean>
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined)

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userRoles, setUserRoles] = useState<UserRole[]>([])
  const [userScope, setUserScope] = useState<'global' | 'agent_specific'>('global')
  const [assignedAgentId, setAssignedAgentId] = useState<string | null>(null)
  const [agentId, setAgentId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  
  // Usar createBrowserClient de @supabase/ssr (recomendado para Next.js)
  // Esto evita múltiples instancias y conflictos con otros clientes
  const supabase = useMemo(() => 
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ), []
  )

  // Ref para evitar llamadas concurrentes a fetchUserContext
  const fetchingContextRef = useRef(false)
  const lastFetchedUserIdRef = useRef<string | null>(null)

  // Función unificada para obtener contexto del usuario
  const fetchUserContext = async (userId: string) => {
    // Evitar llamadas concurrentes o duplicadas para el mismo usuario
    if (fetchingContextRef.current) {
      console.log('⏸️ Already fetching user context, skipping')
      return
    }
    
    if (lastFetchedUserIdRef.current === userId) {
      console.log('⏸️ User context already fetched for this user, skipping')
      return
    }

    fetchingContextRef.current = true
    console.log('🔍 AdminAuthContext: Fetching user context for', userId)
    
    try {
      // 1. Obtener datos básicos del usuario
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select(`
          role,
          scope,
          assigned_to_agent_id,
          agent_id
        `)
        .eq('id', userId)
        .single()

      if (userError) {
        console.error('❌ AdminAuthContext: Error fetching user data:', userError)
        return
      }

      console.log('✅ AdminAuthContext: User role fetched:', userData.role)

      // Establecer roles
      const roles: UserRole[] = [{
        id: userData.role,
        name: userData.role as any,
        description: null
      }]
      setUserRoles(roles)

      // Establecer scope (solo para support_staff)
      if (userData.role === 'support_staff') {
        setUserScope((userData.scope as 'global' | 'agent_specific') || 'global')
        setAssignedAgentId(userData.assigned_to_agent_id)
      } else {
        setUserScope('global')
        setAssignedAgentId(null)
      }

      // 2. Obtener agent_id si es necesario
      if (userData.role === 'agent') {
        try {
          const { data: agentData, error: agentError } = await supabase
            .from('agents')
            .select('id')
            .eq('user_id', userId)
            .maybeSingle()
          
          if (agentError) {
            if (agentError.code !== 'PGRST116') {
              console.warn('⚠️ Error obteniendo agent_id:', agentError.message)
            }
            setAgentId(null)
          } else if (agentData) {
            setAgentId(agentData.id)
          } else {
            setAgentId(null)
          }
        } catch (err) {
          console.warn('⚠️ Error obteniendo agent_id:', err)
          setAgentId(null)
        }
      } else {
        setAgentId(null)
      }

      lastFetchedUserIdRef.current = userId
    } catch (error) {
      console.error('❌ AdminAuthContext: Unexpected error fetching context:', error)
    } finally {
      fetchingContextRef.current = false
    }
  }

  const refreshRoles = async () => {
    if (!user?.id) return
    setLoading(true)
    await fetchUserContext(user.id)
    setLoading(false)
  }

  useEffect(() => {
    let mounted = true
    console.log('🔄 AdminAuthProvider useEffect running')

    // Timeout de seguridad para evitar carga infinita (aumentado a 15 segundos)
    const safetyTimeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn('⚠️ Auth loading timed out, forcing completion')
        setLoading(false)
      }
    }, 15000) // 15 segundos

    const initAuth = async () => {
      try {
        console.log('⏳ Initializing auth...')
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
           console.error('❌ Error getting session:', error)
           throw error
        }

        if (mounted) {
          if (session?.user) {
            console.log('✅ Session found, user:', session.user.id)
            setUser(session.user)
            await fetchUserContext(session.user.id)
          } else if (!pathname?.includes('/login') && !pathname?.includes('/auth/')) {
            // Solo redirigir si no estamos ya en login o auth pages
            console.log('❌ No session found, redirecting to login')
            router.push('/admin/login')
          }
        }
      } catch (err: any) {
        console.error('❌ Error initializing auth:', err.message)
        if (!pathname?.includes('/login')) {
           router.push('/admin/login')
        }
      } finally {
        if (mounted) {
          setLoading(false)
          console.log('✅ Loading complete (initAuth)')
        }
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return
      console.log('🔄 Auth state changed:', event)

      try {
        if (session?.user) {
          // Solo actualizar si el usuario cambió
          const userIdChanged = user?.id !== session.user.id
          const needsContextRefresh = userRoles.length === 0 || userIdChanged
          
          setUser(session.user)
          
          // Solo recargar contexto si realmente es necesario
          // Evitar re-fetch innecesario cuando solo cambia el foco de la ventana
          if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
            // Solo hacer fetch si no tenemos datos o el usuario cambió
            if (needsContextRefresh) {
              try {
                await fetchUserContext(session.user.id)
              } catch (err) {
                console.error('Error fetching user context on auth change:', err)
              }
            } else {
              // Si ya tenemos los datos, solo asegurar que loading sea false
              setLoading(false)
            }
          } else if (event === 'TOKEN_REFRESHED') {
            // Para token refresh, no hacer fetch a menos que realmente necesitemos
            // Solo actualizar loading
            setLoading(false)
          } else {
            // Para otros eventos, solo asegurar que loading sea false
            setLoading(false)
          }
        } else {
          setUser(null)
          setUserRoles([])
          setUserScope('global')
          setAssignedAgentId(null)
          setAgentId(null)
          lastFetchedUserIdRef.current = null
          if (event === 'SIGNED_OUT' && !pathname?.includes('/login')) {
             router.push('/admin/login')
          }
        }
      } catch (err) {
        console.error('Error in auth state change handler:', err)
      } finally {
        // Asegurar que loading siempre se ponga en false
        if (mounted) {
          setLoading(false)
        }
      }
    })

    return () => {
      mounted = false
      clearTimeout(safetyTimeout)
      subscription.unsubscribe()
    }
  }, [supabase, router, pathname])

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setUserRoles([])
    setUserScope('global')
    setAssignedAgentId(null)
    setAgentId(null)
    router.push('/admin/login')
  }

  // Función para verificar si puede acceder a una application
  const canAccessApplication = async (applicationId: string): Promise<boolean> => {
    if (!user) return false
    if (isSuperAdmin || isAdmin) return true

    if (isAgent && agentId) {
      const { data } = await supabase
        .from('applications')
        .select('agent_id')
        .eq('id', applicationId)
        .single()
      return data?.agent_id === agentId
    }

    if (isSupportStaff) {
      if (userScope === 'global') return true
      if (userScope === 'agent_specific' && assignedAgentId) {
        const { data } = await supabase
          .from('applications')
          .select('agent_id')
          .eq('id', applicationId)
          .single()
        return data?.agent_id === assignedAgentId
      }
    }
    return false
  }

  // Función para verificar si puede acceder a un cliente
  const canAccessClient = async (clientId: string): Promise<boolean> => {
    if (!user) return false
    if (isSuperAdmin || isAdmin) return true

    if (isAgent && agentId) {
      const { data } = await supabase
        .from('users')
        .select('agent_id, created_by')
        .eq('id', clientId)
        .single()
      return data?.agent_id === agentId || data?.created_by === user.id
    }

    if (isSupportStaff) {
      if (userScope === 'global') return true
      if (userScope === 'agent_specific' && assignedAgentId) {
        const { data } = await supabase
          .from('users')
          .select('agent_id')
          .eq('id', clientId)
          .single()
        return data?.agent_id === assignedAgentId
      }
    }
    return false
  }

  // Calcular permisos basados en el rol del usuario
  const permissions: RolePermissions = useMemo(() => {
    if (userRoles.length === 0) return getRolePermissions('')
    const currentRole = userRoles[0]?.name || ''
    return getRolePermissions(currentRole)
  }, [userRoles])

  const isSuperAdmin = userRoles.some(r => r.name === 'super_admin')
  const isAdmin = userRoles.some(r => r.name === 'admin')
  const isAgent = userRoles.some(r => r.name === 'agent')
  const isSupportStaff = userRoles.some(r => r.name === 'support_staff')
  const hasAdminAccess = userRoles.some(r => canAccessAdminDashboard(r.name))

  const value = {
    user,
    userRoles,
    permissions,
    loading,
    isSuperAdmin,
    isAdmin,
    isAgent,
    isSupportStaff,
    hasAdminAccess,
    userScope,
    assignedAgentId,
    agentId,
    signOut,
    refreshRoles,
    canAccessApplication,
    canAccessClient,
  }

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  )
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext)
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider')
  }
  return context
}
