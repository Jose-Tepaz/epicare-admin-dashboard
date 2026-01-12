"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Edit, Trash2, MapPin, Upload, Loader2 } from "lucide-react"
import {
  useLicenses,
  useCreateLicense,
  useUpdateLicense,
  useDeleteLicense,
  useUploadLicenseDocument,
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

export function LicensesTab({ agentProfileId }: { agentProfileId: string }) {
  const { licenses, loading, refetch } = useLicenses(agentProfileId)
  const [isCreating, setIsCreating] = useState(false)

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Licencias</CardTitle>
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Licencia
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : licenses.length === 0 ? (
            <p className="text-center py-8 text-gray-500">No hay licencias registradas</p>
          ) : (
            <div className="space-y-3">
              {licenses.map((license) => (
                <LicenseCard key={license.id} license={license} onUpdate={refetch} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {isCreating && (
        <CreateLicenseDialog
          agentProfileId={agentProfileId}
          open={isCreating}
          onClose={() => setIsCreating(false)}
          onSuccess={refetch}
        />
      )}
    </div>
  )
}

function LicenseCard({ license, onUpdate }: { license: any; onUpdate: () => void }) {
  const { deleteLicense, deleting } = useDeleteLicense()
  const { uploadDocument, uploading } = useUploadLicenseDocument()
  const [isEditing, setIsEditing] = useState(false)

  const handleDelete = async () => {
    const result = await deleteLicense(license.id)
    if (result.success) {
      onUpdate()
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const result = await uploadDocument(license.id, file)
    if (result.success) {
      onUpdate()
    }
  }

  const statusColors = {
    active: 'bg-green-100 text-green-800',
    expired: 'bg-red-100 text-red-800',
    pending: 'bg-yellow-100 text-yellow-800',
    suspended: 'bg-gray-100 text-gray-800',
  }

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <MapPin className="h-4 w-4 text-gray-400" />
          <span className="font-medium">{license.state}</span>
          <Badge className={statusColors[license.status as keyof typeof statusColors]}>
            {license.status === 'active'
              ? 'Activa'
              : license.status === 'expired'
              ? 'Expirada'
              : license.status === 'pending'
              ? 'Pendiente'
              : 'Suspendida'}
          </Badge>
        </div>
        <p className="text-sm text-gray-600">Número: {license.license_number}</p>
        <p className="text-xs text-gray-500">
          Emisión: {format(new Date(license.issue_date), 'dd MMM yyyy', { locale: es })}
          {license.expiration_date &&
            ` - Vence: ${format(new Date(license.expiration_date), 'dd MMM yyyy', { locale: es })}`}
        </p>
        {license.document_url && (
          <a
            href={license.document_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline"
          >
            Ver documento
          </a>
        )}
      </div>
      <div className="flex gap-2">
        <label>
          <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} accept=".pdf,.jpg,.jpeg,.png" />
          <Button variant="ghost" size="sm" disabled={uploading} asChild>
            <span>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            </span>
          </Button>
        </label>
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
              <AlertDialogTitle>¿Eliminar licencia?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. La licencia será eliminada permanentemente.
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
        <EditLicenseDialog license={license} open={isEditing} onClose={() => setIsEditing(false)} onSuccess={onUpdate} />
      )}
    </div>
  )
}

function CreateLicenseDialog({
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
  const { createLicense, creating } = useCreateLicense()
  const [formData, setFormData] = useState({
    state: '',
    license_number: '',
    issue_date: '',
    expiration_date: '',
    status: 'active' as 'active' | 'expired' | 'pending' | 'suspended',
    notes: '',
  })

  const handleSubmit = async () => {
    if (!formData.state || !formData.license_number || !formData.issue_date) {
      toast.error('Por favor completa los campos requeridos')
      return
    }

    const result = await createLicense({
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
          <DialogTitle>Nueva Licencia</DialogTitle>
          <DialogDescription>Registra una nueva licencia para este agente</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="state">Estado *</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="ej: FL, CA, TX"
              />
            </div>
            <div>
              <Label htmlFor="license_number">Número de Licencia *</Label>
              <Input
                id="license_number"
                value={formData.license_number}
                onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="issue_date">Fecha de Emisión *</Label>
              <Input
                id="issue_date"
                type="date"
                value={formData.issue_date}
                onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
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
                <SelectItem value="active">Activa</SelectItem>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="expired">Expirada</SelectItem>
                <SelectItem value="suspended">Suspendida</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Notas adicionales..."
            />
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
              'Crear Licencia'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EditLicenseDialog({
  license,
  open,
  onClose,
  onSuccess,
}: {
  license: any
  open: boolean
  onClose: () => void
  onSuccess: () => void
}) {
  const { updateLicense, updating } = useUpdateLicense()
  const [formData, setFormData] = useState({
    state: license.state || '',
    license_number: license.license_number || '',
    issue_date: license.issue_date || '',
    expiration_date: license.expiration_date || '',
    status: license.status || 'active',
    notes: license.notes || '',
  })

  const handleSubmit = async () => {
    const result = await updateLicense(license.id, formData)
    if (result.success) {
      onSuccess()
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Licencia</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="state">Estado</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="license_number">Número de Licencia</Label>
              <Input
                id="license_number"
                value={formData.license_number}
                onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="issue_date">Fecha de Emisión</Label>
              <Input
                id="issue_date"
                type="date"
                value={formData.issue_date}
                onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
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
                <SelectItem value="active">Activa</SelectItem>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="expired">Expirada</SelectItem>
                <SelectItem value="suspended">Suspendida</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Notas adicionales..."
            />
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
