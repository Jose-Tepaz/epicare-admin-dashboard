"use client"

import { AdminLayout } from "@/components/admin-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
  Paperclip,
  Edit,
  MoreHorizontal,
} from "lucide-react"
import { useState } from "react"
import Link from "next/link"

// Mock data for support ticket details
const getTicketDetails = (id: string) => {
  const tickets = {
    "SUP-001": {
      id: "SUP-001",
      subject: "Unable to upload documents for application",
      category: "Technical Support",
      priority: "High",
      status: "Open",
      user: {
        name: "Maria Rodriguez",
        email: "maria.rodriguez@email.com",
        phone: "+1 (555) 123-4567",
        id: "USR-001",
        avatar: "/placeholder.svg?height=40&width=40",
      },
      createdAt: "2024-01-15T10:30:00Z",
      lastUpdate: "2024-01-15T14:20:00Z",
      assignedTo: "John Admin",
      description:
        "I'm trying to upload my medical records for my health insurance application, but the system keeps showing an error message saying 'File format not supported' even though I'm uploading PDF files as instructed. I've tried multiple times with different files but the same error persists.",
      messages: [
        {
          id: 1,
          sender: "Maria Rodriguez",
          senderType: "user",
          message:
            "I'm trying to upload my medical records for my health insurance application, but the system keeps showing an error message saying 'File format not supported' even though I'm uploading PDF files as instructed.",
          timestamp: "2024-01-15T10:30:00Z",
          attachments: ["medical_records.pdf"],
        },
        {
          id: 2,
          sender: "John Admin",
          senderType: "admin",
          message:
            "Hi Maria, thank you for contacting us. I can see the issue you're experiencing. Can you please tell me the file size of the documents you're trying to upload?",
          timestamp: "2024-01-15T11:45:00Z",
          attachments: [],
        },
        {
          id: 3,
          sender: "Maria Rodriguez",
          senderType: "user",
          message: "The file is about 2.5MB. Is that too large?",
          timestamp: "2024-01-15T14:20:00Z",
          attachments: [],
        },
      ],
    },
  }

  return tickets[id as keyof typeof tickets] || null
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "High":
      return "bg-red-100 text-red-800 border-red-200"
    case "Medium":
      return "bg-yellow-100 text-yellow-800 border-yellow-200"
    case "Low":
      return "bg-green-100 text-green-800 border-green-200"
    default:
      return "bg-gray-100 text-gray-800 border-gray-200"
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "Open":
      return "bg-blue-100 text-blue-800 border-blue-200"
    case "In Progress":
      return "bg-orange-100 text-orange-800 border-orange-200"
    case "Resolved":
      return "bg-green-100 text-green-800 border-green-200"
    case "Closed":
      return "bg-gray-100 text-gray-800 border-gray-200"
    default:
      return "bg-gray-100 text-gray-800 border-gray-200"
  }
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case "Open":
      return <AlertCircle className="h-4 w-4" />
    case "In Progress":
      return <Clock className="h-4 w-4" />
    case "Resolved":
      return <CheckCircle className="h-4 w-4" />
    case "Closed":
      return <CheckCircle className="h-4 w-4" />
    default:
      return <AlertCircle className="h-4 w-4" />
  }
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function SupportTicketDetailsPage({ params }: { params: { id: string } }) {
  const ticket = getTicketDetails(params.id)

  const [newMessage, setNewMessage] = useState("")
  const [ticketStatus, setTicketStatus] = useState(ticket?.status || "")
  const [ticketPriority, setTicketPriority] = useState(ticket?.priority || "")

  // Ensure hooks are called at the top level
  if (!ticket) {
    return (
      <AdminLayout currentPage="Support">
        <div className="p-6">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Ticket Not Found</h2>
            <p className="text-gray-600 mb-4">The support ticket you're looking for doesn't exist.</p>
            <Link href="/admin/support">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Support
              </Button>
            </Link>
          </div>
        </div>
      </AdminLayout>
    )
  }

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      // Here you would typically send the message to your backend
      console.log("Sending message:", newMessage)
      setNewMessage("")
    }
  }

  const handleStatusChange = (newStatus: string) => {
    setTicketStatus(newStatus)
    // Here you would typically update the status in your backend
    console.log("Updating status to:", newStatus)
  }

  const handlePriorityChange = (newPriority: string) => {
    setTicketPriority(newPriority)
    // Here you would typically update the priority in your backend
    console.log("Updating priority to:", newPriority)
  }

  return (
    <AdminLayout currentPage="Support">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/support">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Support
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Ticket #{ticket.id}</h1>
              <p className="text-gray-600">{ticket.subject}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button variant="outline" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
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
                    <Badge className={getPriorityColor(ticketPriority)}>{ticketPriority}</Badge>
                    <Badge className={getStatusColor(ticketStatus)}>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(ticketStatus)}
                        {ticketStatus}
                      </div>
                    </Badge>
                    <Badge variant="outline" className="bg-gray-50">
                      <Tag className="h-3 w-3 mr-1" />
                      {ticket.category}
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
                  Conversation ({ticket.messages.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {ticket.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${message.senderType === "admin" ? "flex-row-reverse" : ""}`}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={message.senderType === "user" ? ticket.user.avatar : "/placeholder.svg?height=32&width=32"}
                      />
                      <AvatarFallback>
                        {message.sender
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`flex-1 ${message.senderType === "admin" ? "text-right" : ""}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{message.sender}</span>
                        <span className="text-xs text-gray-500">{formatDate(message.timestamp)}</span>
                        {message.senderType === "admin" && (
                          <Badge variant="outline" className="text-xs">
                            Admin
                          </Badge>
                        )}
                      </div>
                      <div
                        className={`p-3 rounded-lg ${
                          message.senderType === "admin"
                            ? "bg-blue-50 border border-blue-200"
                            : "bg-gray-50 border border-gray-200"
                        }`}
                      >
                        <p className="text-sm">{message.message}</p>
                        {message.attachments.length > 0 && (
                          <div className="mt-2 flex items-center gap-2">
                            <Paperclip className="h-4 w-4 text-gray-400" />
                            {message.attachments.map((attachment, index) => (
                              <span key={index} className="text-xs text-blue-600 hover:underline cursor-pointer">
                                {attachment}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Reply Form */}
            <Card>
              <CardHeader>
                <CardTitle>Reply to Ticket</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Type your response here..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  rows={4}
                />
                <div className="flex items-center justify-between">
                  <Button variant="outline" size="sm">
                    <Paperclip className="h-4 w-4 mr-2" />
                    Attach File
                  </Button>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => handleStatusChange("Resolved")}>
                      Mark as Resolved
                    </Button>
                    <Button onClick={handleSendMessage}>
                      <Send className="h-4 w-4 mr-2" />
                      Send Reply
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* User Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={ticket.user.avatar || "/placeholder.svg"} />
                    <AvatarFallback>
                      {ticket.user.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{ticket.user.name}</p>
                    <p className="text-sm text-gray-600">ID: {ticket.user.id}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span>{ticket.user.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span>{ticket.user.phone}</span>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full bg-transparent">
                  View User Profile
                </Button>
              </CardContent>
            </Card>

            {/* Ticket Management */}
            <Card>
              <CardHeader>
                <CardTitle>Ticket Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Status</label>
                  <select
                    value={ticketStatus}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Priority</label>
                  <select
                    value={ticketPriority}
                    onChange={(e) => handlePriorityChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Assigned To</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="John Admin">John Admin</option>
                    <option value="Sarah Support">Sarah Support</option>
                    <option value="Mike Manager">Mike Manager</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Ticket Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-gray-600">Created:</span>
                  <span>{formatDate(ticket.createdAt)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span className="text-gray-600">Last Update:</span>
                  <span>{formatDate(ticket.lastUpdate)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-gray-600">Assigned:</span>
                  <span>{ticket.assignedTo}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
