"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
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
  const { user } = useAdminAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()
  const channelRef = useRef<any>(null)
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
      if (channelRef.current) {
        channelRef.current.unsubscribe()
      }
    }
  }, [])


  const fetchNotifications = useCallback(async () => {
    if (!user) {
      if (isMounted.current) {
        setNotifications([])
        setLoading(false)
      }
      return
    }

    try {
      if (isMounted.current) {
        setLoading(true)
        setError(null)
      }

      // Filtrar por user_id del usuario actual (el admin/agent/support_staff)
      // Las notificaciones del admin se crean con el user_id del receptor
      const { data, error: fetchError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (fetchError) {
        console.error('Error fetching notifications:', fetchError)
        if (isMounted.current) {
          setError(fetchError.message)
          setLoading(false)
        }
        return
      }

      if (isMounted.current) {
        setNotifications(data || [])
        setLoading(false)
      }
    } catch (err) {
      console.error('Error in fetchNotifications:', err)
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Error al cargar notificaciones')
        setLoading(false)
      }
    }
  }, [user, supabase])

  useEffect(() => {
    fetchNotifications()

    // Configurar suscripción en tiempo real
    if (user) {
      // Limpiar suscripción anterior si existe
      if (channelRef.current) {
        channelRef.current.unsubscribe()
      }

      // Suscripción para notificaciones del usuario actual
      // Filtrar por user_id para recibir solo las notificaciones de este admin
      const channel = supabase
        .channel(`admin-notifications:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('📬 Admin notification change:', payload.eventType)
            
            const notification = payload.new as Notification
            
            if (payload.eventType === 'INSERT') {
              // Nueva notificación agregada para este admin
              if (isMounted.current) {
                setNotifications((prev) => {
                  // Evitar duplicados
                  if (prev.some(n => n.id === notification.id)) {
                    return prev
                  }
                  return [notification, ...prev].slice(0, 50)
                })
              }
            } else if (payload.eventType === 'UPDATE') {
              // Notificación actualizada (marcada como leída)
              const updatedNotification = payload.new as Notification
              if (isMounted.current) {
                setNotifications((prev) =>
                  prev.map((n) => (n.id === updatedNotification.id ? updatedNotification : n))
                )
              }
            } else if (payload.eventType === 'DELETE') {
              // Notificación eliminada
              const deletedId = payload.old.id
              if (isMounted.current) {
                setNotifications((prev) => prev.filter((n) => n.id !== deletedId))
              }
            }
          }
        )
        .subscribe()

      channelRef.current = channel

      return () => {
        if (channelRef.current) {
          channelRef.current.unsubscribe()
        }
      }
    }
  }, [user, fetchNotifications, supabase])

  const markAsRead = useCallback(
    async (notificationId: string): Promise<boolean> => {
      if (!user) return false

      try {
        // Las políticas RLS permiten actualizar solo las notificaciones relevantes
        const { error } = await supabase
          .from('notifications')
          .update({
            is_read: true,
            read_at: new Date().toISOString(),
          })
          .eq('id', notificationId)

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
      // Marcar todas las notificaciones no leídas como leídas
      // Las políticas RLS solo permiten actualizar las relevantes
      const { error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('is_read', false)

      if (error) {
        console.error('Error marking all notifications as read:', error)
        return false
      }

      // Actualizar estado local
      if (isMounted.current) {
        const now = new Date().toISOString()
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, is_read: true, read_at: now }))
        )
      }

      return true
    } catch (err) {
      console.error('Error in markAllAsRead:', err)
      return false
    }
  }, [user, supabase])

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

