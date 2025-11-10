"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { AdminLayout } from "@/components/admin-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  Shield,
  Loader2,
  Save,
  X,
  Plus,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react"
import { useUserDetails, useUpdateUser, useAssignRole, useRemoveRole, useAvailableRoles } from "@/lib/hooks/use-users"
import { useAdminAuth } from "@/contexts/admin-auth-context"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import Link from "next/link"

const statusConfig = {
  draft: { label: "Draft", icon: FileText, color: "bg-gray-100 text-gray-800" },
  submitted: { label: "Submitted", icon: FileText, color: "bg-blue-100 text-blue-800" },
  pending_approval: { label: "Pending", icon: Clock, color: "bg-yellow-100 text-yellow-800" },
  approved: { label: "Approved", icon: CheckCircle, color: "bg-green-100 text-green-800" },
  active: { label: "Active", icon: CheckCircle, color: "bg-green-100 text-green-800" },
  rejected: { label: "Rejected", icon: XCircle, color: "bg-red-100 text-red-800" },
  cancelled: { label: "Cancelled", icon: XCircle, color: "bg-gray-100 text-gray-800" },
}

export default function UserDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const userId = params?.id as string
  const { user, loading, error, refetch } = useUserDetails(userId)
  const { updateUser, updating } = useUpdateUser()
  const { assignRole, assigning } = useAssignRole()
  const { removeRole, removing } = useRemoveRole()
  const { roles: availableRoles } = useAvailableRoles()
  const { permissions } = useAdminAuth()

  const [isEditing, setIsEditing] = useState(false)
  const [editedUser, setEditedUser] = useState({
    first_name: "",
    last_name: "",
    phone: "",
  })
  const [selectedRole, setSelectedRole] = useState("")

  if (loading) {
    return (
      <AdminLayout currentPage="Users">
        <div className="flex-1 p-4 md:p-6 flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-gray-400" />
        </div>
      </AdminLayout>
    )
  }

  if (error || !user) {
    return (
      <AdminLayout currentPage="Users">
        <div className="flex-1 p-4 md:p-6">
          <Card>
            <CardContent className="p-6">
              <p className="text-red-600">{error || "Usuario no encontrado"}</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => router.push("/admin/users")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver a Usuarios
              </Button>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    )
  }

  const userName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email

  const handleEdit = () => {
    setEditedUser({
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      phone: user.phone || "",
    })
    setIsEditing(true)
  }

  const handleSave = async () => {
    const success = await updateUser(user.id, editedUser)
    if (success) {
      setIsEditing(false)
      refetch()
    }
  }

  const handleAssignRole = async () => {
    if (!selectedRole) return
    const success = await assignRole(user.id, selectedRole)
    if (success) {
      setSelectedRole("")
      refetch()
    }
  }

  const handleRemoveRole = async (userRoleId: string) => {
    const success = await removeRole(userRoleId)
    if (success) {
      refetch()
    }
  }

  return (
    <AdminLayout currentPage="Users">
      <div className="flex-1 space-y-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/admin/users")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Detalle de Usuario</h2>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
          </div>
          {permissions.canEditUsers && !isEditing && (
            <Button onClick={handleEdit}>Editar</Button>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Main Info */}
          <div className="md:col-span-2 space-y-6">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Información Personal
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="first_name">Nombre</Label>
                        <Input
                          id="first_name"
                          value={editedUser.first_name}
                          onChange={(e) => setEditedUser({ ...editedUser, first_name: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="last_name">Apellido</Label>
                        <Input
                          id="last_name"
                          value={editedUser.last_name}
                          onChange={(e) => setEditedUser({ ...editedUser, last_name: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">Teléfono</Label>
                        <Input
                          id="phone"
                          value={editedUser.phone}
                          onChange={(e) => setEditedUser({ ...editedUser, phone: e.target.value })}
                        />
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
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Guardar
                          </>
                        )}
                      </Button>
                      <Button variant="outline" onClick={() => setIsEditing(false)}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <User className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Nombre Completo</p>
                        <p className="font-medium">{userName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-50 rounded-lg">
                        <Mail className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="font-medium">{user.email}</p>
                      </div>
                    </div>
                    {user.phone && (
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-50 rounded-lg">
                          <Phone className="h-4 w-4 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Teléfono</p>
                          <p className="font-medium">{user.phone}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-50 rounded-lg">
                        <Calendar className="h-4 w-4 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Fecha de Registro</p>
                        <p className="font-medium">
                          {format(new Date(user.created_at), 'dd MMMM yyyy', { locale: es })}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Applications History */}
            <Card>
              <CardHeader>
                <CardTitle>Historial de Applications ({user.applications?.length || 0})</CardTitle>
              </CardHeader>
              <CardContent>
                {user.applications && user.applications.length > 0 ? (
                  <div className="space-y-3">
                    {user.applications.map((app: any) => {
                      const status = statusConfig[app.status as keyof typeof statusConfig] || statusConfig.draft
                      const StatusIcon = status.icon

                      return (
                        <div key={app.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Badge className={status.color}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {status.label}
                              </Badge>
                              {app.insurance_companies && (
                                <span className="text-sm text-gray-600">{app.insurance_companies.name}</span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {format(new Date(app.created_at), 'dd MMM yyyy HH:mm', { locale: es })}
                            </p>
                          </div>
                          <Link href={`/admin/requests/${app.id}`}>
                            <Button variant="ghost" size="sm">
                              Ver Detalle
                            </Button>
                          </Link>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-center py-8 text-gray-500">
                    Este usuario no tiene applications
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Roles */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Roles
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {user.roles && user.roles.length > 0 ? (
                    user.roles.map((role: any) => (
                      <div key={role.id} className="flex items-center justify-between p-2 border rounded">
                        <Badge variant="default">{role.name}</Badge>
                        {permissions.canAssignRoles && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveRole(role.user_role_id)}
                            disabled={removing}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">Sin roles asignados</p>
                  )}
                </div>

                {permissions.canAssignRoles && (
                  <div className="pt-4 border-t space-y-2">
                    <Label>Asignar Nuevo Rol</Label>
                    <Select value={selectedRole} onValueChange={setSelectedRole}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar rol" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRoles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={handleAssignRole}
                      disabled={assigning || !selectedRole}
                      className="w-full"
                      size="sm"
                    >
                      {assigning ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                          Asignando...
                        </>
                      ) : (
                        <>
                          <Plus className="h-3 w-3 mr-2" />
                          Asignar Rol
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Estadísticas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Total Applications</p>
                  <p className="text-2xl font-bold">{user.applications?.length || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Applications Activas</p>
                  <p className="text-2xl font-bold">
                    {user.applications?.filter((a: any) => a.status === 'active' || a.status === 'approved').length || 0}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
