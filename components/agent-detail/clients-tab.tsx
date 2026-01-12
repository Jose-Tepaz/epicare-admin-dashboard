"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, User, Mail, Phone, Trash2, Loader2 } from "lucide-react"
import {
  useAgentClients,
  useAssignClient,
  useUnassignClient,
} from "@/lib/hooks/use-agents"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "sonner"

export function ClientsTab({ agentProfileId }: { agentProfileId: string }) {
  console.log('🔍 ClientsTab: Rendering for agentProfileId:', agentProfileId)
  const { clients, loading, refetch } = useAgentClients(agentProfileId)
  const [isAssigning, setIsAssigning] = useState(false)
  
  console.log('🔍 ClientsTab: Clients data:', { clientsCount: clients.length, clients, loading })

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Clientes Asignados</CardTitle>
          <Button onClick={() => setIsAssigning(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Asignar Cliente
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : clients.length === 0 ? (
            <p className="text-center py-8 text-gray-500">No hay clientes asignados</p>
          ) : (
            <div className="space-y-3">
              {clients.map((agentClient) => (
                <ClientCard key={agentClient.id} agentClient={agentClient} agentProfileId={agentProfileId} onUpdate={refetch} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {isAssigning && (
        <AssignClientDialog
          agentProfileId={agentProfileId}
          open={isAssigning}
          onClose={() => setIsAssigning(false)}
          onSuccess={refetch}
        />
      )}
    </div>
  )
}

function ClientCard({
  agentClient,
  agentProfileId,
  onUpdate,
}: {
  agentClient: any
  agentProfileId: string
  onUpdate: () => void
}) {
  const { unassignClient, unassigning } = useUnassignClient()

  const handleUnassign = async () => {
    const result = await unassignClient(agentProfileId, agentClient.client_id)
    if (result.success) {
      onUpdate()
    }
  }

  const client = agentClient.client

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <User className="h-4 w-4 text-gray-400" />
          <span className="font-medium">
            {client?.first_name && client?.last_name
              ? `${client.first_name} ${client.last_name}`
              : client?.email || 'Cliente'}
          </span>
        </div>
        {client?.email && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Mail className="h-3 w-3" />
            {client.email}
          </div>
        )}
        {client?.phone && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Phone className="h-3 w-3" />
            {client.phone}
          </div>
        )}
        <p className="text-xs text-gray-500 mt-1">
          Asignado: {format(new Date(agentClient.assigned_at), 'dd MMM yyyy HH:mm', { locale: es })}
        </p>
      </div>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="sm" disabled={unassigning}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desasignar cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              El cliente será desasignado de este agente. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnassign}>Desasignar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function AssignClientDialog({
  agentProfileId,
  open,
  onClose,
  onSuccess,
}: {
  agentProfileId: string
  open: boolean
  onClose: () => void
  onSuccess: () => void
}) {
  const { assignClient, assigning } = useAssignClient()
  const [clientId, setClientId] = useState('')
  const [notes, setNotes] = useState('')

  const handleSubmit = async () => {
    if (!clientId) {
      toast.error('Por favor ingresa el ID del cliente')
      return
    }

    const result = await assignClient(agentProfileId, clientId, notes)
    if (result.success) {
      onSuccess()
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Asignar Cliente</DialogTitle>
          <DialogDescription>Asigna un cliente existente a este agente</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="client_id">ID del Cliente *</Label>
            <Input
              id="client_id"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="UUID del cliente"
            />
          </div>
          <div>
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas adicionales..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={assigning}>
            {assigning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Asignando...
              </>
            ) : (
              'Asignar Cliente'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
