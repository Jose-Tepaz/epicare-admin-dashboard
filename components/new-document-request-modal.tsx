"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Mail, User, FileText, Calendar, AlertCircle, Loader2, ChevronsUpDown, X } from "lucide-react"
import { useClientsSearch } from "@/lib/hooks/use-clients-search"
import { useClientApplications } from "@/lib/hooks/use-client-applications"
import { useCreateDocumentRequest } from "@/lib/hooks/use-document-requests"
import type { DocumentType, DocumentRequestPriority } from "@/lib/types/admin"

const documentTypeOptions: { value: DocumentType; label: string }[] = [
  { value: "medical", label: "Medical Document" },
  { value: "identification", label: "Identification Document" },
  { value: "financial", label: "Financial Document" },
  { value: "property", label: "Property Document" },
  { value: "other", label: "Other Document" },
]

const priorityLevels: { value: DocumentRequestPriority; label: string; color: string }[] = [
  { value: "low", label: "Low", color: "bg-gray-100 text-gray-800" },
  { value: "medium", label: "Medium", color: "bg-yellow-100 text-yellow-800" },
  { value: "high", label: "High", color: "bg-orange-100 text-orange-800" },
  { value: "urgent", label: "Urgent", color: "bg-red-100 text-red-800" },
]

interface NewDocumentRequestModalProps {
  children: React.ReactNode
  defaultClientId?: string
  onSuccess?: () => void
}

