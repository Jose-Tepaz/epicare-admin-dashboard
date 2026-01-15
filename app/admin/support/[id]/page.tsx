"use client"


import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  ArrowLeft,
  Clock,
  AlertCircle,
  CheckCircle,
  User,
  Mail,
  Phone,
  Calendar,
  Tag,
  MessageSquare,
  Send,
  Loader2,
} from "lucide-react"
import { useState } from "react"
import Link from "next/link"
import { useTicketDetails, useCreateTicketMessage, useUpdateTicket } from "@/lib/hooks/use-tickets"
import { useAdminData } from "@/contexts/admin-data-context"
import type { TicketStatus, TicketPriority } from "@/lib/types/admin"
import { useRouter } from "next/navigation"

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "urgent":
      return "bg-red-600 text-white border-red-700"
    case "high":
      return "bg-red-100 text-red-800 border-red-200"
    case "medium":
      return "bg-yellow-100 text-yellow-800 border-yellow-200"
    case "low":
      return "bg-green-100 text-green-800 border-green-200"
    default:
      return "bg-gray-100 text-gray-800 border-gray-200"
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "open":
      return "bg-blue-100 text-blue-800 border-blue-200"
    case "in_progress":
      return "bg-orange-100 text-orange-800 border-orange-200"
    case "waiting_on_customer":
      return "bg-purple-100 text-purple-800 border-purple-200"
    case "resolved":
      return "bg-green-100 text-green-800 border-green-200"
    case "closed":
      return "bg-gray-100 text-gray-800 border-gray-200"
    case "cancelled":
      return "bg-red-100 text-red-800 border-red-200"
    default:
      return "bg-gray-100 text-gray-800 border-gray-200"
  }
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case "open":
      return <AlertCircle className="h-4 w-4" />
    case "in_progress":
      return <Clock className="h-4 w-4" />
    case "waiting_on_customer":
      return <Clock className="h-4 w-4" />
    case "resolved":
      return <CheckCircle className="h-4 w-4" />
    case "closed":
      return <CheckCircle className="h-4 w-4" />
    case "cancelled":
      return <AlertCircle className="h-4 w-4" />
    default:
      return <AlertCircle className="h-4 w-4" />
  }
}

const formatStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    'open': 'Abierto',
    'in_progress': 'En Progreso',
    'waiting_on_customer': 'Esperando Cliente',
    'resolved': 'Resuelto',
    'closed': 'Cerrado',
    'cancelled': 'Cancelado',
  }
  return labels[status] || status
}

