"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Loader2, Save } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"

export default function EditApplicationPage() {
  const params = useParams()
  const router = useRouter()
  const applicationId = params?.id as string
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [application, setApplication] = useState<any>(null)
  
  // Form fields
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    alternate_phone: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    zip_code: '',
    zip_code_plus4: '',
    effective_date: '',
    enrollment_date: '',
  })
  
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    loadApplication()
  }, [applicationId])

  async function loadApplication() {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .eq('id', applicationId)
      .single()
    
    if (error || !data) {
      toast.error('Error al cargar la aplicación')
      router.push(`/admin/requests/${applicationId}`)
      return
    }
    
    setApplication(data)
    setFormData({
      email: data.email || '',
      phone: data.phone || '',
      alternate_phone: data.alternate_phone || '',
      address1: data.address1 || '',
      address2: data.address2 || '',
      city: data.city || '',
      state: data.state || '',
      zip_code: data.zip_code || '',
      zip_code_plus4: data.zip_code_plus4 || '',
      effective_date: data.effective_date ? data.effective_date.split('T')[0] : '',
      enrollment_date: data.enrollment_date ? new Date(data.enrollment_date).toISOString().split('T')[0] : '',
    })
    
    setLoading(false)
  }

  function validateEffectiveDate(date: string): string | null {
    if (!date) return null
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const effectiveDate = new Date(date)
    effectiveDate.setHours(0, 0, 0, 0)
    
    if (effectiveDate <= today) {
      return 'La fecha efectiva debe ser al menos un día después de hoy'
    }
    
    return null
  }

  async function handleSave() {
    // Validar effective_date
    const effectiveDateError = validateEffectiveDate(formData.effective_date)
    if (effectiveDateError) {
      setErrors({ effective_date: effectiveDateError })
      toast.error('Error de validación', {
        description: effectiveDateError,
      })
      return
    }
    
    setSaving(true)
    setErrors({})
    
    try {
      const supabase = createClient()
      
      // Si se actualiza effective_date, también actualizar en enrollment_data.coverages
      let enrollmentDataUpdate = {}
      if (formData.effective_date && application?.enrollment_data) {
        const updatedEnrollmentData = { ...application.enrollment_data }
        if (updatedEnrollmentData.coverages && updatedEnrollmentData.coverages.length > 0) {
          updatedEnrollmentData.coverages = updatedEnrollmentData.coverages.map((coverage: any) => ({
            ...coverage,
            effectiveDate: formData.effective_date,
          }))
        }
        enrollmentDataUpdate = { enrollment_data: updatedEnrollmentData }
      }
      
      const { error } = await supabase
        .from('applications')
        .update({
          email: formData.email,
          phone: formData.phone,
          alternate_phone: formData.alternate_phone || null,
          address1: formData.address1,
          address2: formData.address2 || null,
          city: formData.city,
          state: formData.state,
          zip_code: formData.zip_code,
          zip_code_plus4: formData.zip_code_plus4 || null,
          effective_date: formData.effective_date || null,
          enrollment_date: formData.enrollment_date || null,
          updated_at: new Date().toISOString(),
          ...enrollmentDataUpdate,
        })
        .eq('id', applicationId)
      
      if (error) {
        throw error
      }
      
      toast.success('Application actualizada exitosamente')
      router.push(`/admin/requests/${applicationId}`)
    } catch (error: any) {
      console.error('Error saving application:', error)
      toast.error('Error al guardar', {
        description: error.message || 'Error desconocido',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 p-4 md:p-6 flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
      <div className="flex-1 space-y-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/admin/requests/${applicationId}`)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Editar Application</h2>
              <p className="text-sm text-gray-500 font-mono">{applicationId}</p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Información de Contacto y Dirección</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="alternate_phone">Teléfono Alternativo</Label>
                <Input
                  id="alternate_phone"
                  type="tel"
                  value={formData.alternate_phone}
                  onChange={(e) => setFormData({ ...formData, alternate_phone: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address1">Dirección 1</Label>
                <Input
                  id="address1"
                  value={formData.address1}
                  onChange={(e) => setFormData({ ...formData, address1: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address2">Dirección 2</Label>
                <Input
                  id="address2"
                  value={formData.address2}
                  onChange={(e) => setFormData({ ...formData, address2: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">Ciudad</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">Estado</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="zip_code">Código Postal</Label>
                <Input
                  id="zip_code"
                  value={formData.zip_code}
                  onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="zip_code_plus4">Código Postal +4</Label>
                <Input
                  id="zip_code_plus4"
                  value={formData.zip_code_plus4}
                  onChange={(e) => setFormData({ ...formData, zip_code_plus4: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="effective_date">Fecha Efectiva *</Label>
                <Input
                  id="effective_date"
                  type="date"
                  value={formData.effective_date}
                  onChange={(e) => {
                    const newValue = e.target.value
                    setFormData({ ...formData, effective_date: newValue })
                    // Validar en tiempo real
                    const error = validateEffectiveDate(newValue)
                    if (error) {
                      setErrors({ ...errors, effective_date: error })
                    } else {
                      const newErrors = { ...errors }
                      delete newErrors.effective_date
                      setErrors(newErrors)
                    }
                  }}
                  className={errors.effective_date ? 'border-red-500' : ''}
                  min={new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0]}
                />
                {errors.effective_date && (
                  <p className="text-sm text-red-600">{errors.effective_date}</p>
                )}
                <p className="text-xs text-gray-500">
                  La fecha efectiva debe ser al menos un día después de hoy
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="enrollment_date">Fecha de Enrollment</Label>
                <Input
                  id="enrollment_date"
                  type="date"
                  value={formData.enrollment_date}
                  onChange={(e) => setFormData({ ...formData, enrollment_date: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => router.push(`/admin/requests/${applicationId}`)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Guardar Cambios
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
  )
}

