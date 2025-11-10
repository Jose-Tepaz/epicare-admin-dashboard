"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Save } from "lucide-react"
import { toast } from "sonner"
import type { AdminPermissions } from "./types"

interface StatusUpdateCardProps {
  applicationId: string
  currentStatus: string
  permissions: AdminPermissions
  onStatusUpdate: (applicationId: string, newStatus: string) => Promise<boolean>
  onSuccess: () => void
}

export function StatusUpdateCard({ 
  applicationId, 
  currentStatus,
  permissions, 
  onStatusUpdate,
  onSuccess
}: StatusUpdateCardProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>("")
  const [updating, setUpdating] = useState(false)

  const handleStatusUpdate = async () => {
    if (!selectedStatus) {
      toast.error("Selecciona un nuevo status")
      return
    }

    setUpdating(true)
    try {
      const success = await onStatusUpdate(applicationId, selectedStatus)
      if (success) {
        onSuccess()
        setSelectedStatus("")
      }
    } finally {
      setUpdating(false)
    }
  }

  if (!permissions.canEditApplications) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Actualizar Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar nuevo status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="pending_approval">Pending Approval</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            {permissions.canDeleteApplications && (
              <SelectItem value="cancelled">Cancelled</SelectItem>
            )}
          </SelectContent>
        </Select>
        
        <Button
          onClick={handleStatusUpdate}
          disabled={updating || !selectedStatus}
          className="w-full"
        >
          {updating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Actualizando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Actualizar Status
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

