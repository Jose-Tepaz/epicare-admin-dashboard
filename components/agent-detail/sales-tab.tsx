"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, Edit, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

export function SalesTab({ agentProfileId }: { agentProfileId: string }) {
  const router = useRouter()
  const [applications, setApplications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch applications where assigned_agent_id = agentProfileId
  useEffect(() => {
    const fetchApplications = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/agent-applications?agent_profile_id=${agentProfileId}`)
        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Error fetching applications')
        }

        setApplications(result.data || [])
      } catch (err) {
        console.error('Error fetching applications:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchApplications()
  }, [agentProfileId])

  const statusColors = {
    draft: 'bg-gray-100 text-gray-800',
    submitted: 'bg-blue-100 text-blue-800',
    pending_approval: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    active: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800',
  }

  const handleApplicationClick = (appId: string) => {
    router.push(`/admin/requests/${appId}`)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Applications</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : applications.length === 0 ? (
          <p className="text-center py-8 text-gray-500">No hay ventas registradas</p>
        ) : (
          <div className="space-y-3">
            {applications.map((app: any) => (
              <div 
                key={app.id} 
                onClick={() => handleApplicationClick(app.id)}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="h-4 w-4 text-gray-400" />
                    <span className="font-medium">
                      {app.insurance_companies?.name || app.carrier_name || 'Aseguradora'}
                    </span>
                    <Badge className={statusColors[app.status as keyof typeof statusColors] || statusColors.draft}>
                      {app.status}
                    </Badge>
                  </div>
                  {app.users ? (
                    <p className="text-sm text-gray-600">
                      Cliente: {app.users.first_name} {app.users.last_name}
                    </p>
                  ) : app.email ? (
                    <p className="text-sm text-gray-600">
                      Cliente: {app.email}
                    </p>
                  ) : null}
                  <p className="text-xs text-gray-500">
                    {format(new Date(app.created_at), 'dd MMM yyyy HH:mm', { locale: es })}
                  </p>
                </div>
                <Edit className="h-4 w-4 text-gray-400" />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