const formatPriorityLabel = (priority: string): string => {
  const labels: Record<string, string> = {
    'urgent': 'Urgente',
    'high': 'Alta',
    'medium': 'Media',
    'low': 'Baja',
  }
  return labels[priority] || priority
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("es-ES", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const getUserDisplayName = (user: any): string => {
  if (!user) return 'Usuario desconocido'
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ')
  return fullName || user.email || 'Usuario sin nombre'
}

const getInitials = (user: any): string => {
  if (!user) return 'U'
  if (user.first_name && user.last_name) {
    return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
  }
  if (user.email) {
    return user.email.substring(0, 2).toUpperCase()
  }
  return 'U'
}

const isAdminOrStaff = (role?: string): boolean => {
  return ['admin', 'super_admin', 'support_staff', 'agent'].includes(role || '')
}

export default function SupportTicketDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { ticket, messages, loading, error, refetch } = useTicketDetails(params.id)
  const { createMessage, loading: sendingMessage } = useCreateTicketMessage()
  const { updateStatus, updatePriority, assignTicket, loading: updatingTicket } = useUpdateTicket()
  const { refreshStats } = useAdminData()

  const [newMessage, setNewMessage] = useState("")
  const [localStatus, setLocalStatus] = useState<TicketStatus | null>(null)
  const [localPriority, setLocalPriority] = useState<TicketPriority | null>(null)

  const currentStatus = localStatus || ticket?.status
  const currentPriority = localPriority || ticket?.priority

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !ticket) return

    const message = await createMessage(ticket.id, newMessage)
    if (message) {
      setNewMessage("")
      refetch() // Refresh ticket details
      refreshStats() // Refresh admin stats (e.g. recent activity)
    }
  }

  const handleStatusChange = async (newStatus: TicketStatus) => {
    if (!ticket) return
    
    setLocalStatus(newStatus)
    const success = await updateStatus(ticket.id, newStatus)
    if (success) {
      refetch()
      refreshStats()
    } else {
      setLocalStatus(null)
    }
  }

  const handlePriorityChange = async (newPriority: TicketPriority) => {
    if (!ticket) return
    
    setLocalPriority(newPriority)
    const success = await updatePriority(ticket.id, newPriority)
    if (success) {
      refetch()
      refreshStats()
    } else {
      setLocalPriority(null)
    }
  }

  if (loading) {
    return (
        <div className="p-6">
          <div className="flex justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-gray-400" />
          </div>
        </div>
    )
  }

  if (error || !ticket) {
    return (
        <div className="p-6">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Ticket No Encontrado</h2>
            <p className="text-gray-600 mb-4">
              {error || "El ticket que buscas no existe."}
            </p>
            <Link href="/admin/support">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver a Soporte
              </Button>
            </Link>
          </div>
        </div>
    )
  }

  return (
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/support">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver a Soporte
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Ticket #{ticket.ticket_number}</h1>
              <p className="text-gray-600">{ticket.subject}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Ticket Details */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-3">
                    <Badge className={getPriorityColor(currentPriority || 'medium')}>
                      {formatPriorityLabel(currentPriority || 'medium')}
                    </Badge>
                    <Badge className={getStatusColor(currentStatus || 'open')}>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(currentStatus || 'open')}
                        {formatStatusLabel(currentStatus || 'open')}
                      </div>
                    </Badge>
                  </CardTitle>
                </div>
                <CardDescription>{ticket.description}</CardDescription>
              </CardHeader>
            </Card>

            {/* Messages */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Conversación ({messages.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {messages.map((message) => {
                  const isAdmin = isAdminOrStaff(message.sender?.role)
                  
                  return (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${isAdmin ? "flex-row-reverse" : ""}`}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {getInitials(message.sender)}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`flex-1 ${isAdmin ? "text-right" : ""}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">
                            {getUserDisplayName(message.sender)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDate(message.created_at)}
                          </span>
                          {isAdmin && (
                            <Badge variant="outline" className="text-xs">
                              Staff
                            </Badge>
                          )}
                          {message.is_internal && (
                            <Badge variant="outline" className="text-xs bg-yellow-50">
                              Interno
                            </Badge>
                          )}
                        </div>
                        <div
                          className={`p-3 rounded-lg ${
                            isAdmin
                              ? "bg-blue-50 border border-blue-200"
                              : "bg-gray-50 border border-gray-200"
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}

                {messages.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    No hay mensajes aún
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Reply Form */}
            <Card>
              <CardHeader>
                <CardTitle>Responder al Ticket</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Escribe tu respuesta aquí..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  rows={4}
                  disabled={sendingMessage}
                />
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    {sendingMessage && "Enviando mensaje..."}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleStatusChange("resolved")}
                      disabled={updatingTicket || currentStatus === "resolved"}
                    >
                      {updatingTicket ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      )}
                      Marcar como Resuelto
                    </Button>
                    <Button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || sendingMessage}
                    >
                      {sendingMessage ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      Enviar Respuesta
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* User Information */}
            {ticket.client && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Información del Cliente
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {getInitials(ticket.client)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{getUserDisplayName(ticket.client)}</p>
                      <p className="text-sm text-gray-600">{ticket.client.email}</p>
                    </div>
                  </div>
                  {ticket.client.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span>{ticket.client.phone}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Ticket Management */}
            <Card>
              <CardHeader>
                <CardTitle>Gestión del Ticket</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Estado</label>
                  <select
                    value={currentStatus || 'open'}
                    onChange={(e) => handleStatusChange(e.target.value as TicketStatus)}
                    disabled={updatingTicket}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <option value="open">Abierto</option>
                    <option value="in_progress">En Progreso</option>
                    <option value="waiting_on_customer">Esperando Cliente</option>
                    <option value="resolved">Resuelto</option>
                    <option value="closed">Cerrado</option>
                    <option value="cancelled">Cancelado</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Prioridad</label>
                  <select
                    value={currentPriority || 'medium'}
                    onChange={(e) => handlePriorityChange(e.target.value as TicketPriority)}
                    disabled={updatingTicket}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <option value="low">Baja</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                    <option value="urgent">Urgente</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Ticket Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Línea de Tiempo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-gray-600">Creado:</span>
                  <span>{formatDate(ticket.created_at)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span className="text-gray-600">Última Actualización:</span>
                  <span>{formatDate(ticket.updated_at)}</span>
                </div>
                {ticket.assigned && (
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-gray-600">Asignado a:</span>
                    <span>{getUserDisplayName(ticket.assigned)}</span>
                  </div>
                )}
                {ticket.closed_at && (
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                    <span className="text-gray-600">Cerrado:</span>
                    <span>{formatDate(ticket.closed_at)}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
  )
}
