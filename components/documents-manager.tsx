"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  Loader2,
  Upload as UploadIcon,
  MoreVertical,
  Check,
} from "lucide-react"
import { NewDocumentRequestModal } from "@/components/new-document-request-modal"
import { UploadDocumentModal } from "@/components/upload-document-modal"
import { useDocuments, useDownloadDocument, useViewDocument, useUpdateDocumentStatus } from "@/lib/hooks/use-documents"
import { useDocumentRequests, useFulfillDocumentRequest, useCancelDocumentRequest } from "@/lib/hooks/use-document-requests"
import type { DocumentType, DocumentStatus, DocumentRequestStatus, DocumentRequestPriority } from "@/lib/types/admin"

const mockDocuments_OLD = [
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
  const [typeFilter, setTypeFilter] = useState<DocumentType | "all">("all")
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | "all">("all")
  const [selectedDocument, setSelectedDocument] = useState<any>(null)
  const [showUploadModal, setShowUploadModal] = useState(false)

  // Document Requests filters
  const [requestSearchTerm, setRequestSearchTerm] = useState("")
  const [requestStatusFilter, setRequestStatusFilter] = useState<DocumentRequestStatus | "all">("all")
  const [requestPriorityFilter, setRequestPriorityFilter] = useState<DocumentRequestPriority | "all">("all")

  const { documents, loading, error, refetch } = useDocuments({
    search: searchTerm,
    document_type: typeFilter,
    status: statusFilter,
  })

  const { requests, loading: loadingRequests, error: requestsError, refetch: refetchRequests } = useDocumentRequests({
    search: requestSearchTerm,
    status: requestStatusFilter,
    priority: requestPriorityFilter,
  })

  // Debug: log cuando cambian los documentos
  useEffect(() => {
    console.log('Documents in manager:', documents.length, documents)
  }, [documents])
  const { downloadDocument, downloading } = useDownloadDocument()
  const { viewDocument } = useViewDocument()
  const { updateDocumentStatus, updating } = useUpdateDocumentStatus()
  const { fulfillRequest, fulfilling } = useFulfillDocumentRequest()
  const { cancelRequest, cancelling } = useCancelDocumentRequest()
  
  // Estado local para tracking de qué documento está siendo visualizado
  const [viewingDocId, setViewingDocId] = useState<string | null>(null)

  const handleVerifyDocument = async (docId: string) => {
    const success = await updateDocumentStatus(docId, 'under_review')
    if (success) {
      refetch()
    }
  }

  const handleUpdateStatus = async (docId: string, newStatus: DocumentStatus, doc?: any) => {
    console.log('🚀 handleUpdateStatus called:', { docId, newStatus, currentStatus: doc?.status })
    
    // Validar que el estado sea diferente
    if (doc?.status === newStatus) {
      console.log('⚠️ Status is already', newStatus)
      return
    }
    
    if (!docId) {
      console.error('❌ No document ID provided')
      alert('Error: No se proporcionó el ID del documento')
      return
    }
    
    try {
      console.log('📤 Calling updateDocumentStatus...')
      const success = await updateDocumentStatus(docId, newStatus)
      console.log('📥 Update result:', success)
      if (success) {
        console.log('✅ Update successful, refreshing...')
        // Pequeño delay para asegurar que la BD se actualizó
        setTimeout(() => {
          refetch()
        }, 100)
      } else {
        console.error('❌ Failed to update document status')
        alert('No se pudo actualizar el estado del documento. Revisa la consola para más detalles.')
      }
    } catch (error) {
      console.error('❌ Error in handleUpdateStatus:', error)
      alert(`Error al actualizar estado: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }
  }

  const handleDownload = async (fileUrl: string, fileName: string) => {
    await downloadDocument(fileUrl, fileName)
  }

  const handleView = async (fileUrl: string, mimeType: string | null, docId: string) => {
    setViewingDocId(docId)
    try {
      await viewDocument(fileUrl, mimeType)
    } finally {
      // Reset después de un pequeño delay para permitir que la nueva pestaña se abra
      setTimeout(() => {
        setViewingDocId(null)
      }, 500)
    }
  }

  const getApplicationInfo = (doc: any) => {
    if (!doc.application_id) return null
    const app = doc.application
    if (!app) {
      // Si no tenemos los datos de la aplicación, mostrar solo el ID corto
      return { 
        id: doc.application_id, 
        status: 'unknown',
        shortId: doc.application_id.substring(0, 8)
      }
    }
    
    // Extraer información de la aplicación
    const status = app.status || 'unknown'
    const shortId = app.id.substring(0, 8)
    
    // Intentar obtener el nombre de la compañía desde múltiples fuentes
    const companyName = app.insurance_companies?.name ||
                       app.carrier_name ||
                       app.enrollment_data?.companyName || 
                       app.enrollment_data?.carrier_name || 
                       null
    
    return {
      id: app.id,
      status,
      shortId,
      companyName
    }
  }

  const getDocumentStatus = (doc: any) => {
    // Usar el campo status de la BD si existe
    const status = doc.status || 'received'
    
    const statusConfig: Record<string, { label: string; color: string }> = {
      received: { 
        label: 'Received', 
        color: 'bg-gray-100 text-gray-800 border-gray-200' 
      },
      under_review: { 
        label: 'Under Review', 
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200' 
      },
      approved: { 
        label: 'Approved', 
        color: 'bg-green-100 text-green-800 border-green-200' 
      },
      rejected: { 
        label: 'Rejected', 
        color: 'bg-red-100 text-red-800 border-red-200' 
      },
      expired: { 
        label: 'Expired', 
        color: 'bg-orange-100 text-orange-800 border-orange-200' 
      }
    }
    
    // Si el status es 'received' pero el documento está expirado, mostrar 'expired'
    if (status === 'received' && doc.expires_at) {
      const expiresDate = new Date(doc.expires_at)
      const now = new Date()
      if (expiresDate < now) {
        return statusConfig.expired
      }
    }
    
    // Si está marcado como expirado manualmente
    if (doc.marked_expired_at && status !== 'expired') {
      return statusConfig.expired
    }
    
    return statusConfig[status] || statusConfig.received
  }

  const showPriorActions = (doc: any) => {
    setSelectedDocument(doc)
  }

  const getClientName = (doc: any) => {
    if (!doc.client) return 'N/A'
    return [doc.client.first_name, doc.client.last_name].filter(Boolean).join(' ') || doc.client.email
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'N/A'
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(2)} MB`
  }

  return (
    <>
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
                <Button
                  onClick={() => setShowUploadModal(true)}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  <UploadIcon className="h-4 w-4 mr-2" />
                  Upload Document
                </Button>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search documents..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full sm:w-64"
                  />
                </div>
                <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as DocumentType | "all")}>
                  <SelectTrigger className="w-full sm:w-32">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="medical">Medical</SelectItem>
                    <SelectItem value="identification">ID</SelectItem>
                    <SelectItem value="financial">Financial</SelectItem>
                    <SelectItem value="property">Property</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as DocumentStatus | "all")}>
                  <SelectTrigger className="w-full sm:w-36">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="received">Received</SelectItem>
                    <SelectItem value="under_review">Under Review</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Error al cargar documentos</h3>
                <p className="text-gray-600">{error}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Document</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Client</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Type</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Application</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Uploaded</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Size</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((doc) => {
                      // Debug: verificar que doc tiene status
                      if (!doc.status) {
                        console.warn('Document without status:', doc.id, doc)
                      }
                      
                      const docStatus = getDocumentStatus(doc)
                      const appInfo = getApplicationInfo(doc)
                      
                      return (
                        <tr key={doc.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-gray-500" />
                              <span className="font-medium text-gray-900">{doc.file_name}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-gray-900">{getClientName(doc)}</td>
                          <td className="py-4 px-4">
                            <Badge className={`${typeConfig[doc.document_type as keyof typeof typeConfig].color} w-fit`}>
                              {typeConfig[doc.document_type as keyof typeof typeConfig].label}
                            </Badge>
                          </td>
                          <td className="py-4 px-4">
                            <Badge className={`${docStatus.color} w-fit`}>
                              {docStatus.label}
                            </Badge>
                          </td>
                          <td className="py-4 px-4">
                            {appInfo ? (
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-blue-600" title={appInfo.id}>
                                    {appInfo.shortId}
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    {appInfo.status}
                                  </Badge>
                                </div>
                                {appInfo.companyName && (
                                  <span className="text-xs text-gray-500 truncate max-w-[200px]" title={appInfo.companyName}>
                                    {appInfo.companyName}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">—</span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-gray-600 text-sm">
                            {formatDate(doc.uploaded_at)}
                          </td>
                          <td className="py-4 px-4 text-gray-600 text-sm">
                            {formatFileSize(doc.file_size)}
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-8 w-8 p-0 bg-transparent"
                                onClick={() => handleView(doc.file_url, doc.mime_type, doc.id)}
                                disabled={viewingDocId === doc.id}
                                title="Ver documento"
                              >
                                {viewingDocId === doc.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-8 w-8 p-0 bg-transparent"
                                onClick={() => handleDownload(doc.file_url, doc.file_name)}
                                disabled={downloading}
                                title="Descargar documento"
                              >
                                {downloading ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Download className="h-4 w-4" />
                                )}
                              </Button>
                              <Select
                                value={doc.status}
                                onValueChange={(newStatus) => {
                                  console.log('✅ Status changed via Select:', { docId: doc.id, oldStatus: doc.status, newStatus })
                                  handleUpdateStatus(doc.id, newStatus as DocumentStatus, doc)
                                }}
                                disabled={updating}
                              >
                                <SelectTrigger className="h-8 w-32 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="received">Received</SelectItem>
                                  <SelectItem value="under_review">Under Review</SelectItem>
                                  <SelectItem value="approved">Approved</SelectItem>
                                  <SelectItem value="rejected">Rejected</SelectItem>
                                  <SelectItem value="expired">Expired</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>

                {documents.length === 0 && (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
                    <p className="text-gray-600">
                      {searchTerm || typeFilter !== "all"
                        ? "Try adjusting your filters"
                        : "No documents have been uploaded yet"}
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="requests">
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="text-xl font-semibold">Document Requests</CardTitle>
              <div className="flex flex-col sm:flex-row gap-2">
                <NewDocumentRequestModal onSuccess={refetchRequests}>
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    New Request
                  </Button>
                </NewDocumentRequestModal>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search requests..."
                    value={requestSearchTerm}
                    onChange={(e) => setRequestSearchTerm(e.target.value)}
                    className="pl-10 w-full sm:w-64"
                  />
                </div>
                <Select value={requestStatusFilter} onValueChange={(value) => setRequestStatusFilter(value as DocumentRequestStatus | "all")}>
                  <SelectTrigger className="w-full sm:w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="fulfilled">Fulfilled</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={requestPriorityFilter} onValueChange={(value) => setRequestPriorityFilter(value as DocumentRequestPriority | "all")}>
                  <SelectTrigger className="w-full sm:w-32">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingRequests ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : requestsError ? (
              <div className="text-center py-12">
                <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Error al cargar solicitudes</h3>
                <p className="text-gray-600">{requestsError}</p>
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No requests found</h3>
                <p className="text-gray-600">
                  {requestSearchTerm || requestStatusFilter !== "all" || requestPriorityFilter !== "all"
                    ? "Try adjusting your filters"
                    : "No document requests have been created yet"}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {requests.map((request) => {
                  const priorityConfig = {
                    low: { color: "bg-gray-100 text-gray-800" },
                    medium: { color: "bg-yellow-100 text-yellow-800" },
                    high: { color: "bg-orange-100 text-orange-800" },
                    urgent: { color: "bg-red-100 text-red-800" },
                  }

                  const statusConfig = {
                    pending: { label: "Pending", color: "bg-blue-100 text-blue-800" },
                    fulfilled: { label: "Fulfilled", color: "bg-green-100 text-green-800" },
                    expired: { label: "Expired", color: "bg-orange-100 text-orange-800" },
                    cancelled: { label: "Cancelled", color: "bg-gray-100 text-gray-800" },
                  }

                  const typeLabels = {
                    medical: "Medical",
                    identification: "Identification",
                    financial: "Financial",
                    property: "Property",
                    other: "Other",
                  }

                  const clientName = request.client
                    ? `${request.client.first_name || ""} ${request.client.last_name || ""}`.trim() || request.client.email
                    : "Unknown Client"

                  return (
                    <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-blue-600 text-sm">{request.id.substring(0, 8)}...</span>
                            <Badge className={`${priorityConfig[request.priority].color} w-fit`}>
                              {request.priority}
                            </Badge>
                            <Badge className={`${statusConfig[request.status].color} w-fit`}>
                              {statusConfig[request.status].label}
                            </Badge>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{clientName}</div>
                            {request.client?.email && (
                              <div className="text-sm text-gray-500">{request.client.email}</div>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline" className="text-xs">
                              {typeLabels[request.document_type]}
                            </Badge>
                            {request.due_date && (
                              <Badge variant="outline" className="text-xs">
                                Due: {formatDate(request.due_date)}
                              </Badge>
                            )}
                          </div>
                          {request.notes && (
                            <div className="text-sm text-gray-600 mt-2">
                              <span className="font-medium">Notes:</span> {request.notes}
                            </div>
                          )}
                          <div className="text-xs text-gray-500">
                            Requested: {formatDate(request.created_at)}
                            {request.requester && ` by ${request.requester.first_name || ""} ${request.requester.last_name || ""}`.trim()}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {request.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={async () => {
                                  const success = await cancelRequest(request.id)
                                  if (success) refetchRequests()
                                }}
                                disabled={cancelling}
                              >
                                {cancelling ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Cancel
                                  </>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                                onClick={async () => {
                                  const success = await fulfillRequest(request.id, request.document_id || undefined)
                                  if (success) refetchRequests()
                                }}
                                disabled={fulfilling}
                              >
                                {fulfilling ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Mark Fulfilled
                                  </>
                                )}
                              </Button>
                            </>
                          )}
                          {request.status === "fulfilled" && request.document && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleView(request.document!.file_url, null, request.document!.id)}
                              disabled={viewingDocId === request.document!.id}
                            >
                              {viewingDocId === request.document!.id ? (
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              ) : (
                                <>
                                  <Eye className="h-4 w-4 mr-1" />
                                  View Document
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
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

    {/* Upload Document Modal */}
    <UploadDocumentModal
      open={showUploadModal}
      onOpenChange={setShowUploadModal}
      onSuccess={() => {
        console.log('Upload success, calling refetch')
        // Pequeño delay para asegurar que la transacción de DB se complete
        setTimeout(() => {
          refetch()
        }, 500)
      }}
    />
  </>
  )
}
