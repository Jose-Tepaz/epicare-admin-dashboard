"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAdminAuth } from '@/contexts/admin-auth-context'
import type { Notification } from '@/lib/types/admin'

interface UseNotificationsReturn {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  error: string | null
  markAsRead: (notificationId: string) => Promise<boolean>
  markAllAsRead: () => Promise<boolean>
  refetch: () => Promise<void>
}

/**
 * Hook para obtener notificaciones en el admin dashboard
 * Las notificaciones se filtran automáticamente por las políticas RLS según el rol/scope del usuario
 */
export function useNotifications(): UseNotificationsReturn {
  const { user, isSuperAdmin, isAdmin, activeRole, loading: authLoading } = useAdminAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])
  const channelRef = useRef<any>(null)
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
      if (channelRef.current) {
        channelRef.current.unsubscribe()
        channelRef.current = null
      }
    }
  }, [])


  // Usar un ref para almacenar la función de fetch para evitar problemas con dependencias
  const fetchNotificationsRef = useRef<() => Promise<void>>()

  const fetchNotifications = useCallback(async () => {
    // Esperar a que la autenticación termine de cargar
    if (authLoading) {
      return
    }

    if (!user) {
      if (isMounted.current) {
        setNotifications([])
        setLoading(false)
        setError(null)
      }
      return
    }

    try {
      if (isMounted.current) {
        setLoading(true)
        setError(null)
      }

      // Fetching notifications for user

      // IMPORTANTE: Filtrar explícitamente por user_id para asegurar que solo se ven las propias notificaciones
      // Las políticas RLS deben hacer esto, pero agregamos el filtro como garantía
      const { data, error: fetchError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)  // Solo las notificaciones de este usuario
        .order('created_at', { ascending: false })
        .limit(50)

      if (fetchError) {
        console.error('Error fetching notifications:', fetchError)
        if (isMounted.current) {
          setError(fetchError.message || 'Error al cargar notificaciones')
          setLoading(false)
        }
        return
      }


      if (isMounted.current) {
        setNotifications(data || [])
        setLoading(false)
      }
    } catch (err) {
      console.error('❌ Error in fetchNotifications:', err)
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Error al cargar notificaciones')
        setLoading(false)
      }
    }
  }, [user, activeRole, isSuperAdmin, isAdmin, authLoading, supabase])

  // Actualizar el ref cuando cambia la función
  useEffect(() => {
    fetchNotificationsRef.current = fetchNotifications
  }, [fetchNotifications])

  useEffect(() => {
    // Esperar a que la autenticación termine de cargar antes de hacer cualquier cosa
    if (authLoading) {
      return
    }

    // Si no hay usuario, limpiar y salir
    if (!user) {
      if (isMounted.current) {
        setNotifications([])
        setLoading(false)
        setError(null)
      }
      // Limpiar suscripción si existe
      if (channelRef.current) {
        channelRef.current.unsubscribe()
        channelRef.current = null
      }
      return
    }

    // Cargar notificaciones iniciales
    fetchNotifications()

    // Limpiar suscripción anterior si existe
    if (channelRef.current) {
      channelRef.current.unsubscribe()
      channelRef.current = null
    }

    // Configurar suscripción en tiempo real
    // Usar un nombre de canal único pero estable para evitar múltiples suscripciones
    const channelName = `admin-notifications:${user.id}`
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,  // Solo notificaciones de este usuario
        },
        (payload) => {
          // Solo procesar si el componente está montado
          if (!isMounted.current) {
            return
          }
          
          // Agregar la nueva notificación directamente al estado
          const newNotification = payload.new as Notification
          
          // Verificación adicional: asegurar que la notificación es para este usuario
          if (newNotification.user_id !== user.id) {
            return
          }
          
          if (isMounted.current) {
            setNotifications((prev) => {
              // Evitar duplicados verificando si ya existe
              if (prev.some(n => n.id === newNotification.id)) {
                return prev
              }
              // Agregar al inicio y limitar a 50
              return [newNotification, ...prev].slice(0, 50)
            })
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('Channel subscription error:', err)
        }
      })

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        console.log('🧹 Cleaning up subscription:', channelName)
        channelRef.current.unsubscribe()
        channelRef.current = null
      }
    }
  }, [user?.id, authLoading, supabase]) // Remover fetchNotifications y activeRole de las dependencias para evitar recreaciones

  const markAsRead = useCallback(
    async (notificationId: string): Promise<boolean> => {
      if (!user) return false

      try {
        // Actualizar solo las notificaciones del usuario actual
        const { error } = await supabase
          .from('notifications')
          .update({
            is_read: true,
            read_at: new Date().toISOString(),
          })
          .eq('id', notificationId)
          .eq('user_id', user.id)  // Asegurar que es del usuario actual

        if (error) {
          console.error('Error marking notification as read:', error)
          return false
        }

        // Actualizar estado local
        if (isMounted.current) {
          setNotifications((prev) =>
            prev.map((n) =>
              n.id === notificationId
                ? { ...n, is_read: true, read_at: new Date().toISOString() }
                : n
            )
          )
        }

        return true
      } catch (err) {
        console.error('Error in markAsRead:', err)
        return false
      }
    },
    [user, supabase]
  )

  const markAllAsRead = useCallback(async (): Promise<boolean> => {
    if (!user) return false

    try {
      // Marcar solo las notificaciones no leídas del usuario actual
      const { error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)  // Solo las notificaciones de este usuario
        .eq('is_read', false)

      if (error) {
        console.error('Error marking all notifications as read:', error)
        return false
      }

      // Refrescar las notificaciones para obtener el estado actualizado
      await fetchNotifications()

      return true
    } catch (err) {
      console.error('Error in markAllAsRead:', err)
      return false
    }
  }, [user, supabase, fetchNotifications])

  const unreadCount = notifications.filter((n) => !n.is_read).length

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications,
  }
}

