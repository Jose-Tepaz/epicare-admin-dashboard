import { FileText, Clock, CheckCircle, XCircle } from "lucide-react"

/**
 * Configuración de estados de aplicación
 */
export const statusConfig = {
  draft: { label: "Draft", color: "bg-gray-100 text-gray-800", icon: FileText },
  submitted: { label: "Submitted", color: "bg-blue-100 text-blue-800", icon: FileText },
  pending_approval: { label: "Pending", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  approved: { label: "Approved", color: "bg-green-100 text-green-800", icon: CheckCircle },
  active: { label: "Active", color: "bg-green-100 text-green-800", icon: CheckCircle },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-800", icon: XCircle },
  cancelled: { label: "Cancelled", color: "bg-gray-100 text-gray-800", icon: XCircle },
} as const

/**
 * Mapea el relationship a su etiqueta en español
 */
export const relationshipLabels: Record<string, string> = {
  self: 'Titular',
  primary: 'Titular',
  spouse: 'Cónyuge',
  child: 'Hijo/a',
}

