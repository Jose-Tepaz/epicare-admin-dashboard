"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Edit, Trash2, Building2, Loader2 } from "lucide-react"
import {
  useAppointments,
  useCreateAppointment,
  useUpdateAppointment,
  useDeleteAppointment,
  useInsuranceCompanies,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "sonner"

export function AppointmentsTab({ agentProfileId }: { agentProfileId: string }) {
  const { appointments, loading, refetch } = useAppointments(agentProfileId)
  const [isCreating, setIsCreating] = useState(false)

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Appointments</CardTitle>
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Appointment
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : appointments.length === 0 ? (
            <p className="text-center py-8 text-gray-500">No hay appointments registrados</p>
          ) : (
            <div className="space-y-3">
              {appointments.map((appointment) => (
                <AppointmentCard key={appointment.id} appointment={appointment} onUpdate={refetch} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {isCreating && (
        <CreateAppointmentDialog
          agentProfileId={agentProfileId}
          open={isCreating}
          onClose={() => setIsCreating(false)}
          onSuccess={refetch}
        />
      )}
    </div>
  )
}

function AppointmentCard({ appointment, onUpdate }: { appointment: any; onUpdate: () => void }) {
  const { deleteAppointment, deleting } = useDeleteAppointment()
  const [isEditing, setIsEditing] = useState(false)

  const handleDelete = async () => {
    const result = await deleteAppointment(appointment.id)
    if (result.success) {
      onUpdate()
    }
  }

  const statusColors = {
    active: 'bg-green-100 text-green-800',
    expired: 'bg-red-100 text-red-800',
    pending: 'bg-yellow-100 text-yellow-800',
  }

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <Building2 className="h-4 w-4 text-gray-400" />
          <span className="font-medium">{appointment.insurance_company?.name || 'Aseguradora'}</span>
          <Badge className={statusColors[appointment.status as keyof typeof statusColors]}>
            {appointment.status === 'active' ? 'Activo' : appointment.status === 'expired' ? 'Expirado' : 'Pendiente'}
          </Badge>
        </div>
        <p className="text-sm text-gray-600">
          Agent Code: {appointment.agent_code || 'N/A'}
        </p>
        {appointment.start_date && (
          <p className="text-xs text-gray-500">
            Inicio: {format(new Date(appointment.start_date), 'dd MMM yyyy', { locale: es })}
            {appointment.expiration_date &&
              ` - Vence: ${format(new Date(appointment.expiration_date), 'dd MMM yyyy', { locale: es })}`}
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
          <Edit className="h-4 w-4" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" disabled={deleting}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar appointment?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. El appointment será eliminado permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {isEditing && (
        <EditAppointmentDialog
          appointment={appointment}
          open={isEditing}
          onClose={() => setIsEditing(false)}
          onSuccess={onUpdate}
        />
      )}
    </div>
  )
}

function CreateAppointmentDialog({
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
  const { createAppointment, creating } = useCreateAppointment()
  const { companies, loading: loadingCompanies } = useInsuranceCompanies()
  const [formData, setFormData] = useState({
    company_id: '',
    agent_code: '',
    start_date: '',
    expiration_date: '',
    status: 'active' as 'active' | 'expired' | 'pending',
  })

  const handleSubmit = async () => {
    if (!formData.company_id || !formData.agent_code) {
      toast.error('Por favor completa los campos requeridos')
      return
    }

    const result = await createAppointment({
      agent_profile_id: agentProfileId,
      ...formData,
    })

    if (result.success) {
      onSuccess()
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo Appointment</DialogTitle>
          <DialogDescription>Registra un nuevo appointment para este agente</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="company_id">Aseguradora *</Label>
            <Select 
              value={formData.company_id} 
              onValueChange={(value) => setFormData({ ...formData, company_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingCompanies ? "Cargando..." : "Selecciona una aseguradora"} />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="agent_code">Código de Agente *</Label>
            <Input
              id="agent_code"
              value={formData.agent_code}
              onChange={(e) => setFormData({ ...formData, agent_code: e.target.value })}
              placeholder="Ej: A12345"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start_date">Fecha de Inicio</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="expiration_date">Fecha de Vencimiento</Label>
              <Input
                id="expiration_date"
                type="date"
                value={formData.expiration_date}
                onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="status">Estado</Label>
            <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Activo</SelectItem>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="expired">Expirado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={creating}>
            {creating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creando...
              </>
            ) : (
              'Crear Appointment'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EditAppointmentDialog({
  appointment,
  open,
  onClose,
  onSuccess,
}: {
  appointment: any
  open: boolean
  onClose: () => void
  onSuccess: () => void
}) {
  const { updateAppointment, updating } = useUpdateAppointment()
  const [formData, setFormData] = useState({
    agent_code: appointment.agent_code || '',
    start_date: appointment.start_date || '',
    expiration_date: appointment.expiration_date || '',
    status: appointment.status || 'active',
  })

  const handleSubmit = async () => {
    const result = await updateAppointment(appointment.id, formData)
    if (result.success) {
      onSuccess()
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Appointment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="agent_code">Código de Agente</Label>
            <Input
              id="agent_code"
              value={formData.agent_code}
              onChange={(e) => setFormData({ ...formData, agent_code: e.target.value })}
              placeholder="Ej: A12345"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start_date">Fecha de Inicio</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="expiration_date">Fecha de Vencimiento</Label>
              <Input
                id="expiration_date"
                type="date"
                value={formData.expiration_date}
                onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="status">Estado</Label>
            <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Activo</SelectItem>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="expired">Expirado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={updating}>
            {updating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              'Guardar Cambios'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
