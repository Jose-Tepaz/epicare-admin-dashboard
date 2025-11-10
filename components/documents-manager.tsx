"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  FileText,
  Download,
  Eye,
  Send,
  Search,
  Plus,
  Mail,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
} from "lucide-react"
import { NewDocumentRequestModal } from "@/components/new-document-request-modal"

const mockDocuments = [
  {
    id: "DOC-001",
    name: "Medical Certificate",
    applicant: "Maria Rodriguez",
    requestId: "REQ-001",
    type: "medical",
    status: "received",
    uploadedDate: "2024-01-15",
    size: "2.4 MB",
    format: "PDF",
    verified: true,
    priorActions: [
      { date: "2024-01-10", action: "Document requested", user: "Admin", status: "completed" },
      { date: "2024-01-15", action: "Document uploaded by client", user: "Maria Rodriguez", status: "completed" },
      { date: "2024-01-15", action: "Initial review completed", user: "Dr. Smith", status: "completed" },
    ],
  },
  {
    id: "DOC-002",
    name: "Driver's License",
    applicant: "Carlos Mendez",
    requestId: "REQ-002",
    type: "identification",
    status: "pending",
    uploadedDate: null,
    size: null,
    format: null,
    verified: false,
    priorActions: [
      { date: "2024-01-12", action: "Document requested", user: "Admin", status: "completed" },
      { date: "2024-01-14", action: "Follow-up email sent", user: "Support Team", status: "completed" },
      { date: "2024-01-16", action: "Awaiting client response", user: "System", status: "pending" },
    ],
  },
  {
    id: "DOC-003",
    name: "Income Statement",
    applicant: "Ana Gutierrez",
    requestId: "REQ-003",
    type: "financial",
    status: "received",
    uploadedDate: "2024-01-14",
    size: "1.8 MB",
    format: "PDF",
    verified: false,
    priorActions: [
      { date: "2024-01-08", action: "Document requested", user: "Admin", status: "completed" },
      { date: "2024-01-14", action: "Document uploaded by client", user: "Ana Gutierrez", status: "completed" },
      { date: "2024-01-14", action: "Verification required", user: "Finance Team", status: "in-progress" },
    ],
  },
  {
    id: "DOC-004",
    name: "Property Deed",
    applicant: "Jose Tepaz",
    requestId: "REQ-004",
    type: "property",
    status: "requested",
    uploadedDate: null,
    size: null,
    format: null,
    verified: false,
    priorActions: [
      { date: "2024-01-16", action: "Document requested", user: "Admin", status: "completed" },
      { date: "2024-01-16", action: "Legal review required", user: "Legal Team", status: "pending" },
    ],
  },
]

const mockRequests = [
  {
    id: "REQ-005",
    applicant: "Laura Sanchez",
    email: "laura.sanchez@email.com",
    missingDocs: ["Birth Certificate", "Proof of Address"],
    priority: "high",
  },
  {
    id: "REQ-006",
    applicant: "Miguel Torres",
    email: "miguel.torres@email.com",
    missingDocs: ["Tax Returns"],
    priority: "medium",
  },
]

const mockPriorActions = [
  {
    id: "PA-001",
    documentId: "DOC-003",
    documentName: "Income Statement",
    applicant: "Ana Gutierrez",
    action: "Financial verification required",
    priority: "high",
    assignedTo: "Finance Team",
    dueDate: "2024-01-20",
    status: "pending",
    description: "Income statement needs verification against tax records",
  },
  {
    id: "PA-002",
    documentId: "DOC-004",
    documentName: "Property Deed",
    applicant: "Jose Tepaz",
    action: "Legal review required",
    priority: "medium",
    assignedTo: "Legal Team",
    dueDate: "2024-01-22",
    status: "in-progress",
    description: "Property deed requires legal validation and authenticity check",
  },
  {
    id: "PA-003",
    documentId: "DOC-002",
    documentName: "Driver's License",
    applicant: "Carlos Mendez",
    action: "Follow-up required",
    priority: "low",
    assignedTo: "Support Team",
    dueDate: "2024-01-18",
    status: "overdue",
    description: "Client has not responded to document request after multiple attempts",
  },
]

