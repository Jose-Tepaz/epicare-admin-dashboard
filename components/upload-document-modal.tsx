"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, X, FileText, Loader2, AlertCircle, Check, ChevronsUpDown } from "lucide-react"
import { useUploadDocument } from "@/lib/hooks/use-documents"
import { useClientsSearch } from "@/lib/hooks/use-clients-search"
import { useClientApplications } from "@/lib/hooks/use-client-applications"
import type { DocumentType } from "@/lib/types/admin"
import { cn } from "@/lib/utils"

interface UploadDocumentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  defaultClientId?: string
  defaultApplicationId?: string
}

export function UploadDocumentModal({
  open,
  onOpenChange,
  onSuccess,
  defaultClientId,
  defaultApplicationId,
}: UploadDocumentModalProps) {
  const [clientId, setClientId] = useState(defaultClientId || "")
  const [applicationId, setApplicationId] = useState(defaultApplicationId || "")
  const [documentType, setDocumentType] = useState<DocumentType>("identification")
  const [file, setFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [openClientSelect, setOpenClientSelect] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [openApplicationSelect, setOpenApplicationSelect] = useState(false)
  const [applicationSearchTerm, setApplicationSearchTerm] = useState("")

  // Resetear estado cuando se cierra el modal
  useEffect(() => {
    if (!open) {
      setOpenClientSelect(false)
      setOpenApplicationSelect(false)
      setSearchTerm("")
      setApplicationSearchTerm("")
      if (!defaultClientId) {
        setClientId("")
      }
      if (!defaultApplicationId) {
        setApplicationId("")
      }
    }
  }, [open, defaultClientId, defaultApplicationId])

  const { uploadDocument, uploading, error: uploadError } = useUploadDocument()
  const { clients, loading: loadingClients, searchClients } = useClientsSearch()
  const { applications, loading: loadingApplications, searchApplications } = useClientApplications(clientId)

  // Cargar clientes solo cuando se abre el dropdown
  useEffect(() => {
    if (openClientSelect && !defaultClientId) {
      const timer = setTimeout(() => {
        searchClients(searchTerm)
      }, searchTerm ? 300 : 0) // Sin delay si es la primera carga
      return () => clearTimeout(timer)
    }
  }, [openClientSelect, searchTerm, defaultClientId, searchClients])

  // Cargar aplicaciones cuando se selecciona un cliente o se abre el dropdown
  useEffect(() => {
    if (openApplicationSelect && clientId) {
      const timer = setTimeout(() => {
        searchApplications(applicationSearchTerm)
      }, applicationSearchTerm ? 300 : 0)
      return () => clearTimeout(timer)
    }
  }, [openApplicationSelect, clientId, applicationSearchTerm, searchApplications])

  // Resetear applicationId cuando cambia el cliente
  useEffect(() => {
    if (clientId && applicationId && !defaultApplicationId) {
      // Verificar que la aplicación pertenezca al cliente seleccionado
      const app = applications.find(a => a.id === applicationId)
      if (!app && applications.length > 0) {
        // Solo resetear si ya cargamos las aplicaciones y no encontramos la app
        setApplicationId("")
        setApplicationSearchTerm("")
      }
    } else if (!clientId && applicationId && !defaultApplicationId) {
      // Si se deselecciona el cliente, limpiar la aplicación
      setApplicationId("")
      setApplicationSearchTerm("")
      setOpenApplicationSelect(false)
    }
  }, [clientId, applicationId, applications, defaultApplicationId])

  // Cerrar dropdowns al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (openClientSelect && !target.closest('[data-client-selector]')) {
        setOpenClientSelect(false)
      }
      if (openApplicationSelect && !target.closest('[data-application-selector]')) {
        setOpenApplicationSelect(false)
      }
    }

    if (openClientSelect || openApplicationSelect) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [openClientSelect, openApplicationSelect])

  const getClientLabel = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId)
    if (!client) return clientId
    const name = [client.first_name, client.last_name].filter(Boolean).join(' ')
    return name ? `${name} (${client.email})` : client.email
  }

  const getApplicationLabel = (applicationId: string) => {
    const application = applications.find((a) => a.id === applicationId)
    if (!application) return applicationId
    const status = application.status || 'unknown'
    // Intentar obtener el plan name del enrollment_data
    const planName = getPlanName(application)
    // Obtener nombre de la compañía
    const companyName = getCompanyName(application)
    // Mostrar ID corto (primeros 8 caracteres)
    const shortId = application.id.substring(0, 8)
    return `${shortId} - ${companyName} - ${planName}`
  }

  const getPlanName = (application: any) => {
    const enrollmentData = application.enrollment_data || {}
    
    // Intentar múltiples ubicaciones donde puede estar el plan name
    const planName = 
      enrollmentData.plan_name || 
      enrollmentData.planName || 
      enrollmentData.plan ||
      // Buscar en coverages (estructura más común)
      enrollmentData.coverages?.[0]?.planName ||
      enrollmentData.coverages?.[0]?.plan_name ||
      enrollmentData.coverages?.[0]?.planKey || // planKey es común en coverages
      enrollmentData.coverages?.[0]?.plan?.name ||
      enrollmentData.coverages?.[0]?.plan?.planName ||
      // Buscar en selectedPlans
      enrollmentData.selectedPlans?.[0]?.planName ||
      enrollmentData.selectedPlans?.[0]?.name ||
      enrollmentData.selectedPlans?.[0]?.planKey ||
      // Si no hay plan name, mostrar información útil alternativa
      // Podemos mostrar el carrier_name o el status
      application.carrier_name || 
      application.status ||
      'Application'
    
    return planName
  }

  const getCompanyName = (application: any) => {
    return application.insurance_companies?.name || application.carrier_name || 'N/A'
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]
      if (validateFile(droppedFile)) {
        setFile(droppedFile)
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      if (validateFile(selectedFile)) {
        setFile(selectedFile)
      }
    }
  }

  const validateFile = (file: File): boolean => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'image/jpeg']
    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png']
    const maxSize = 10 * 1024 * 1024 // 10 MB

    // Verificar por extensión del archivo también (case insensitive)
    const fileNameParts = file.name.split('.')
    const fileExtension = fileNameParts.length > 1 ? '.' + fileNameParts.pop()?.toLowerCase() : ''
    const isValidExtension = allowedExtensions.includes(fileExtension)
    
    // Verificar por MIME type
    const isValidMimeType = allowedTypes.includes(file.type.toLowerCase())
    
    // Algunos navegadores pueden reportar diferentes MIME types para JPG
    const isJpeg = file.type.toLowerCase() === 'image/jpeg' || 
                   file.type.toLowerCase() === 'image/jpg' ||
                   fileExtension === '.jpg' || 
                   fileExtension === '.jpeg'

    // Si es JPG/JPEG por extensión o MIME type, permitirlo
    const isJpegByExtension = fileExtension === '.jpg' || fileExtension === '.jpeg'
    
    if (!isValidMimeType && !isValidExtension && !isJpeg && !isJpegByExtension) {
      console.error('File validation failed:', { 
        fileName: file.name, 
        fileType: file.type, 
        fileExtension,
        allowedTypes,
        allowedExtensions,
        isJpeg,
        isJpegByExtension
      })
      alert(`Tipo de archivo no permitido: ${file.name} (tipo: ${file.type || 'desconocido'}, extensión: ${fileExtension}). Solo se permiten PDF, JPG y PNG.`)
      return false
    }

    if (file.size > maxSize) {
      alert('El archivo excede el límite de 10 MB.')
      return false
    }

    return true
  }

  const handleUpload = async () => {
    if (!file || !clientId || !documentType) {
      alert('Please fill in all required fields')
      return
    }

    const result = await uploadDocument(file, clientId, documentType, applicationId || undefined)

    if (result) {
      console.log('Document uploaded successfully:', result)
      // Success
      setFile(null)
      setClientId("")
      setApplicationId("")
      setDocumentType("identification")
      setSearchTerm("")
      setApplicationSearchTerm("")
      setOpenClientSelect(false)
      setOpenApplicationSelect(false)
      
      // Llamar onSuccess antes de cerrar el modal para que refetch se ejecute
      console.log('Calling onSuccess callback')
      onSuccess?.()
      
      // Pequeño delay para asegurar que el refetch se complete
      setTimeout(() => {
        onOpenChange(false)
      }, 100)
    } else {
      console.error('Upload failed, result is null')
    }
  }

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(2)} MB`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {uploadError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{uploadError}</span>
            </div>
          )}

          <div>
            <Label htmlFor="clientId">Client *</Label>
            {defaultClientId ? (
              <Input
                id="clientId"
                value={getClientLabel(defaultClientId)}
                disabled
              />
            ) : (
              <div className="space-y-2" data-client-selector>
                {/* Trigger Button */}
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
                      {clientId 
                        ? getClientLabel(clientId) 
                        : "Click to select client..."}
                    </span>
                    {loadingClients ? (
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400 ml-2 shrink-0" />
                    ) : (
                      <ChevronsUpDown className="h-4 w-4 text-gray-400 ml-2 shrink-0" />
                    )}
                  </Button>
                  {clientId && !openClientSelect && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-10 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        setClientId("")
                        setSearchTerm("")
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Search Input - Solo visible cuando dropdown está abierto */}
                {openClientSelect && (
                  <Input
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                    onFocus={(e) => e.stopPropagation()}
                  />
                )}


                {/* Dropdown List */}
                {openClientSelect && (
                  <div className="border rounded-md shadow-lg bg-white max-h-[300px] overflow-y-auto">
                    {loadingClients ? (
                      <div className="py-8 text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                        <p className="text-sm text-gray-500 mt-2">Loading clients...</p>
                      </div>
                    ) : clients.length === 0 ? (
                      <div className="py-8 text-center">
                        <p className="text-sm text-gray-500">No clients found</p>
                      </div>
                    ) : (
                      <div className="py-1">
                        {clients.map((client) => {
                          const name = [client.first_name, client.last_name].filter(Boolean).join(' ')
                          const label = name ? `${name}` : client.email
                          const isSelected = clientId === client.id
                          
                          return (
                            <button
                              key={client.id}
                              type="button"
                              onClick={() => {
                                setClientId(client.id)
                                setOpenClientSelect(false)
                                setSearchTerm("")
                                // Resetear aplicación cuando cambia el cliente
                                if (applicationId && !defaultApplicationId) {
                                  setApplicationId("")
                                  setApplicationSearchTerm("")
                                  setOpenApplicationSelect(false)
                                }
                              }}
                              onMouseDown={(e) => e.preventDefault()}
                              className={cn(
                                "w-full px-3 py-2 text-left hover:bg-gray-100 transition-colors flex items-center gap-2",
                                isSelected && "bg-orange-50 hover:bg-orange-100"
                              )}
                            >
                              <Check
                                className={cn(
                                  "h-4 w-4 shrink-0",
                                  isSelected ? "opacity-100 text-orange-600" : "opacity-0"
                                )}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{label}</div>
                                {name && (
                                  <div className="text-xs text-gray-500 truncate">{client.email}</div>
                                )}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Select the client this document belongs to
            </p>
          </div>

          <div>
            <Label htmlFor="applicationId">Application (Optional)</Label>
            {defaultApplicationId ? (
              <Input
                id="applicationId"
                value={getApplicationLabel(defaultApplicationId)}
                disabled
              />
            ) : (
              <div className="space-y-2" data-application-selector>
                {/* Trigger Button */}
                <div className="relative">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-between text-left font-normal h-10"
                    onClick={() => {
                      if (!clientId) {
                        alert('Por favor selecciona un cliente primero')
                        return
                      }
                      setOpenApplicationSelect(!openApplicationSelect)
                      if (!openApplicationSelect) {
                        setApplicationSearchTerm("")
                      }
                    }}
                    disabled={!clientId}
                  >
                    <span className="truncate">
                      {applicationId 
                        ? getApplicationLabel(applicationId) 
                        : clientId 
                          ? "Click to select application..." 
                          : "Select a client first..."}
                    </span>
                    {loadingApplications ? (
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400 ml-2 shrink-0" />
                    ) : (
                      <ChevronsUpDown className="h-4 w-4 text-gray-400 ml-2 shrink-0" />
                    )}
                  </Button>
                  {applicationId && !openApplicationSelect && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-10 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        setApplicationId("")
                        setApplicationSearchTerm("")
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Search Input - Solo visible cuando dropdown está abierto */}
                {openApplicationSelect && clientId && (
                  <Input
                    placeholder="Search by ID, company, plan or status..."
                    value={applicationSearchTerm}
                    onChange={(e) => setApplicationSearchTerm(e.target.value)}
                    className="w-full"
                    onFocus={(e) => e.stopPropagation()}
                  />
                )}

                {/* Dropdown List */}
                {openApplicationSelect && clientId && (
                  <div className="border rounded-md shadow-lg bg-white max-h-[300px] overflow-y-auto">
                    {loadingApplications ? (
                      <div className="py-8 text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                        <p className="text-sm text-gray-500 mt-2">Loading applications...</p>
                      </div>
                    ) : applications.length === 0 ? (
                      <div className="py-8 text-center">
                        <p className="text-sm text-gray-500">No applications found for this client</p>
                      </div>
                    ) : (
                      <div className="py-1">
                        {applications.map((application) => {
                          const status = application.status || 'unknown'
                          const planName = getPlanName(application)
                          const isSelected = applicationId === application.id
                          const createdDate = new Date(application.created_at).toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })
                          const companyName = getCompanyName(application)
                          // ID corto para mostrar (primeros 8 caracteres)
                          const shortId = application.id.substring(0, 8)
                          
                          return (
                            <button
                              key={application.id}
                              type="button"
                              onClick={() => {
                                setApplicationId(application.id)
                                setOpenApplicationSelect(false)
                                setApplicationSearchTerm("")
                              }}
                              onMouseDown={(e) => e.preventDefault()}
                              className={cn(
                                "w-full px-3 py-2 text-left hover:bg-gray-100 transition-colors flex items-center gap-2",
                                isSelected && "bg-orange-50 hover:bg-orange-100"
                              )}
                            >
                              <Check
                                className={cn(
                                  "h-4 w-4 shrink-0",
                                  isSelected ? "opacity-100 text-orange-600" : "opacity-0"
                                )}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">
                                  {shortId} • {companyName} • {planName}
                                </div>
                                <div className="text-xs text-gray-500 truncate">
                                  Status: {status} • {createdDate}
                                </div>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Select an application if this document is related to a specific application
            </p>
          </div>

          <div>
            <Label htmlFor="documentType">Document Type *</Label>
            <Select value={documentType} onValueChange={(value) => setDocumentType(value as DocumentType)}>
              <SelectTrigger>
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="identification">Identification</SelectItem>
                <SelectItem value="medical">Medical</SelectItem>
                <SelectItem value="financial">Financial</SelectItem>
                <SelectItem value="property">Property</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>File *</Label>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? "border-orange-500 bg-orange-50"
                  : "border-gray-300 hover:border-gray-400"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {file ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-3 p-4 bg-gray-50 rounded-lg">
                    <FileText className="h-8 w-8 text-gray-600" />
                    <div className="text-left flex-1">
                      <p className="font-medium text-gray-900">{file.name}</p>
                      <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFile(null)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                  <div>
                    <p className="text-gray-700 font-medium">Drag and drop file here</p>
                    <p className="text-sm text-gray-500">or</p>
                  </div>
                  <label htmlFor="file-upload">
                    <Button
                      type="button"
                      variant="outline"
                      className="cursor-pointer"
                      onClick={() => document.getElementById('file-upload')?.click()}
                    >
                      Browse Files
                    </Button>
                  </label>
                  <input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                  />
                  <p className="text-xs text-gray-500">PDF, JPG, PNG (Max 10 MB)</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              className="flex-1 bg-orange-500 hover:bg-orange-600"
              disabled={!file || !clientId || !documentType || uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Document
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

