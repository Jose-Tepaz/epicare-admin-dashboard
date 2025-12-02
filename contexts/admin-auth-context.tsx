"use client"

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react'
import { User } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'
import { UserRole, getRolePermissions, RolePermissions, canAccessAdminDashboard } from '@/lib/types/admin'
import { useRouter } from 'next/navigation'

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
  
  // Usar createBrowserClient de @supabase/ssr (recomendado para Next.js)
  // Esto evita múltiples instancias y conflictos con otros clientes
  const supabase = useMemo(() => 
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ), []
  )

  console.log('🚀 AdminAuthProvider initialized')

  // Función para obtener el rol del usuario (desde users.role)
  const fetchUserRoles = async (userId: string): Promise<UserRole[]> => {
    console.log('🔍 AdminAuthContext: Fetching user roles for', userId)
    
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    if (error || !data) {
      console.error('❌ AdminAuthContext: Error fetching user role:', error)
      console.error('Error details:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint
      })
      return []
    }

    console.log('✅ AdminAuthContext: User role fetched:', data.role)

    // Retornar en formato UserRole para mantener compatibilidad
    // aunque ahora solo hay un rol por usuario
    return [{
      id: data.role, // Usamos el nombre del rol como id
      name: data.role as any,
      description: null
    }]
  }

  // Función para obtener datos adicionales del usuario (scope, agent_id)
  const fetchUserData = async (userId: string) => {
    console.log('🔍 AdminAuthContext: Fetching user data for', userId)
    
    const { data, error } = await supabase
      .from('users')
      .select(`
        scope,
        assigned_to_agent_id,
        role,
        agent_id
      `)
      .eq('id', userId)
      .single()

    if (error || !data) {
      console.error('❌ AdminAuthContext: Error fetching user data:', error)
      console.error('Error details:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint
      })
      return
    }
    
    console.log('✅ AdminAuthContext: User data fetched:', data)

    // Establecer scope (solo para support_staff)
    if (data.role === 'support_staff') {
      setUserScope((data.scope as 'global' | 'agent_specific') || 'global')
      setAssignedAgentId(data.assigned_to_agent_id)
    } else {
      setUserScope('global')
      setAssignedAgentId(null)
    }

    // Si el usuario es un agent, obtener su agent_id de la tabla agents
    if (data.role === 'agent') {
      try {
        // Usar maybeSingle() en lugar de single() para evitar error si no hay resultados
        const { data: agentData, error: agentError } = await supabase
          .from('agents')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle()
        
        if (agentError) {
          // Solo loggear si no es un error de "no encontrado"
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
  }

  const refreshRoles = async () => {
    if (!user?.id) return
    const roles = await fetchUserRoles(user.id)
    setUserRoles(roles)
    await fetchUserData(user.id)
  }

  useEffect(() => {
    console.log('🔄 AdminAuthProvider useEffect running')
    
    const initAuth = async () => {
      try {
        console.log('⏳ Initializing auth...')
        
        // Intentar obtener la sesión primero (más rápido y no hace llamadas de red)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (session?.user) {
          console.log('✅ Session found, user:', session.user.id)
          setUser(session.user)
          const roles = await fetchUserRoles(session.user.id)
          setUserRoles(roles)
          await fetchUserData(session.user.id)
          setLoading(false)
          return
        }
        
        // Si no hay sesión, simplemente redirigir a login
        // No intentar getUser() porque puede causar timeouts si no hay conexión
        console.log('❌ No session found, redirecting to login')
        router.push('/admin/login')
        
      } catch (err: any) {
        console.error('❌ Error initializing auth:', err.message)
        // Si hay error, redirigir a login
        router.push('/admin/login')
      } finally {
        setLoading(false)
        console.log('✅ Loading complete')
      }
    }

    initAuth()

    // Escuchar cambios de autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('🔄 Auth state changed:', _event)
      setUser(session?.user ?? null)
      
      if (session?.user) {
        const roles = await fetchUserRoles(session.user.id)
        setUserRoles(roles)
        await fetchUserData(session.user.id)
      } else {
        setUserRoles([])
        setUserScope('global')
        setAssignedAgentId(null)
        setAgentId(null)
      }
      
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

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

    // Super admin y admin siempre pueden
    if (isSuperAdmin || isAdmin) return true

    // Agent: solo applications con su agent_id
    if (isAgent && agentId) {
      const { data } = await supabase
        .from('applications')
        .select('agent_id')
        .eq('id', applicationId)
        .single()
      
      return data?.agent_id === agentId
    }

    // Support Staff: según scope
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

    // Super admin y admin siempre pueden
    if (isSuperAdmin || isAdmin) return true

    // Agent: solo clients con su agent_id o que él creó
    if (isAgent && agentId) {
      const { data } = await supabase
        .from('users')
        .select('agent_id, created_by')
        .eq('id', clientId)
        .single()
      
      return data?.agent_id === agentId || data?.created_by === user.id
    }

    // Support Staff: según scope
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
  const permissions: RolePermissions = React.useMemo(() => {
    if (userRoles.length === 0) {
      return getRolePermissions('')
    }

    // Obtener el rol actual (solo hay uno por usuario)
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