const statusConfig = {
  received: { label: "Received", color: "bg-green-100 text-green-800" },
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800" },
  requested: { label: "Requested", color: "bg-blue-100 text-blue-800" },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-800" },
}

const typeConfig = {
  medical: { label: "Medical", color: "bg-red-100 text-red-800" },
  identification: { label: "ID", color: "bg-blue-100 text-blue-800" },
  financial: { label: "Financial", color: "bg-green-100 text-green-800" },
  property: { label: "Property", color: "bg-purple-100 text-purple-800" },
}

const priorityConfig = {
  high: { label: "High", color: "bg-red-100 text-red-800" },
  medium: { label: "Medium", color: "bg-yellow-100 text-yellow-800" },
  low: { label: "Low", color: "bg-green-100 text-green-800" },
}

const actionStatusConfig = {
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  "in-progress": { label: "In Progress", color: "bg-blue-100 text-blue-800", icon: AlertTriangle },
  completed: { label: "Completed", color: "bg-green-100 text-green-800", icon: CheckCircle },
  overdue: { label: "Overdue", color: "bg-red-100 text-red-800", icon: XCircle },
}

export function DocumentsManager() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [selectedDocument, setSelectedDocument] = useState<any>(null)

  const filteredDocuments = mockDocuments.filter((doc) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.applicant.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.requestId.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || doc.status === statusFilter
    const matchesType = typeFilter === "all" || doc.type === typeFilter

    return matchesSearch && matchesStatus && matchesType
  })

  const handleVerifyDocument = (docId: string) => {
    console.log(`Verifying document ${docId}`)
    // Here you would implement the actual verification logic
  }

  const showPriorActions = (doc: any) => {
    setSelectedDocument(doc)
  }

  return (
    <Tabs defaultValue="documents" className="space-y-4">
      <TabsList>
        <TabsTrigger value="documents">Document Library</TabsTrigger>
        <TabsTrigger value="requests">Document Requests</TabsTrigger>
        <TabsTrigger value="prior-actions">Prior Action Required</TabsTrigger>
      </TabsList>

      <TabsContent value="documents">
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="text-xl font-semibold">Document Library</CardTitle>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search documents..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full sm:w-64"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="received">Received</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="requested">Requested</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full sm:w-32">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="medical">Medical</SelectItem>
                    <SelectItem value="identification">ID</SelectItem>
                    <SelectItem value="financial">Financial</SelectItem>
                    <SelectItem value="property">Property</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Document</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Applicant</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Request ID</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Type</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Verified</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Details</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDocuments.map((doc) => (
                    <tr key={doc.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-gray-500" />
                          <span className="font-medium text-gray-900">{doc.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-gray-900">{doc.applicant}</td>
                      <td className="py-4 px-4">
                        <span className="font-medium text-blue-600">{doc.requestId}</span>
                      </td>
                      <td className="py-4 px-4">
                        <Badge className={`${typeConfig[doc.type as keyof typeof typeConfig].color} w-fit`}>
                          {typeConfig[doc.type as keyof typeof typeConfig].label}
                        </Badge>
                      </td>
                      <td className="py-4 px-4">
                        <Badge className={`${statusConfig[doc.status as keyof typeof statusConfig].color} w-fit`}>
                          {statusConfig[doc.status as keyof typeof statusConfig].label}
                        </Badge>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          {doc.verified ? (
                            <Badge className="bg-green-100 text-green-800 w-fit">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Verified
                            </Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-800 w-fit">
                              <XCircle className="h-3 w-3 mr-1" />
                              Unverified
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-gray-600">
                        {doc.uploadedDate ? (
                          <div className="text-sm">
                            <div>{doc.uploadedDate}</div>
                            <div className="text-gray-500">
                              {doc.size} • {doc.format}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">Not uploaded</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 bg-transparent"
                                onClick={() => showPriorActions(doc)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Prior Actions - {doc.name}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                                  <div>
                                    <span className="text-sm font-medium text-gray-600">Applicant:</span>
                                    <p className="text-gray-900">{doc.applicant}</p>
                                  </div>
                                  <div>
                                    <span className="text-sm font-medium text-gray-600">Request ID:</span>
                                    <p className="text-blue-600 font-medium">{doc.requestId}</p>
                                  </div>
                                </div>
                                <div className="space-y-3">
                                  <h4 className="font-medium text-gray-900">Action History</h4>
                                  {doc.priorActions.map((action: any, index: number) => {
                                    const StatusIcon =
                                      actionStatusConfig[action.status as keyof typeof actionStatusConfig].icon
                                    return (
                                      <div
                                        key={index}
                                        className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg"
                                      >
                                        <StatusIcon className="h-5 w-5 text-gray-500 mt-0.5" />
                                        <div className="flex-1">
                                          <div className="flex items-center justify-between">
                                            <span className="font-medium text-gray-900">{action.action}</span>
                                            <Badge
                                              className={`${actionStatusConfig[action.status as keyof typeof actionStatusConfig].color} w-fit`}
                                            >
                                              {
                                                actionStatusConfig[action.status as keyof typeof actionStatusConfig]
                                                  .label
                                              }
                                            </Badge>
                                          </div>
                                          <div className="text-sm text-gray-600 mt-1">
                                            {action.date} • {action.user}
                                          </div>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>

                          {doc.status === "received" ? (
                            <>
                              <Button size="sm" variant="outline" className="h-8 w-8 p-0 bg-transparent">
                                <Download className="h-4 w-4" />
                              </Button>
                              {!doc.verified && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                                  onClick={() => handleVerifyDocument(doc.id)}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Verify
                                </Button>
                              )}
                            </>
                          ) : (
                            <Button size="sm" variant="outline" className="h-8 bg-transparent">
                              <Mail className="h-4 w-4 mr-1" />
                              Request
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="requests">
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="text-xl font-semibold">Document Requests</CardTitle>
              <NewDocumentRequestModal>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  New Request
                </Button>
              </NewDocumentRequestModal>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockRequests.map((request) => (
                <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-blue-600">{request.id}</span>
                        <Badge
                          className={`${
                            request.priority === "high" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"
                          } w-fit`}
                        >
                          {request.priority} priority
                        </Badge>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{request.applicant}</div>
                        <div className="text-sm text-gray-500">{request.email}</div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {request.missingDocs.map((doc, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {doc}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                        <Send className="h-4 w-4 mr-1" />
                        Send Request
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="prior-actions">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Prior Action Required</CardTitle>
            <p className="text-gray-600">Documents requiring immediate attention or follow-up actions</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockPriorActions.map((action) => (
                <div key={action.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-blue-600">{action.documentId}</span>
                        <Badge
                          className={`${priorityConfig[action.priority as keyof typeof priorityConfig].color} w-fit`}
                        >
                          {priorityConfig[action.priority as keyof typeof priorityConfig].label} Priority
                        </Badge>
                        <Badge
                          className={`${actionStatusConfig[action.status as keyof typeof actionStatusConfig].color} w-fit`}
                        >
                          {actionStatusConfig[action.status as keyof typeof actionStatusConfig].label}
                        </Badge>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{action.documentName}</div>
                        <div className="text-sm text-gray-600">Applicant: {action.applicant}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="font-medium text-gray-900">{action.action}</div>
                        <div className="text-sm text-gray-600">{action.description}</div>
                        <div className="text-sm text-gray-500">
                          Assigned to: <span className="font-medium">{action.assignedTo}</span> • Due:{" "}
                          <span className="font-medium">{action.dueDate}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4 mr-1" />
                        View Document
                      </Button>
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                        Take Action
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
