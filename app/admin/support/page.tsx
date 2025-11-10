"use client"

import { AdminLayout } from "@/components/admin-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import {
  Search,
  Clock,
  AlertCircle,
  CheckCircle,
  MessageCircle,
  User,
  Calendar,
  Tag,
  Eye,
  MessageSquare,
} from "lucide-react"
import { useState } from "react"

// Mock data for support requests
const supportRequests = [
  {
    id: "SUP-001",
    subject: "Unable to upload documents for application",
    category: "Technical Support",
    priority: "High",
    status: "Open",
    user: {
      name: "Maria Rodriguez",
      email: "maria.rodriguez@email.com",
      id: "USR-001",
    },
    createdAt: "2024-01-15T10:30:00Z",
    lastUpdate: "2024-01-15T14:20:00Z",
    messages: 3,
    description: "I'm trying to upload my medical records but the system keeps showing an error message...",
  },
  {
    id: "SUP-002",
    subject: "Question about family coverage options",
    category: "Policy Questions",
    priority: "Medium",
    status: "In Progress",
    user: {
      name: "John Smith",
      email: "john.smith@email.com",
      id: "USR-002",
    },
    createdAt: "2024-01-14T16:45:00Z",
    lastUpdate: "2024-01-15T09:15:00Z",
    messages: 5,
    description: "I need clarification on adding my spouse and children to my current policy...",
  },
  {
    id: "SUP-003",
    subject: "Payment processing issue",
    category: "Payment & Billing",
    priority: "High",
    status: "Open",
    user: {
      name: "Sarah Johnson",
      email: "sarah.johnson@email.com",
      id: "USR-003",
    },
    createdAt: "2024-01-15T08:20:00Z",
    lastUpdate: "2024-01-15T08:20:00Z",
    messages: 1,
    description: "My payment was declined but my bank says there are no issues with my account...",
  },
  {
    id: "SUP-004",
    subject: "Application status inquiry",
    category: "Application Issues",
    priority: "Low",
    status: "Resolved",
    user: {
      name: "David Chen",
      email: "david.chen@email.com",
      id: "USR-004",
    },
    createdAt: "2024-01-13T11:00:00Z",
    lastUpdate: "2024-01-14T15:30:00Z",
    messages: 4,
    description: "I submitted my application 5 days ago and haven't received any updates...",
  },
  {
    id: "SUP-005",
    subject: "Login issues with mobile app",
    category: "Technical Support",
    priority: "Medium",
    status: "In Progress",
    user: {
      name: "Lisa Wang",
      email: "lisa.wang@email.com",
      id: "USR-005",
    },
    createdAt: "2024-01-14T13:15:00Z",
    lastUpdate: "2024-01-15T11:45:00Z",
    messages: 2,
    description: "I can't log into the mobile app even though my credentials work on the website...",
  },
]

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

export default function SupportRequestsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")

  const filteredRequests = supportRequests.filter((request) => {
    const matchesSearch =
      request.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.category.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || request.status === statusFilter
    const matchesPriority = priorityFilter === "all" || request.priority === priorityFilter

    return matchesSearch && matchesStatus && matchesPriority
  })

  const stats = {
    total: supportRequests.length,
    open: supportRequests.filter((r) => r.status === "Open").length,
    inProgress: supportRequests.filter((r) => r.status === "In Progress").length,
    resolved: supportRequests.filter((r) => r.status === "Resolved").length,
    highPriority: supportRequests.filter((r) => r.priority === "High").length,
  }

  return (
    <AdminLayout currentPage="Support">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Support Requests</h1>
            <p className="text-gray-600">Manage customer support tickets and inquiries</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Requests</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <MessageCircle className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Open</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.open}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">In Progress</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.inProgress}</p>
                </div>
                <Clock className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Resolved</p>
                  <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">High Priority</p>
                  <p className="text-2xl font-bold text-red-600">{stats.highPriority}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by subject, user, or category..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>

                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Priority</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Support Requests Table */}
        <Card>
          <CardHeader>
            <CardTitle>Support Requests ({filteredRequests.length})</CardTitle>
            <CardDescription>Manage and respond to customer support inquiries</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredRequests.map((request) => (
                <div
                  key={request.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-medium text-gray-900">#{request.id}</span>
                        <Badge className={getPriorityColor(request.priority)}>{request.priority}</Badge>
                        <Badge className={getStatusColor(request.status)}>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(request.status)}
                            {request.status}
                          </div>
                        </Badge>
                        <Badge variant="outline" className="bg-gray-50">
                          <Tag className="h-3 w-3 mr-1" />
                          {request.category}
                        </Badge>
                      </div>

                      <h3 className="font-semibold text-gray-900 mb-2">{request.subject}</h3>
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">{request.description}</p>

                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          <span>{request.user.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>Created {formatDate(request.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-4 w-4" />
                          <span>{request.messages} messages</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <Link href={`/admin/support/${request.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </Link>
                      <Link href={`/admin/support/${request.id}`}>
                        <Button variant="outline" size="sm">
                          <MessageCircle className="h-4 w-4 mr-1" />
                          Reply
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}

              {filteredRequests.length === 0 && (
                <div className="text-center py-8">
                  <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No support requests found</h3>
                  <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
