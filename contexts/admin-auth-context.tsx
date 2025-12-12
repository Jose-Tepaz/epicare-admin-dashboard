"use client"

import React, { createContext, useContext, useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { User } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'
import { UserRole, getRolePermissions, RolePermissions, canAccessAdminDashboard, RoleName } from '@/lib/types/admin'
import { useRouter, usePathname } from 'next/navigation'

interface RoleSwitchResult {
  success: boolean
  old_role: string
  new_role: string
  switched_at: string
}

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
  // Role Switching
  activeRole: RoleName | null
  availableRoles: RoleName[]
  canSwitchRoles: boolean
  switchingRole: boolean
  switchRole: (newRole: RoleName) => Promise<boolean>
  // Actions
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
  
  // Role Switching states
  const [activeRole, setActiveRole] = useState<RoleName | null>(null)
  const [availableRoles, setAvailableRoles] = useState<RoleName[]>([])
  const [switchingRole, setSwitchingRole] = useState(false)
  
  const router = useRouter()
  const pathname = usePathname()
  
  // Usar createBrowserClient de @supabase/ssr (recomendado para Next.js)
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
    
    if (lastFetchedUserIdRef.current === userId && availableRoles.length > 0) {
      console.log('⏸️ User context already fetched for this user, skipping')
      return
    }

    fetchingContextRef.current = true
    console.log('🔍 AdminAuthContext: Fetching user context for', userId)
    
    try {
      // 1. Obtener datos básicos del usuario
      console.log('📡 Starting Supabase query for user:', userId)
      const queryStartTime = Date.now()
      
      // Usar maybeSingle() en lugar de single() para no lanzar error si no existe
      // Esto es útil si el usuario tiene sesión pero no existe en public.users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      const queryDuration = Date.now() - queryStartTime
      console.log(`⏱️ Query completed in ${queryDuration}ms`, { userData, userError })
      
      if (userData) {
        console.log('📋 Columnas disponibles en users:', Object.keys(userData))
      }

      if (userError || !userData) {
        console.error('❌ AdminAuthContext: Error fetching user data:', userError || 'No data returned')
        setUserRoles([])
        setActiveRole(null)
        setAvailableRoles([])
        setUserScope('global')
        setAssignedAgentId(null)
        setAgentId(null)
        setLoading(false)
        return
      }

      // 2. Obtener roles disponibles usando la función RPC
      console.log('📡 Fetching available roles...')
      const { data: rolesData, error: rolesError } = await supabase.rpc('get_available_roles')
      
      let fetchedAvailableRoles: RoleName[] = []
      
      if (rolesError) {
        console.warn('⚠️ Error fetching available roles via RPC:', rolesError.message)
        // Fallback: usar el rol principal
        if (userData.role) {
          fetchedAvailableRoles = [userData.role as RoleName]
        }
      } else if (rolesData && Array.isArray(rolesData)) {
        fetchedAvailableRoles = rolesData as RoleName[]
        console.log('✅ Available roles fetched:', fetchedAvailableRoles)
      } else {
        // Fallback: usar el rol principal
        if (userData.role) {
          fetchedAvailableRoles = [userData.role as RoleName]
        }
      }
      
      setAvailableRoles(fetchedAvailableRoles)

      // 3. Determinar el rol activo
      // Prioridad: active_role > role (fallback)
      const currentActiveRole = (userData.active_role || userData.role) as RoleName | null
      
      if (!currentActiveRole) {
        console.error('❌ AdminAuthContext: No role found for user. Available data:', userData)
        setUserRoles([])
        setActiveRole(null)
        setUserScope('global')
        setAssignedAgentId(null)
        setAgentId(null)
        setLoading(false)
        return
      }

      console.log('✅ AdminAuthContext: Active role:', currentActiveRole, '| Primary role:', userData.role)
      setActiveRole(currentActiveRole)

      // Establecer userRoles para compatibilidad
      const roles: UserRole[] = [{
        id: currentActiveRole,
        name: currentActiveRole,
        description: null
      }]
      setUserRoles(roles)

      // 4. Establecer scope (solo para support_staff)
      if (currentActiveRole === 'support_staff') {
        const scope = userData.scope || 'global'
        const assignedTo = userData.assigned_to_agent_id || null
        setUserScope(scope as 'global' | 'agent_specific')
        setAssignedAgentId(assignedTo)
      } else {
        setUserScope('global')
        setAssignedAgentId(null)
      }

      // 5. Obtener agent_id si el rol activo es agent
      if (currentActiveRole === 'agent') {
        try {
          const { data: agentProfileData } = await supabase
            .from('agent_profiles')
            .select('id')
            .eq('user_id', userId)
            .maybeSingle()
          
          if (agentProfileData) {
            setAgentId(agentProfileData.id)
            console.log('✅ Agent profile ID:', agentProfileData.id)
          } else {
            setAgentId(null)
          }
        } catch (err) {
          console.warn('⚠️ Error obteniendo agent_profile_id:', err)
          setAgentId(null)
        }
      } else {
        setAgentId(null)
      }

      lastFetchedUserIdRef.current = userId
      setLoading(false)
    } catch (error) {
      console.error('❌ AdminAuthContext: Unexpected error fetching context:', error)
      setUserRoles([])
      setActiveRole(null)
      setAvailableRoles([])
      setUserScope('global')
      setAssignedAgentId(null)
      setAgentId(null)
      setLoading(false)
    } finally {
      fetchingContextRef.current = false
    }
  }

  // Función para cambiar de rol
  const switchRole = useCallback(async (newRole: RoleName): Promise<boolean> => {
    if (!user?.id) {
      console.error('❌ Cannot switch role: No user logged in')
      return false
    }

    if (!availableRoles.includes(newRole)) {
      console.error('❌ Cannot switch role: Role not available for user', newRole)
      return false
    }

    if (newRole === activeRole) {
      console.log('⏸️ Already on this role:', newRole)
      return true
    }

    setSwitchingRole(true)
    console.log('🔄 Switching role from', activeRole, 'to', newRole)

    try {
      const { data, error } = await supabase.rpc('switch_role', { new_role: newRole })

      if (error) {
        console.error('❌ Error switching role:', error.message)
        setSwitchingRole(false)
        return false
      }

      const result = data as RoleSwitchResult
      
      if (result?.success) {
        console.log('✅ Role switched successfully:', result)
        
        // Actualizar el estado local
        setActiveRole(newRole)
        
        // Actualizar userRoles para compatibilidad
        const roles: UserRole[] = [{
          id: newRole,
          name: newRole,
          description: null
        }]
        setUserRoles(roles)

        // Actualizar scope y agentId según el nuevo rol
        if (newRole === 'support_staff') {
          // Necesitamos obtener scope del usuario
          const { data: userData } = await supabase
            .from('users')
            .select('scope, assigned_to_agent_id')
            .eq('id', user.id)
            .single()
          
          if (userData) {
            setUserScope((userData.scope as 'global' | 'agent_specific') || 'global')
            setAssignedAgentId(userData.assigned_to_agent_id)
          }
        } else {
          setUserScope('global')
          setAssignedAgentId(null)
        }

        // Obtener agent_id si el nuevo rol es agent
        if (newRole === 'agent') {
          const { data: agentProfileData } = await supabase
            .from('agent_profiles')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle()
          
          if (agentProfileData) {
            setAgentId(agentProfileData.id)
          } else {
            setAgentId(null)
          }
        } else {
          setAgentId(null)
        }

        setSwitchingRole(false)
        
        // Recargar la página para que todos los datos se actualicen con el nuevo rol
        // Usamos un pequeño delay para asegurar que el estado se guardó en Supabase
        setTimeout(() => {
          window.location.reload()
        }, 150)
        
        return true
      } else {
        console.error('❌ Role switch failed:', result)
        setSwitchingRole(false)
        return false
      }
    } catch (error) {
      console.error('❌ Unexpected error switching role:', error)
      setSwitchingRole(false)
      return false
    }
  }, [user?.id, activeRole, availableRoles, supabase])

  const refreshRoles = async () => {
    if (!user?.id) return
    lastFetchedUserIdRef.current = null // Reset para forzar fetch
    setLoading(true)
    await fetchUserContext(user.id)
    setLoading(false)
  }

  useEffect(() => {
    let mounted = true
    console.log('🔄 AdminAuthProvider useEffect running')

    // Timeout de seguridad para evitar carga infinita (5 segundos)
    const safetyTimeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn('⚠️ Auth loading timed out after 5s, forcing loading to false')
        setLoading(false)
      }
    }, 5000)

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
            try {
              await fetchUserContext(session.user.id)
              setLoading(false)
            } catch (err) {
              console.error('Error in fetchUserContext during init:', err)
              setLoading(false)
            }
          } else if (!pathname?.includes('/login') && !pathname?.includes('/auth/') && !pathname?.includes('/set-password')) {
            console.log('❌ No session found, redirecting to login')
            router.push('/admin/login')
          }
        }
      } catch (err: any) {
        console.error('❌ Error initializing auth:', err.message)
        if (!pathname?.includes('/login') && !pathname?.includes('/set-password')) {
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
          const userIdChanged = user?.id !== session.user.id
          const needsContextRefresh = availableRoles.length === 0 || userIdChanged
          
          setUser(session.user)
          
          if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
            if (needsContextRefresh) {
              try {
                await fetchUserContext(session.user.id)
                setLoading(false)
              } catch (err) {
                console.error('Error fetching user context on auth change:', err)
                setLoading(false)
              }
            } else {
              setLoading(false)
            }
          } else if (event === 'TOKEN_REFRESHED') {
            setLoading(false)
          } else {
            setLoading(false)
          }
        } else {
          setUser(null)
          setUserRoles([])
          setActiveRole(null)
          setAvailableRoles([])
          setUserScope('global')
          setAssignedAgentId(null)
          setAgentId(null)
          lastFetchedUserIdRef.current = null
          if (event === 'SIGNED_OUT' && !pathname?.includes('/login') && !pathname?.includes('/set-password')) {
             router.push('/admin/login')
          }
        }
      } catch (err) {
        console.error('Error in auth state change handler:', err)
      } finally {
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
    setActiveRole(null)
    setAvailableRoles([])
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
        .select('agent_profile_id, created_by')
        .eq('id', clientId)
        .single()
      return data?.agent_profile_id === agentId || data?.created_by === user.id
    }

    if (isSupportStaff) {
      if (userScope === 'global') return true
      if (userScope === 'agent_specific' && assignedAgentId) {
        const { data } = await supabase
          .from('users')
          .select('agent_profile_id')
          .eq('id', clientId)
          .single()
        return data?.agent_profile_id === assignedAgentId
      }
    }
    return false
  }

  // Calcular permisos basados en el rol ACTIVO
  const permissions: RolePermissions = useMemo(() => {
    if (!activeRole) return getRolePermissions('')
    return getRolePermissions(activeRole)
  }, [activeRole])

  // Flags basados en el rol ACTIVO
  const isSuperAdmin = activeRole === 'super_admin'
  const isAdmin = activeRole === 'admin'
  const isAgent = activeRole === 'agent'
  const isSupportStaff = activeRole === 'support_staff'
  const hasAdminAccess = activeRole ? canAccessAdminDashboard(activeRole) : false
  const canSwitchRoles = availableRoles.length > 1

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
    // Role Switching
    activeRole,
    availableRoles,
    canSwitchRoles,
    switchingRole,
    switchRole,
    // Actions
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