export function NewDocumentRequestModal({ children, defaultClientId, onSuccess }: NewDocumentRequestModalProps) {
  const [open, setOpen] = useState(false)
  const [clientId, setClientId] = useState(defaultClientId || "")
  const [applicationId, setApplicationId] = useState("")
  const [documentType, setDocumentType] = useState<DocumentType>("medical")
  const [priority, setPriority] = useState<DocumentRequestPriority>("medium")
  const [dueDate, setDueDate] = useState("")
  const [notes, setNotes] = useState("")
  const [sendEmail, setSendEmail] = useState(true)

  // Client search
  const [searchTerm, setSearchTerm] = useState("")
  const [openClientSelect, setOpenClientSelect] = useState(false)
  const { clients, loading: loadingClients } = useClientsSearch(searchTerm)

  // Applications for selected client
  const { applications, loading: loadingApplications } = useClientApplications(clientId)
  const [openApplicationSelect, setOpenApplicationSelect] = useState(false)

  // Create request hook
  const { createRequest, creating } = useCreateDocumentRequest()

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setOpenClientSelect(false)
      setOpenApplicationSelect(false)
      setSearchTerm("")
      if (!defaultClientId) {
        setClientId("")
      }
      setApplicationId("")
      setDocumentType("medical")
      setPriority("medium")
      setDueDate("")
      setNotes("")
      setSendEmail(true)
    }
  }, [open, defaultClientId])

  // Set default client if provided
  useEffect(() => {
    if (defaultClientId) {
      setClientId(defaultClientId)
    }
  }, [defaultClientId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!clientId || !documentType) {
      return
    }

    const result = await createRequest(
      clientId,
      documentType,
      priority,
      {
        applicationId: applicationId || undefined,
        dueDate: dueDate || undefined,
        notes: notes || undefined,
        sendEmail,
      }
    )

    if (result) {
      // Success
      setOpen(false)
      onSuccess?.()
    }
  }

  const getClientLabel = (id: string) => {
    const client = clients.find((c) => c.id === id)
    if (!client) return "Select client..."
    return `${client.first_name || ""} ${client.last_name || ""} (${client.email})`.trim()
  }

  const getApplicationLabel = (id: string) => {
    const app = applications.find((a) => a.id === id)
    if (!app) return "Select application (optional)..."
    
    const shortId = app.id.substring(0, 8)
    const companyName = app.insurance_companies?.name || app.carrier_name || "Unknown"
    return `${shortId}... - ${companyName}`
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            New Document Request
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Client Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <User className="h-4 w-4" />
              Client Information
            </h3>
            
            <div className="space-y-2">
              <Label htmlFor="client">Client *</Label>
              {defaultClientId ? (
                <div className="p-2 border rounded-md bg-gray-50">
                  <p className="text-sm">{getClientLabel(clientId)}</p>
                </div>
              ) : (
                <div className="relative">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-between text-left font-normal h-10"
                    onClick={() => {
                      setOpenClientSelect(!openClientSelect)
                      if (!openClientSelect) {
                        setSearchTerm("")
                      }
                    }}
                  >
                    <span className="truncate">
                      {clientId ? getClientLabel(clientId) : "Click to select client..."}
                    </span>
                    {loadingClients ? (
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400 ml-2 shrink-0" />
                    ) : (
                      <ChevronsUpDown className="h-4 w-4 text-gray-400 ml-2 shrink-0" />
                    )}
                  </Button>

                  {openClientSelect && (
                    <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg">
                      <div className="p-2 border-b">
                        <Input
                          placeholder="Search by name or email..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full"
                        />
                      </div>
                      <div className="max-h-60 overflow-y-auto">
                        {loadingClients ? (
                          <div className="p-4 text-center text-sm text-gray-500">
                            <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                            Loading clients...
                          </div>
                        ) : clients.length === 0 ? (
                          <div className="p-4 text-center text-sm text-gray-500">
                            No clients found
                          </div>
                        ) : (
                          clients.map((client) => (
                            <button
                              key={client.id}
                              type="button"
                              className="w-full text-left px-3 py-2 hover:bg-gray-100 flex flex-col"
                              onClick={() => {
                                setClientId(client.id)
                                setOpenClientSelect(false)
                                setApplicationId("") // Reset application when client changes
                              }}
                            >
                              <span className="font-medium text-sm">
                                {client.first_name} {client.last_name}
                              </span>
                              <span className="text-xs text-gray-500">{client.email}</span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Application Selection (Optional) */}
            {clientId && (
              <div className="space-y-2">
                <Label htmlFor="application">Related Application (Optional)</Label>
                <div className="relative">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-between text-left font-normal h-10"
                    onClick={() => setOpenApplicationSelect(!openApplicationSelect)}
                  >
                    <span className="truncate">
                      {applicationId ? getApplicationLabel(applicationId) : "Select application (optional)..."}
                    </span>
                    {loadingApplications ? (
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400 ml-2 shrink-0" />
                    ) : (
                      <ChevronsUpDown className="h-4 w-4 text-gray-400 ml-2 shrink-0" />
                    )}
                  </Button>

                  {applicationId && (
                    <button
                      type="button"
                      className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      onClick={() => setApplicationId("")}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}

                  {openApplicationSelect && (
                    <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {loadingApplications ? (
                        <div className="p-4 text-center text-sm text-gray-500">
                          <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                          Loading applications...
                        </div>
                      ) : applications.length === 0 ? (
                        <div className="p-4 text-center text-sm text-gray-500">
                          No applications found for this client
                        </div>
                      ) : (
                        applications.map((app) => {
                          const shortId = app.id.substring(0, 8)
                          const companyName = app.insurance_companies?.name || app.carrier_name || "Unknown"
                          
                          return (
                            <button
                              key={app.id}
                              type="button"
                              className="w-full text-left px-3 py-2 hover:bg-gray-100 flex flex-col"
                              onClick={() => {
                                setApplicationId(app.id)
                                setOpenApplicationSelect(false)
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{shortId}...</span>
                                <Badge variant="outline" className="text-xs">{app.status}</Badge>
                              </div>
                              <span className="text-xs text-gray-500">{companyName}</span>
                            </button>
                          )
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Document Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Document Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="documentType">Document Type *</Label>
                <Select value={documentType} onValueChange={(value) => setDocumentType(value as DocumentType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {documentTypeOptions.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority Level *</Label>
                <Select value={priority} onValueChange={(value) => setPriority(value as DocumentRequestPriority)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorityLevels.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        <div className="flex items-center gap-2">
                          <Badge className={`${level.color} text-xs`}>{level.label}</Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Request Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Request Details
            </h3>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date (Optional)</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any specific instructions or requirements..."
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sendEmail"
                  checked={sendEmail}
                  onCheckedChange={(checked) => setSendEmail(checked as boolean)}
                />
                <Label htmlFor="sendEmail" className="text-sm font-normal cursor-pointer flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Send email notification to client
                </Label>
              </div>
            </div>
          </div>

          {/* Warning */}
          {!clientId && (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-yellow-800">Please select a client to continue.</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={creating}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={!clientId || !documentType || creating}
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Create Request
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
