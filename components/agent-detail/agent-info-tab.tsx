"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Link as LinkIcon,
  Copy,
  Check,
  Edit,
  Loader2,
  Star,
} from "lucide-react"
import { Switch } from "@/components/ui/switch"
import {
  useUpdateAgentProfile,
} from "@/lib/hooks/use-agents"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "sonner"

export function AgentInfoTab({ agent, onUpdate }: { agent: any; onUpdate: () => void }) {
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
    is_default: agent?.is_default || false,
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
              
              <div className="flex items-center space-x-2 border p-4 rounded-lg bg-gray-50">
                <Switch
                  id="is_default"
                  checked={formData.is_default}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })}
                />
                <div className="flex-1">
                  <Label htmlFor="is_default" className="text-base font-medium">Agente por Defecto</Label>
                  <p className="text-sm text-gray-500">
                    Si se activa, este será el agente asignado automáticamente a los nuevos usuarios. 
                    Solo puede haber un agente por defecto.
                  </p>
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

            {/* Default Agent Badge */}
            {agent.is_default && (
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200 flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-full">
                  <Star className="h-5 w-5 text-yellow-600 fill-yellow-600" />
                </div>
                <div>
                  <h4 className="font-medium text-yellow-900">Agente por Defecto</h4>
                  <p className="text-sm text-yellow-700">Este agente está configurado como el predeterminado del sistema.</p>
                </div>
              </div>
            )}

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
