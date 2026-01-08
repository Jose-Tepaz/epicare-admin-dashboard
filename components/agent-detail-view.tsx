"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  User,
  Link as LinkIcon,
  Copy,
  Check,
  Calendar,
  FileText,
  Users,
  TrendingUp,
  Plus,
  Edit,
  Trash2,
  Upload,
  Loader2,
  Building2,
  MapPin,
  Phone,
  Mail,
} from "lucide-react"
import {
  useAgentProfile,
  useUpdateAgentProfile,
  useAppointments,
  useCreateAppointment,
  useUpdateAppointment,
  useDeleteAppointment,
  useLicenses,
  useCreateLicense,
  useUpdateLicense,
  useDeleteLicense,
  useUploadLicenseDocument,
  useAgentClients,
  useAssignClient,
  useUnassignClient,
  useAgentStats,
} from "@/lib/hooks/use-agents"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "sonner"

interface AgentDetailViewProps {
  userId: string
  showClientsTab?: boolean
  showSalesTab?: boolean
}

export function AgentDetailView({ 
  userId, 
  showClientsTab = true, 
  showSalesTab = true 
}: AgentDetailViewProps) {
  console.log('🔍 AgentDetailView: Rendering for userId:', userId)
  const { agent, loading: agentLoading, refetch: refetchAgent } = useAgentProfile(userId)
  const { stats, loading: statsLoading } = useAgentStats(agent?.id || null)
  const [linkCopied, setLinkCopied] = useState(false)

  console.log('🔍 AgentDetailView: Agent data:', { agent: agent?.id, loading: agentLoading })

  if (agentLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!agent) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-gray-500">
            Este usuario no tiene un perfil de agente configurado.
          </p>
        </CardContent>
      </Card>
    )
  }

  // Validar que unique_link_code no sea null
  // Usar la URL del marketplace en lugar del admin dashboard
  const marketplaceUrl = process.env.NEXT_PUBLIC_MARKETPLACE_URL || 'http://localhost:3000'
  const agentLink = agent.unique_link_code 
    ? `${marketplaceUrl}/agent/${agent.unique_link_code}`
    : 'Link no disponible'

  const handleCopyLink = () => {
    navigator.clipboard.writeText(agentLink)
    setLinkCopied(true)
    toast.success('Link copiado al portapapeles')
    setTimeout(() => setLinkCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClients}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAppointments}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Licencias Activas</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeLicenses}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventas Totales</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSales}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info" className="space-y-4">
        <TabsList className={`${
          showClientsTab && showSalesTab ? 'grid-cols-5' :
          showClientsTab || showSalesTab ? 'grid-cols-4' :
          'grid-cols-3'
        }`}>
          <TabsTrigger value="info">Información</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="licenses">Licencias</TabsTrigger>
          {showClientsTab && <TabsTrigger value="clients">Clientes</TabsTrigger>}
          {showSalesTab && <TabsTrigger value="sales">Ventas</TabsTrigger>}
        </TabsList>

        <TabsContent value="info">
          <AgentInfoTab agent={agent} onUpdate={refetchAgent} />
        </TabsContent>

        <TabsContent value="appointments">
          <AppointmentsTab agentProfileId={agent.id} />
        </TabsContent>

        <TabsContent value="licenses">
          <LicensesTab agentProfileId={agent.id} />
        </TabsContent>

        {showClientsTab && (
          <TabsContent value="clients">
            <ClientsTab agentProfileId={agent.id} />
          </TabsContent>
        )}

        {showSalesTab && (
          <TabsContent value="sales">
            <SalesTab agentProfileId={agent.id} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

// ============================================================================
// Tab: Agent Info
// ============================================================================

function AgentInfoTab({ agent, onUpdate }: { agent: any; onUpdate: () => void }) {
  const { updateAgent, updating } = useUpdateAgentProfile()
  const [isEditing, setIsEditing] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  
  // Asegurar que status siempre tenga un valor válido
  const safeStatus = agent?.status && ['active', 'inactive', 'pending'].includes(agent.status) 
    ? agent.status 
    : 'active'
  
  const [formData, setFormData] = useState({
    first_name: agent?.first_name || '',
    last_name: agent?.last_name || '',
    npn: agent?.npn || '',
    epicare_number: agent?.epicare_number || '',
    status: safeStatus,
  })

  // Validar que unique_link_code no sea null
  // Usar la URL del marketplace en lugar del admin dashboard
  const marketplaceUrl = process.env.NEXT_PUBLIC_MARKETPLACE_URL || 'http://localhost:3000'
  const agentLink = agent.unique_link_code 
    ? `${marketplaceUrl}/agent/${agent.unique_link_code}`
    : ''

  const handleCopyLink = () => {
    navigator.clipboard.writeText(agentLink)
    setLinkCopied(true)
    toast.success('Link copiado al portapapeles')
    setTimeout(() => setLinkCopied(false), 2000)
  }

  const handleSave = async () => {
    const result = await updateAgent(agent.id, formData)
    if (result.success) {
      setIsEditing(false)
      onUpdate()
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Información del Agente</CardTitle>
        {!isEditing && (
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_name">Nombre</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="last_name">Apellido</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="npn">NPN</Label>
                <Input
                  id="npn"
                  value={formData.npn}
                  onChange={(e) => setFormData({ ...formData, npn: e.target.value })}
                  placeholder="National Producer Number"
                />
              </div>
              <div>
                <Label htmlFor="epicare_number">Número Epicare</Label>
                <Input
                  id="epicare_number"
                  value={formData.epicare_number}
                  onChange={(e) => setFormData({ ...formData, epicare_number: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="status">Estado</Label>
                <Select 
                  value={formData.status || 'active'} 
                  onValueChange={(value) => setFormData({ ...formData, status: value as 'active' | 'inactive' | 'pending' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="inactive">Inactivo</SelectItem>
                    <SelectItem value="pending">Pendiente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={updating}>
                {updating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Guardar Cambios'
                )}
              </Button>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Link único */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <LinkIcon className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">Link Único del Agente</span>
                  </div>
                  <code className="text-sm text-blue-700 break-all">
                    {agentLink || 'Link no disponible (falta unique_link_code)'}
                  </code>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                  className="shrink-0"
                  disabled={!agentLink}
                >
                  {linkCopied ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copiar
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Información */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Nombre Completo</p>
                <p className="font-medium">
                  {agent.first_name && agent.last_name
                    ? `${agent.first_name} ${agent.last_name}`
                    : 'No especificado'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">NPN</p>
                <p className="font-medium">{agent.npn || 'No especificado'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Número Epicare</p>
                <p className="font-medium">{agent.epicare_number || 'No especificado'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Estado</p>
                <Badge
                  className={
                    (agent.status || 'pending') === 'active'
                      ? 'bg-green-100 text-green-800'
                      : (agent.status || 'pending') === 'inactive'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }
                >
                  {(agent.status || 'pending') === 'active' ? 'Activo' : (agent.status || 'pending') === 'inactive' ? 'Inactivo' : 'Pendiente'}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-gray-500">Fecha de Ingreso</p>
                <p className="font-medium">
                  {agent.join_date
                    ? format(new Date(agent.join_date), 'dd MMMM yyyy', { locale: es })
                    : 'No especificado'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Código Único</p>
                <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                  {agent.unique_link_code || 'No disponible'}
                </code>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Tab: Appointments
// ============================================================================

function AppointmentsTab({ agentProfileId }: { agentProfileId: string }) {
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
        {appointment.client && (
          <p className="text-sm text-gray-600">
            Cliente: {appointment.client.first_name} {appointment.client.last_name}
          </p>
        )}
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
  const [formData, setFormData] = useState({
    client_id: '',
    insurance_company_id: '',
    start_date: '',
    expiration_date: '',
    status: 'active' as 'active' | 'expired' | 'pending',
    notes: '',
  })

  const handleSubmit = async () => {
    if (!formData.client_id || !formData.insurance_company_id) {
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
            <Label htmlFor="client_id">Cliente ID *</Label>
            <Input
              id="client_id"
              value={formData.client_id}
              onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
              placeholder="UUID del cliente"
            />
          </div>
          <div>
            <Label htmlFor="insurance_company_id">Aseguradora ID *</Label>
            <Input
              id="insurance_company_id"
              value={formData.insurance_company_id}
              onChange={(e) => setFormData({ ...formData, insurance_company_id: e.target.value })}
              placeholder="UUID de la aseguradora"
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
    start_date: appointment.start_date || '',
    expiration_date: appointment.expiration_date || '',
    status: appointment.status || 'active',
    notes: appointment.notes || '',
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

// ============================================================================
// Tab: Licenses
// ============================================================================

function LicensesTab({ agentProfileId }: { agentProfileId: string }) {
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

// ============================================================================
// Tab: Clients
// ============================================================================

function ClientsTab({ agentProfileId }: { agentProfileId: string }) {
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

// ============================================================================
// Tab: Sales
// ============================================================================

function SalesTab({ agentProfileId }: { agentProfileId: string }) {
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
        <CardTitle>Ventas / Applications</CardTitle>
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

