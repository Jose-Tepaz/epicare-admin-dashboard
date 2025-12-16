"use client"

import { useState, useCallback, useRef, useEffect } from 'react'
import { Bell, FileText, MessageSquare, FileCheck, CheckCircle2, Loader2, X } from 'lucide-react'
import { useNotifications } from '@/lib/hooks/use-notifications'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import type { Notification } from '@/lib/types/admin'

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return 'hace un momento'
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return `hace ${diffInMinutes} ${diffInMinutes === 1 ? 'minuto' : 'minutos'}`
  }

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `hace ${diffInHours} ${diffInHours === 1 ? 'hora' : 'horas'}`
  }

  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) {
    return `hace ${diffInDays} ${diffInDays === 1 ? 'día' : 'días'}`
  }

  const diffInWeeks = Math.floor(diffInDays / 7)
  if (diffInWeeks < 4) {
    return `hace ${diffInWeeks} ${diffInWeeks === 1 ? 'semana' : 'semanas'}`
  }

  const diffInMonths = Math.floor(diffInDays / 30)
  return `hace ${diffInMonths} ${diffInMonths === 1 ? 'mes' : 'meses'}`
}

function getNotificationIcon(type: Notification['type']) {
  switch (type) {
    case 'application':
      return <FileCheck className="h-4 w-4 text-blue-500" />
    case 'document':
      return <FileText className="h-4 w-4 text-orange-500" />
    case 'support':
      return <MessageSquare className="h-4 w-4 text-green-500" />
    default:
      return <Bell className="h-4 w-4 text-gray-500" />
  }
}

function groupNotificationsByDate(notifications: Notification[]): {
  today: Notification[]
  yesterday: Notification[]
  thisWeek: Notification[]
  older: Notification[]
} {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const thisWeekStart = new Date(today)
  thisWeekStart.setDate(thisWeekStart.getDate() - 7)

  const groups = {
    today: [] as Notification[],
    yesterday: [] as Notification[],
    thisWeek: [] as Notification[],
    older: [] as Notification[],
  }

  notifications.forEach((notification) => {
    const notificationDate = new Date(notification.created_at)
    const notificationDay = new Date(
      notificationDate.getFullYear(),
      notificationDate.getMonth(),
      notificationDate.getDate()
    )

    if (notificationDay.getTime() === today.getTime()) {
      groups.today.push(notification)
    } else if (notificationDay.getTime() === yesterday.getTime()) {
      groups.yesterday.push(notification)
    } else if (notificationDate >= thisWeekStart) {
      groups.thisWeek.push(notification)
    } else {
      groups.older.push(notification)
    }
  })

  return groups
}

function convertToAdminUrl(linkUrl: string | null): string | null {
  if (!linkUrl) return null

  if (linkUrl.startsWith('/admin')) {
    return linkUrl
  }

  if (linkUrl.startsWith('/applications/')) {
    const applicationId = linkUrl.replace('/applications/', '')
    return `/admin/requests/${applicationId}`
  }

  if (linkUrl.startsWith('/documents')) {
    return '/admin/documents'
  }

  if (linkUrl.startsWith('/support/tickets/')) {
    const ticketId = linkUrl.replace('/support/tickets/', '')
    return `/admin/support/${ticketId}`
  }

  if (linkUrl.startsWith('/support')) {
    return '/admin/support'
  }

  return linkUrl
}

interface NotificationItemProps {
  notification: Notification
  onMarkAsRead: (id: string) => Promise<boolean>
  onClose: () => void
}

function NotificationItem({ notification, onMarkAsRead, onClose }: NotificationItemProps) {
  const [markingAsRead, setMarkingAsRead] = useState(false)

  const handleClick = useCallback(async () => {
    if (!notification.is_read && !markingAsRead) {
      setMarkingAsRead(true)
      await onMarkAsRead(notification.id)
      setMarkingAsRead(false)
    }
    onClose()
  }, [notification.id, notification.is_read, onMarkAsRead, markingAsRead, onClose])

  const adminUrl = convertToAdminUrl(notification.link_url)

  const content = (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg transition-colors cursor-pointer',
        !notification.is_read && 'bg-blue-50 hover:bg-blue-100',
        notification.is_read && 'hover:bg-gray-50'
      )}
      onClick={handleClick}
    >
      <div className="mt-0.5">{getNotificationIcon(notification.type)}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              'text-sm font-medium',
              !notification.is_read && 'text-gray-900',
              notification.is_read && 'text-gray-600'
            )}
          >
            {notification.title}
          </p>
          {!notification.is_read && (
            <div className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
          )}
        </div>
        <p className="text-xs text-gray-600 mt-1 line-clamp-2">{notification.message}</p>
        <p className="text-xs text-gray-400 mt-1">{formatRelativeTime(notification.created_at)}</p>
      </div>
    </div>
  )

  if (adminUrl) {
    return (
      <Link href={adminUrl} className="block">
        {content}
      </Link>
    )
  }

  return content
}

