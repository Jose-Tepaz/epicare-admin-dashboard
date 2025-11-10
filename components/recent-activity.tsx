"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CheckCircle, UserPlus, Loader2, FileText } from "lucide-react"
import { useRecentActivity } from "@/lib/hooks/use-stats"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"

const getInitials = (name: string) => {
  if (!name) return "?"
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

const getStatusConfig = (status: string) => {
  const configs: Record<string, { icon: any; iconColor: string; bgColor: string }> = {
    'approved': { icon: CheckCircle, iconColor: 'text-green-600', bgColor: 'bg-green-50' },
    'active': { icon: CheckCircle, iconColor: 'text-green-600', bgColor: 'bg-green-50' },
    'submitted': { icon: FileText, iconColor: 'text-blue-600', bgColor: 'bg-blue-50' },
    'pending_approval': { icon: FileText, iconColor: 'text-orange-600', bgColor: 'bg-orange-50' },
    'draft': { icon: FileText, iconColor: 'text-gray-600', bgColor: 'bg-gray-50' },
  }
  return configs[status] || { icon: FileText, iconColor: 'text-gray-600', bgColor: 'bg-gray-50' }
}

export function RecentActivity() {
  const { recentApplications, recentUsers, loading, error } = useRecentActivity()

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-red-600">Error al cargar actividad: {error}</p>
        </CardContent>
      </Card>
    )
  }

  // Combinar applications y usuarios en una sola lista de actividades
  const activities = [
    ...recentApplications.map((app: any) => ({
      id: app.id,
      type: 'application',
      userName: app.email || 'Unknown',
      userEmail: app.email,
      action: `Application ${app.status}`,
      time: app.created_at,
      status: app.status,
    })),
    ...recentUsers.map((user: any) => ({
      id: user.id,
      type: 'user',
      userName: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
      userEmail: user.email,
      action: 'New user registered',
      time: user.created_at,
      status: 'new_user',
    })),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 10)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length > 0 ? (
          <div className="space-y-4">
            {activities.map((activity) => {
              const config = activity.type === 'user' 
                ? { icon: UserPlus, iconColor: 'text-purple-600', bgColor: 'bg-purple-50' }
                : getStatusConfig(activity.status)
              const Icon = config.icon

              return (
                <div key={activity.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50">
                  <div className={`p-2 rounded-lg ${config.bgColor}`}>
                    <Icon className={`h-4 w-4 ${config.iconColor}`} />
                  </div>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={undefined} />
                    <AvatarFallback className="bg-gray-100 text-gray-600 text-xs">
                      {getInitials(activity.userName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{activity.userName}</span>
                      {activity.type === 'application' && (
                        <Badge variant="outline" className="text-xs">
                          {activity.status}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{activity.action}</p>
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(activity.time), { addSuffix: true, locale: es })}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center text-gray-500 py-8">
            No hay actividad reciente
          </div>
        )}
      </CardContent>
    </Card>
  )
}
