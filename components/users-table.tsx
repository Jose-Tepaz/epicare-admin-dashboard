"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Eye, Search, Loader2, Mail, Phone, Shield, UserPlus, Trash2 } from "lucide-react"
import { useUsers, useDeleteUser } from "@/lib/hooks/use-users"
import { useAdminAuth } from "@/contexts/admin-auth-context"
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
import { NewUserModal } from "@/components/new-user-modal"
import { format } from "date-fns"
import { es } from "date-fns/locale"

const getInitials = (firstName: string | null, lastName: string | null, email: string) => {
  if (firstName && lastName) {
    return `${firstName[0]}${lastName[0]}`.toUpperCase()
  }
  if (firstName) {
    return firstName.slice(0, 2).toUpperCase()
  }
  return email.slice(0, 2).toUpperCase()
}

export function UsersTable() {
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)

  const { users, loading, error, pagination, refetch } = useUsers(
    {
      role: roleFilter === "all" ? undefined : [roleFilter],
      search: searchTerm || undefined,
    },
    { page, pageSize: 25 }
  )

  const { isSuperAdmin, isAdmin, user: currentUser } = useAdminAuth()
  const { deleteUser, deleting } = useDeleteUser()

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    const result = await deleteUser(userId)
    if (result.success) {
      refetch()
    }
  }

  // Determinar si el usuario actual puede eliminar a este usuario
  const canDeleteUser = (user: any) => {
    if (!isAdmin && !isSuperAdmin) return false
    if (currentUser?.id === user.id) return false // No puede eliminarse a sí mismo
    
    // Verificar si el usuario tiene rol admin o super_admin
    const userHasAdminRole = user.roles.some((r: any) => ['admin', 'super_admin'].includes(r.name))
    
    // Si el usuario tiene rol admin, solo super_admin puede eliminarlo
    if (userHasAdminRole && !isSuperAdmin) return false
    
    return true
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-red-600">Error al cargar usuarios: {error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-xl font-semibold">Usuarios</CardTitle>
          <div className="flex flex-col sm:flex-row gap-2">
            {(isAdmin || isSuperAdmin) && (
              <Button onClick={() => setModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                <UserPlus className="h-4 w-4 mr-2" />
                Nuevo Usuario
              </Button>
            )}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar usuarios..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full sm:w-64"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los Roles</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="support_staff">Support Staff</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No se encontraron usuarios
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Usuario</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Contacto</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Roles</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Applications</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Fecha de Registro</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const userName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email
                    const hasAdminRole = user.roles.some(r => ['admin', 'super_admin', 'support_staff'].includes(r.name))
                    const isTargetAdmin = user.roles.some(r => ['admin', 'super_admin'].includes(r.name))

                    return (
                      <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="bg-blue-100 text-blue-700 text-sm">
                                {getInitials(user.first_name, user.last_name, user.email)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-gray-900">{userName}</p>
                              <p className="text-sm text-gray-500">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Mail className="h-3 w-3" />
                              {user.email}
                            </div>
                            {user.phone && (
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Phone className="h-3 w-3" />
                                {user.phone}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {user.roles.length > 0 ? (
                              user.roles.map((role) => (
                                <Badge 
                                  key={role.id} 
                                  variant={hasAdminRole ? "default" : "secondary"}
                                  className="text-xs"
                                >
                                  {hasAdminRole && <Shield className="h-3 w-3 mr-1" />}
                                  {role.name}
                                </Badge>
                              ))
                            ) : (
                              <Badge variant="outline" className="text-xs">user</Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="secondary">
                            {user.application_count} {user.application_count === 1 ? 'application' : 'applications'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-gray-600">
                            {format(new Date(user.created_at), 'dd MMM yyyy', { locale: es })}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Link href={`/admin/users/${user.id}`}>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4 mr-1" />
                                Ver
                              </Button>
                            </Link>
                            {canDeleteUser(user) && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    disabled={deleting}
                                  >
                                    {deleting ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-4 w-4" />
                                    )}
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      {isTargetAdmin ? "⚠️ Eliminar Administrador" : "¿Estás seguro?"}
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {isTargetAdmin ? (
                                        <>
                                          <p className="font-semibold text-red-600 mb-2">
                                            Advertencia: Estás a punto de eliminar un usuario con rol de administrador.
                                          </p>
                                          <p>
                                            Esta acción no se puede deshacer. Esto eliminará permanentemente la cuenta de{" "}
                                            <span className="font-semibold">{userName}</span> ({user.email}) y todos sus datos asociados, incluyendo sus permisos de administrador.
                                          </p>
                                        </>
                                      ) : (
                                        <>
                                          Esta acción no se puede deshacer. Esto eliminará permanentemente la cuenta de{" "}
                                          <span className="font-semibold">{userName}</span> ({user.email}) y todos sus datos asociados.
                                        </>
                                      )}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteUser(user.id, user.email)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      {isTargetAdmin ? "Eliminar Administrador" : "Eliminar"}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  Página {pagination.page} de {pagination.totalPages}
                  <span className="ml-2 text-gray-500">
                    ({users.length} usuarios)
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={pagination.page === 1}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                    disabled={pagination.page === pagination.totalPages}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
      <NewUserModal 
        open={modalOpen} 
        onOpenChange={setModalOpen}
        onSuccess={() => {
          refetch()
        }}
      />
    </Card>
  )
}
