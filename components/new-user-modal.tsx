"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useCreateUser, useAvailableRoles } from "@/lib/hooks/use-users"
import { useAdminAuth } from "@/contexts/admin-auth-context"
import { useAgents } from "@/hooks/use-agents"
import { Loader2, Info } from "lucide-react"

interface NewUserModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function NewUserModal({ open, onOpenChange, onSuccess }: NewUserModalProps) {
  const [formData, setFormData] = useState({
    email: "",
    first_name: "",
    last_name: "",
    phone: "",
    address: "",
    state: "",
    city: "",
    zipcode: "",
    role: "", // ✅ Cambiado de roleId a role
    agent_profile_id: "", // Nuevo campo para selección de agente
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { createUser, creating } = useCreateUser()
  const { roles: availableRoles, loading: rolesLoading } = useAvailableRoles()
  const { isSuperAdmin, isAgent, user, activeRole, agentId } = useAdminAuth()
  const { agents, loading: agentsLoading, getAgentDisplayName, getDefaultAgent } = useAgents()

  // Filtrar roles según permisos:
  // - super_admin puede asignar cualquier rol
  // - admin puede asignar todos excepto admin y super_admin
  // - agent solo puede asignar client y support_staff
  const filteredRoles = availableRoles.filter(role => {
    if (role.name === 'admin' || role.name === 'super_admin') {
      return isSuperAdmin
    }
    if (isAgent) {
      // Los agentes solo pueden crear clientes y support staff
      return role.name === 'client' || role.name === 'support_staff'
    }
    return true
  })

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setFormData({
        email: "",
        first_name: "",
        last_name: "",
        phone: "",
        address: "",
        state: "",
        city: "",
        zipcode: "",
        role: "",
        agent_profile_id: "",
      })
      setErrors({})
    }
  }, [open])

  // Determinar si mostrar el selector de agente
  // Solo admin y super_admin pueden seleccionar agente
  // Los agentes automáticamente asignan su propio ID
  const shouldShowAgentSelector = 
    (activeRole === 'admin' || activeRole === 'super_admin') && 
    formData.role === 'client'

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.email.trim()) {
      newErrors.email = "El email es requerido"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "El email no es válido"
    }

    if (!formData.first_name.trim()) {
      newErrors.first_name = "El nombre es requerido"
    }

    if (!formData.last_name.trim()) {
      newErrors.last_name = "El apellido es requerido"
    }

    if (!formData.role.trim()) {
      newErrors.role = "El rol es requerido"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    // Si es un agente creando un cliente, asignar automáticamente su agentId
    let agentProfileId = formData.agent_profile_id || undefined
    if (isAgent && formData.role === 'client' && agentId) {
      agentProfileId = agentId
    }

    const result = await createUser({
      email: formData.email.trim(),
      first_name: formData.first_name.trim(),
      last_name: formData.last_name.trim(),
      phone: formData.phone.trim() || undefined,
      address: formData.address.trim() || undefined,
      state: formData.state.trim() || undefined,
      city: formData.city.trim() || undefined,
      zipcode: formData.zipcode.trim() || undefined,
      role: formData.role, // ✅ Cambiado de roleId a role
      agent_profile_id: agentProfileId, // Asignación automática para agentes
    })

    if (result.success && result.user) {
      // El rol ya fue asignado en el endpoint, no necesitamos asignarlo aquí

      // Reset form
      setFormData({
        email: "",
        first_name: "",
        last_name: "",
        phone: "",
        address: "",
        state: "",
        city: "",
        zipcode: "",
        role: "", // ✅ Cambiado de roleId a role
        agent_profile_id: "",
      })
      setErrors({})
      onOpenChange(false)
      if (onSuccess) {
        onSuccess()
      }
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isAgent ? "Registrar Nuevo Cliente/Staff" : "Registrar Nuevo Usuario"}
          </DialogTitle>
          <DialogDescription>
            {isAgent 
              ? "Crea un nuevo cliente o miembro de tu equipo. El usuario recibirá un correo de invitación para establecer su contraseña."
              : "Crea un nuevo usuario en el sistema. El usuario recibirá un correo de invitación para establecer su contraseña y completar su perfil."
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">
              Email <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="usuario@ejemplo.com"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              className={errors.email ? "border-red-500" : ""}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">
                Nombre <span className="text-red-500">*</span>
              </Label>
              <Input
                id="first_name"
                type="text"
                placeholder="Juan"
                value={formData.first_name}
                onChange={(e) => handleChange("first_name", e.target.value)}
                className={errors.first_name ? "border-red-500" : ""}
              />
              {errors.first_name && (
                <p className="text-sm text-red-500">{errors.first_name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_name">
                Apellido <span className="text-red-500">*</span>
              </Label>
              <Input
                id="last_name"
                type="text"
                placeholder="Pérez"
                value={formData.last_name}
                onChange={(e) => handleChange("last_name", e.target.value)}
                className={errors.last_name ? "border-red-500" : ""}
              />
              {errors.last_name && (
                <p className="text-sm text-red-500">{errors.last_name}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+1 (555) 123-4567"
              value={formData.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Dirección</Label>
            <Input
              id="address"
              type="text"
              placeholder="123 Main St"
              value={formData.address}
              onChange={(e) => handleChange("address", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">Ciudad</Label>
              <Input
                id="city"
                type="text"
                placeholder="Nueva York"
                value={formData.city}
                onChange={(e) => handleChange("city", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">Estado</Label>
              <Input
                id="state"
                type="text"
                placeholder="NY"
                value={formData.state}
                onChange={(e) => handleChange("state", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="zipcode">Código Postal</Label>
            <Input
              id="zipcode"
              type="text"
              placeholder="10001"
              value={formData.zipcode}
              onChange={(e) => handleChange("zipcode", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">
              Rol <span className="text-red-500">*</span>
            </Label>
            <Select 
              value={formData.role} 
              onValueChange={(value) => handleChange("role", value)}
              disabled={rolesLoading || creating}
            >
              <SelectTrigger id="role" className={errors.role ? "border-red-500" : ""}>
                <SelectValue placeholder="Seleccionar rol" />
              </SelectTrigger>
              <SelectContent>
                {filteredRoles.map((role) => (
                  <SelectItem key={role.id} value={role.name}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.role && (
              <p className="text-sm text-red-500">{errors.role}</p>
            )}
          </div>

          {/* Selector de Agente - Solo visible para admin/super_admin cuando el rol es 'client' */}
          {shouldShowAgentSelector && (
            <div className="space-y-2 border-t pt-4">
              <Label htmlFor="agent_profile_id" className="flex items-center gap-2">
                Asignar Agente
                <Info className="h-4 w-4 text-muted-foreground" />
              </Label>
              <Select 
                value={formData.agent_profile_id} 
                onValueChange={(value) => handleChange("agent_profile_id", value)}
                disabled={agentsLoading || creating}
              >
                <SelectTrigger id="agent_profile_id">
                  <SelectValue placeholder="Agente por defecto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">
                    <span className="flex items-center gap-2">
                      Agente por defecto
                      {getDefaultAgent() && (
                        <span className="text-xs text-muted-foreground">
                          ({getAgentDisplayName(getDefaultAgent()!)})
                        </span>
                      )}
                    </span>
                  </SelectItem>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      <span className="flex items-center gap-2">
                        {getAgentDisplayName(agent)}
                        {agent.is_default && (
                          <span className="text-xs text-muted-foreground">(Default)</span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground flex items-start gap-1">
                <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                Si no seleccionas un agente, se asignará automáticamente el agente por defecto de la plataforma
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={creating}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={creating}>
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                "Crear Usuario"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