interface NotificationsDropdownProps {
  notificationsData: ReturnType<typeof useNotifications>
}

export function NotificationsDropdown({ notificationsData }: NotificationsDropdownProps) {
  const { notifications, unreadCount, loading, error, markAsRead, markAllAsRead } = notificationsData
  const [markingAllAsRead, setMarkingAllAsRead] = useState(false)
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current && 
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  // Cerrar con Escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  const handleMarkAllAsRead = useCallback(async (e?: React.MouseEvent) => {
    console.log('🔵 handleMarkAllAsRead called')
    console.log('🔵 unreadCount:', unreadCount)
    console.log('🔵 markingAllAsRead:', markingAllAsRead)
    
    // Prevenir propagación del evento
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    
    if (unreadCount === 0 || markingAllAsRead) {
      console.log('⚠️ Skipping: no unread or already marking')
      return
    }

    console.log('📝 Starting to mark all as read...')
    setMarkingAllAsRead(true)
    const success = await markAllAsRead()
    setMarkingAllAsRead(false)

    if (!success) {
      console.error('❌ Error marking all notifications as read')
    } else {
      console.log('✅ All notifications marked as read')
    }
  }, [unreadCount, markAllAsRead, markingAllAsRead])

  const groupedNotifications = groupNotificationsByDate(notifications)

  return (
    <div ref={containerRef} className="relative">
      <Button
        variant="outline"
        size="sm"
        className="relative bg-transparent border-gray-200 hover:bg-gray-50"
        onClick={() => setOpen(!open)}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div
          ref={dropdownRef}
          className="absolute right-0 top-full mt-2 w-80 bg-white rounded-md border shadow-lg z-[9999] max-h-[500px] overflow-hidden"
        >
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold text-sm">Notificaciones</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={(e) => {
                    console.log('🖱️ Button clicked')
                    handleMarkAllAsRead(e)
                  }}
                  disabled={markingAllAsRead}
                >
                  {markingAllAsRead ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Marcar todas
                    </>
                  )}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="p-2 max-h-[400px] overflow-y-auto">
            {error ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Bell className="h-10 w-10 text-gray-300 mb-2" />
                <p className="text-sm text-red-500">Error al cargar notificaciones</p>
                <p className="text-xs text-gray-400 mt-1">{error}</p>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Bell className="h-10 w-10 text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">No hay notificaciones</p>
              </div>
            ) : (
              <div className="space-y-4">
                {groupedNotifications.today.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 px-2 mb-2">Hoy</p>
                    <div className="space-y-1">
                      {groupedNotifications.today.map((notification) => (
                        <NotificationItem
                          key={notification.id}
                          notification={notification}
                          onMarkAsRead={markAsRead}
                          onClose={() => setOpen(false)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {groupedNotifications.yesterday.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 px-2 mb-2">Ayer</p>
                    <div className="space-y-1">
                      {groupedNotifications.yesterday.map((notification) => (
                        <NotificationItem
                          key={notification.id}
                          notification={notification}
                          onMarkAsRead={markAsRead}
                          onClose={() => setOpen(false)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {groupedNotifications.thisWeek.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 px-2 mb-2">Esta semana</p>
                    <div className="space-y-1">
                      {groupedNotifications.thisWeek.map((notification) => (
                        <NotificationItem
                          key={notification.id}
                          notification={notification}
                          onMarkAsRead={markAsRead}
                          onClose={() => setOpen(false)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {groupedNotifications.older.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 px-2 mb-2">Más antiguas</p>
                    <div className="space-y-1">
                      {groupedNotifications.older.map((notification) => (
                        <NotificationItem
                          key={notification.id}
                          notification={notification}
                          onMarkAsRead={markAsRead}
                          onClose={() => setOpen(false)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
