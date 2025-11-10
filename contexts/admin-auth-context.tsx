"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { UserRole, getRolePermissions, RolePermissions, canAccessAdminDashboard } from '@/lib/types/admin'
import { useRouter } from 'next/navigation'

interface AdminAuthContextType {
  user: User | null
  userRoles: UserRole[]
  permissions: RolePermissions
  loading: boolean
  isSuperAdmin: boolean
  isAdmin: boolean
  isSupportStaff: boolean
  hasAdminAccess: boolean
  signOut: () => Promise<void>
  refreshRoles: () => Promise<void>
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined)

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userRoles, setUserRoles] = useState<UserRole[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  // Función para obtener los roles del usuario
  const fetchUserRoles = async (userId: string): Promise<UserRole[]> => {
    const { data, error } = await supabase
      .from('user_roles')
      .select(`
        role_id,
        roles:role_id (
          id,
          name,
          description
        )
      `)
      .eq('user_id', userId)

    if (error) {
      console.error('Error fetching user roles:', error)
      return []
    }

    return data?.map((ur: any) => ur.roles).filter(Boolean) || []
  }

  const refreshRoles = async () => {
    if (!user?.id) return
    const roles = await fetchUserRoles(user.id)
    setUserRoles(roles)
  }

  useEffect(() => {
    // Obtener sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      
      if (session?.user) {
        fetchUserRoles(session.user.id).then(setUserRoles)
      }
      
      setLoading(false)
    })

    // Escuchar cambios de autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      
      if (session?.user) {
        fetchUserRoles(session.user.id).then(setUserRoles)
      } else {
        setUserRoles([])
      }
      
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setUserRoles([])
    router.push('/admin/login')
  }

  // Calcular permisos basados en roles
  const permissions: RolePermissions = React.useMemo(() => {
    if (userRoles.length === 0) {
      return getRolePermissions('')
    }

    // Si tiene rol super_admin, tiene todos los permisos (incluyendo eliminar admins)
    if (userRoles.some(r => r.name === 'super_admin')) {
      return getRolePermissions('super_admin')
    }

    // Si tiene rol admin, tiene todos los permisos (excepto eliminar admins)
    if (userRoles.some(r => r.name === 'admin')) {
      return getRolePermissions('admin')
    }

    // Si tiene rol support_staff
    if (userRoles.some(r => r.name === 'support_staff')) {
      return getRolePermissions('support_staff')
    }

    // Otros roles (futuro)
    if (userRoles.some(r => r.name === 'finance_staff')) {
      return getRolePermissions('finance_staff')
    }

    return getRolePermissions('')
  }, [userRoles])

  const isSuperAdmin = userRoles.some(r => r.name === 'super_admin')
  const isAdmin = userRoles.some(r => r.name === 'admin')
  const isSupportStaff = userRoles.some(r => r.name === 'support_staff')
  const hasAdminAccess = userRoles.some(r => canAccessAdminDashboard(r.name))

  const value = {
    user,
    userRoles,
    permissions,
    loading,
    isSuperAdmin,
    isAdmin,
    isSupportStaff,
    hasAdminAccess,
    signOut,
    refreshRoles,
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

