"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useCreateUser, useAvailableRoles } from "@/lib/hooks/use-users"
import { useAdminAuth } from "@/contexts/admin-auth-context"
import { Loader2 } from "lucide-react"

interface NewUserModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function NewUserModal({ open, onOpenChange, onSuccess }: NewUserModalProps) {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    phone: "",
    roleId: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { createUser, creating } = useCreateUser()
  const { roles: availableRoles, loading: rolesLoading } = useAvailableRoles()
  const { isSuperAdmin } = useAdminAuth()

  // Filtrar roles según permisos: solo super_admin puede asignar admin o super_admin
  const filteredRoles = availableRoles.filter(role => {
    if (role.name === 'admin' || role.name === 'super_admin') {
      return isSuperAdmin
    }
    return true
  })

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setFormData({
        email: "",
        password: "",
        first_name: "",
        last_name: "",
        phone: "",
        roleId: "",
      })
      setErrors({})
    }
  }, [open])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.email.trim()) {
      newErrors.email = "El email es requerido"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "El email no es válido"
    }

    if (!formData.password.trim()) {
      newErrors.password = "La contraseña es requerida"
    } else if (formData.password.length < 6) {
      newErrors.password = "La contraseña debe tener al menos 6 caracteres"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    const result = await createUser({
      email: formData.email.trim(),
      password: formData.password,
      first_name: formData.first_name.trim() || undefined,
      last_name: formData.last_name.trim() || undefined,
      phone: formData.phone.trim() || undefined,
      roleId: formData.roleId || undefined, // Pasar el roleId al endpoint
    })

    if (result.success && result.user) {
      // El rol ya fue asignado en el endpoint, no necesitamos asignarlo aquí

      // Reset form
      setFormData({
        email: "",
        password: "",
        first_name: "",
        last_name: "",
        phone: "",
        roleId: "",
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
          <DialogTitle>Registrar Nuevo Usuario</DialogTitle>
          <DialogDescription>
            Crea un nuevo usuario en el sistema. El usuario podrá iniciar sesión con el email y contraseña proporcionados.
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

          <div className="space-y-2">
            <Label htmlFor="password">
              Contraseña <span className="text-red-500">*</span>
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={formData.password}
              onChange={(e) => handleChange("password", e.target.value)}
              className={errors.password ? "border-red-500" : ""}
            />
            {errors.password && (
              <p className="text-sm text-red-500">{errors.password}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">Nombre</Label>
              <Input
                id="first_name"
                type="text"
                placeholder="Juan"
                value={formData.first_name}
                onChange={(e) => handleChange("first_name", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_name">Apellido</Label>
              <Input
                id="last_name"
                type="text"
                placeholder="Pérez"
                value={formData.last_name}
                onChange={(e) => handleChange("last_name", e.target.value)}
              />
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
            <Label htmlFor="role">Rol (Opcional)</Label>
            <Select 
              value={formData.roleId} 
              onValueChange={(value) => handleChange("roleId", value)}
              disabled={rolesLoading || creating}
            >
              <SelectTrigger id="role">
                <SelectValue placeholder="Seleccionar rol (opcional)" />
              </SelectTrigger>
              <SelectContent>
                {filteredRoles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              Puedes asignar un rol al usuario ahora o hacerlo más tarde desde su perfil.
            </p>
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
