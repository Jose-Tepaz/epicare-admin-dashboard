"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Plus, X, Mail, User, FileText, Calendar, AlertCircle } from "lucide-react"

const documentTypes = [
  { id: "medical", label: "Medical Certificate", category: "Medical" },
  { id: "identification", label: "Driver's License", category: "Identification" },
  { id: "birth-certificate", label: "Birth Certificate", category: "Identification" },
  { id: "passport", label: "Passport", category: "Identification" },
  { id: "income-statement", label: "Income Statement", category: "Financial" },
  { id: "tax-returns", label: "Tax Returns", category: "Financial" },
  { id: "bank-statements", label: "Bank Statements", category: "Financial" },
  { id: "property-deed", label: "Property Deed", category: "Property" },
  { id: "proof-address", label: "Proof of Address", category: "Property" },
  { id: "insurance-policy", label: "Insurance Policy", category: "Insurance" },
]

const priorityLevels = [
  { value: "low", label: "Low", color: "bg-gray-100 text-gray-800" },
  { value: "medium", label: "Medium", color: "bg-yellow-100 text-yellow-800" },
  { value: "high", label: "High", color: "bg-red-100 text-red-800" },
  { value: "urgent", label: "Urgent", color: "bg-red-200 text-red-900" },
]

interface NewDocumentRequestModalProps {
  children: React.ReactNode
}

export function NewDocumentRequestModal({ children }: NewDocumentRequestModalProps) {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    applicantName: "",
    applicantEmail: "",
    requestId: "",
    priority: "medium",
    dueDate: "",
    notes: "",
    sendEmail: true,
  })
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([])
  const [customDocument, setCustomDocument] = useState("")

  const handleDocumentToggle = (docId: string) => {
    setSelectedDocuments((prev) => (prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]))
  }

  const handleAddCustomDocument = () => {
    if (customDocument.trim()) {
      setSelectedDocuments((prev) => [...prev, `custom-${Date.now()}`])
      setCustomDocument("")
    }
  }

  const handleRemoveDocument = (docId: string) => {
    setSelectedDocuments((prev) => prev.filter((id) => id !== docId))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Here you would handle the form submission
    console.log("[v0] New document request:", { formData, selectedDocuments })
    setOpen(false)
    // Reset form
    setFormData({
      applicantName: "",
      applicantEmail: "",
      requestId: "",
      priority: "medium",
      dueDate: "",
      notes: "",
      sendEmail: true,
    })
    setSelectedDocuments([])
  }

  const getDocumentLabel = (docId: string) => {
    if (docId.startsWith("custom-")) {
      return customDocument || "Custom Document"
    }
    return documentTypes.find((doc) => doc.id === docId)?.label || docId
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
          {/* Applicant Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <User className="h-4 w-4" />
              Applicant Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="applicantName">Applicant Name *</Label>
                <Input
                  id="applicantName"
                  value={formData.applicantName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, applicantName: e.target.value }))}
                  placeholder="Enter full name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="applicantEmail">Email Address *</Label>
                <Input
                  id="applicantEmail"
                  type="email"
                  value={formData.applicantEmail}
                  onChange={(e) => setFormData((prev) => ({ ...prev, applicantEmail: e.target.value }))}
                  placeholder="Enter email address"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="requestId">Related Request ID</Label>
                <Input
                  id="requestId"
                  value={formData.requestId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, requestId: e.target.value }))}
                  placeholder="REQ-001 (optional)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority Level</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, priority: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorityLevels.map((priority) => (
                      <SelectItem key={priority.value} value={priority.value}>
                        <div className="flex items-center gap-2">
                          <Badge className={`${priority.color} text-xs`}>{priority.label}</Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Document Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Required Documents
            </h3>

            {/* Document Categories */}
            <div className="space-y-4">
              {["Identification", "Financial", "Medical", "Property", "Insurance"].map((category) => (
                <div key={category} className="space-y-2">
                  <h4 className="font-medium text-gray-700">{category}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {documentTypes
                      .filter((doc) => doc.category === category)
                      .map((doc) => (
                        <div key={doc.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={doc.id}
                            checked={selectedDocuments.includes(doc.id)}
                            onCheckedChange={() => handleDocumentToggle(doc.id)}
                          />
                          <Label htmlFor={doc.id} className="text-sm font-normal cursor-pointer">
                            {doc.label}
                          </Label>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Custom Document */}
            <div className="space-y-2">
              <Label htmlFor="customDocument">Custom Document</Label>
              <div className="flex gap-2">
                <Input
                  id="customDocument"
                  value={customDocument}
                  onChange={(e) => setCustomDocument(e.target.value)}
                  placeholder="Enter custom document name"
                />
                <Button type="button" onClick={handleAddCustomDocument} variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Selected Documents */}
            {selectedDocuments.length > 0 && (
              <div className="space-y-2">
                <Label>Selected Documents ({selectedDocuments.length})</Label>
                <div className="flex flex-wrap gap-2">
                  {selectedDocuments.map((docId) => (
                    <Badge key={docId} variant="outline" className="flex items-center gap-1">
                      {getDocumentLabel(docId)}
                      <button
                        type="button"
                        onClick={() => handleRemoveDocument(docId)}
                        className="ml-1 hover:text-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Request Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Request Details
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, dueDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Add any specific instructions or requirements..."
                  rows={3}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sendEmail"
                  checked={formData.sendEmail}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, sendEmail: checked as boolean }))}
                />
                <Label htmlFor="sendEmail" className="text-sm font-normal cursor-pointer flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Send email notification to applicant
                </Label>
              </div>
            </div>
          </div>

          {/* Warning */}
          {selectedDocuments.length === 0 && (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-yellow-800">Please select at least one document to request.</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={selectedDocuments.length === 0 || !formData.applicantName || !formData.applicantEmail}
            >
              <Mail className="h-4 w-4 mr-2" />
              Create Request
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
