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
    unique_link_code: "", // Nuevo campo para link único del agente
    npn: "",
    epicare_number: "",
  })
  
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { createUser, creating } = useCreateUser()
  const { roles: availableRoles, loading: rolesLoading } = useAvailableRoles()
  const { isSuperAdmin, isAgent, user, activeRole, agentId } = useAdminAuth()
  const { agents, loading: agentsLoading, error: agentsError, getAgentDisplayName, getDefaultAgent } = useAgents()

  // Filtrar roles según permisos:
  // - super_admin puede asignar cualquier rol
  // - admin puede asignar todos excepto admin y super_admin
  // - agent solo puede asignar client y support_staff
  const filteredRoles = availableRoles.filter(role => {
    // Asegurarse de que el rol tenga un nombre válido (no vacío)
    if (!role.name || role.name.trim() === '') {
      return false
    }
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
        unique_link_code: "",
        npn: "",
        epicare_number: "",
      })
      setErrors({})
    }
  }, [open])

  // Auto-generar unique_link_code cuando cambia nombre o apellido (solo si rol es agent)
  useEffect(() => {
    if (formData.role === 'agent' && formData.first_name && formData.last_name) {
      const generatedCode = `${formData.first_name}-${formData.last_name}`
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remover acentos
        .replace(/[^a-z0-9-]/g, "-") // Reemplazar caracteres especiales con guiones
        .replace(/-+/g, "-") // Reemplazar múltiples guiones con uno solo
        .replace(/^-|-$/g, "") // Remover guiones al inicio y final
      
      setFormData(prev => ({ ...prev, unique_link_code: generatedCode }))
    }
  }, [formData.first_name, formData.last_name, formData.role])

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
    // Convertir "default" a undefined para usar el agente por defecto
    if (agentProfileId === "default") {
      agentProfileId = undefined
    }
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
      unique_link_code: formData.role === 'agent' && formData.unique_link_code.trim() 
        ? formData.unique_link_code.trim() 
        : undefined, // Solo enviar si es agente
      npn: formData.role === 'agent' && formData.npn.trim() 
        ? formData.npn.trim() 
        : undefined, // Solo enviar si es agente
      epicare_number: formData.role === 'agent' && formData.epicare_number?.trim() ? formData.epicare_number.trim() : undefined,
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
        unique_link_code: "",
        npn: "",
        epicare_number: "",
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
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
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

          {/* Link único del agente - Solo visible cuando el rol es 'agent' */}
          {formData.role === 'agent' && (
            <div className="space-y-4 border-t pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="npn">
                    NPN
                  </Label>
                  <Input
                    id="npn"
                    type="text"
                    placeholder="1234567890"
                    value={formData.npn || ""} // Asegura que no sea undefined
                    onChange={(e) => handleChange("npn", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="epicare_number">
                    Epicare Number
                  </Label>
                  <Input
                    id="epicare_number"
                    type="text"
                    placeholder="EPI-12345"
                    value={formData.epicare_number || ""} // Asegura que no sea undefined
                    onChange={(e) => handleChange("epicare_number", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="unique_link_code" className="flex items-center gap-2">
                  Link Único del Agente
                  <Info className="h-4 w-4 text-muted-foreground" />
                </Label>
                <div className="space-y-2">
                  <Input
                    id="unique_link_code"
                    type="text"
                    placeholder="juan-perez"
                    value={formData.unique_link_code}
                    onChange={(e) => handleChange("unique_link_code", e.target.value)}
                    className={errors.unique_link_code ? "border-red-500" : ""}
                  />
                  {errors.unique_link_code && (
                    <p className="text-sm text-red-500">{errors.unique_link_code}</p>
                  )}
                  <p className="text-xs text-muted-foreground flex items-start gap-1">
                    <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    Este link se generará automáticamente basado en el nombre y apellido. Puedes editarlo si lo deseas.
                  </p>
                  {formData.unique_link_code && (
                    <p className="text-xs text-blue-600 font-mono break-all">
                      {(() => {
                        const marketplaceUrl = process.env.NEXT_PUBLIC_MARKETPLACE_URL || 'http://localhost:3000'
                        return `${marketplaceUrl}/agent/${formData.unique_link_code}`
                      })()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Selector de Agente - Solo visible para admin/super_admin cuando el rol es 'client' */}
          {shouldShowAgentSelector && (
            <div className="space-y-2 border-t pt-4">
              <Label htmlFor="agent_profile_id" className="flex items-center gap-2">
                Asignar Agente
                <Info className="h-4 w-4 text-muted-foreground" />
              </Label>
              <Select 
                value={formData.agent_profile_id || "default"} 
                onValueChange={(value) => handleChange("agent_profile_id", value === "default" ? "" : value)}
                disabled={agentsLoading || creating || agents.length === 0}
              >
                <SelectTrigger id="agent_profile_id">
                  <SelectValue placeholder={agentsLoading ? "Cargando agentes..." : agents.length === 0 ? "No hay agentes disponibles" : "Agente por defecto"} />
                </SelectTrigger>
                <SelectContent className="z-[100]">
                  <SelectItem value="default">
                    <span className="flex items-center gap-2">
                      Agente principal
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
                          <span className="text-xs text-muted-foreground">(Principal)</span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {agentsLoading && (
                <p className="text-xs text-muted-foreground flex items-start gap-1">
                  <Loader2 className="h-3 w-3 mt-0.5 flex-shrink-0 animate-spin" />
                  Cargando lista de agentes...
                </p>
              )}
              {!agentsLoading && agents.length === 0 && (
                <p className="text-xs text-yellow-600 flex items-start gap-1">
                  <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  No hay agentes disponibles en el sistema
                </p>
              )}
              {!agentsLoading && agents.length > 0 && (
                <p className="text-xs text-muted-foreground flex items-start gap-1">
                  <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  Si no seleccionas un agente, se asignará automáticamente el agente por defecto de la plataforma
                </p>
              )}
              {agentsError && (
                <p className="text-xs text-red-500 flex items-start gap-1">
                  <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  Error al cargar agentes: {agentsError}
                </p>
              )}
            </div>
          )}

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
