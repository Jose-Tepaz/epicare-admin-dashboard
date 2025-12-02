"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Send, Edit } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import type { ApplicationData } from "./types"

interface ActionButtonsCardProps {
  application: ApplicationData
  onSuccess: () => void
}

export function ActionButtonsCard({ application, onSuccess }: ActionButtonsCardProps) {
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  // Normalizar el estado para comparación (sin espacios, en minúsculas)
  const normalizedStatus = application.status?.toLowerCase().trim() || ''
  
  // Puede enviar si está pendiente de aprobación, aprobada, o si falló el envío anterior
  const canSubmit = ['pending_approval', 'approved', 'submission_failed'].includes(normalizedStatus)
  // Puede editar si está en borrador, pendiente de aprobación, aprobada, o si falló el envío
  const canEdit = ['draft', 'pending_approval', 'approved', 'submission_failed'].includes(normalizedStatus)

  // Debug: verificar estado
  console.log('🔍 ActionButtonsCard - Status:', application.status, 'normalized:', normalizedStatus, 'canSubmit:', canSubmit, 'canEdit:', canEdit)

  const handleSubmitEnrollment = async () => {
    if (!confirm('¿Estás seguro de enviar esta aplicación a la aseguradora? Esta acción no se puede deshacer.')) {
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch(`/api/applications/${application.id}/submit-enrollment`, {
        method: 'POST',
      })

      const result = await response.json()

      if (response.ok && result.success) {
        toast.success('Enrollment enviado exitosamente', {
          description: 'La aplicación ha sido enviada a la aseguradora.',
        })
        onSuccess()
      } else {
        toast.error('Error al enviar enrollment', {
          description: result.error || result.details || 'Error desconocido',
        })
      }
    } catch (error) {
      console.error('Error submitting enrollment:', error)
      toast.error('Error al enviar enrollment', {
        description: 'No se pudo conectar con el servidor.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = () => {
    router.push(`/admin/requests/${application.id}/edit`)
  }

  if (!canSubmit && !canEdit) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Acciones</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {canEdit && (
          <Button
            onClick={handleEdit}
            variant="outline"
            className="w-full"
          >
            <Edit className="h-4 w-4 mr-2" />
            Editar Application
          </Button>
        )}
        
        {canSubmit && (
          <Button
            onClick={handleSubmitEnrollment}
            disabled={submitting}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Enviar a Aseguradora
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

