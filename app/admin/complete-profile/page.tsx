'use client'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAdminAuth } from "@/contexts/admin-auth-context"
import { createClient } from "@/lib/supabase/client"
import { Loader2 } from "lucide-react"

export default function AdminCompleteProfilePage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAdminAuth()
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zip_code: "",
  })
  const [profile, setProfile] = useState<any>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/admin/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return

      try {
        setLoadingProfile(true)
        const supabase = createClient()
        
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single()

        if (error) {
          console.error('Error fetching profile:', error)
        } else {
          setProfile(data)
          setFormData({
            first_name: data?.first_name || "",
            last_name: data?.last_name || "",
            phone: data?.phone || "",
            address: data?.address || "",
            city: data?.city || "",
            state: data?.state || "",
            zip_code: data?.zip_code || "",
          })
        }
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoadingProfile(false)
      }
    }

    if (user) {
      fetchProfile()
    }
  }, [user])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.first_name.trim()) {
      newErrors.first_name = "El nombre es requerido"
    }

    if (!formData.last_name.trim()) {
      newErrors.last_name = "El apellido es requerido"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    if (!user) {
      return
    }

    setSaving(true)

    try {
      const supabase = createClient()
      
      // Actualizar el perfil
      const { error: updateError } = await supabase
        .from('users')
        .update({
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          phone: formData.phone.trim() || null,
          address: formData.address.trim() || null,
          city: formData.city.trim() || null,
          state: formData.state.trim() || null,
          zip_code: formData.zip_code.trim() || null,
          profile_completed: true,
        })
        .eq('id', user.id)

      if (updateError) {
        throw updateError
      }

      // Redirigir al dashboard de admin
      router.push('/admin')
    } catch (error) {
      console.error('Error updating profile:', error)
      setErrors({ submit: 'Error al guardar el perfil. Por favor intenta de nuevo.' })
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }))
    }
  }

  if (authLoading || loadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Completa tu Perfil</h2>
          <p className="mt-2 text-sm text-gray-600">
            Por favor completa tu información para continuar al dashboard de administración
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6 bg-white shadow rounded-lg p-8">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">
                  Nombre <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="first_name"
                  type="text"
                  placeholder="Juan"
                  value={formData.first_name}
                  onChange={(e) => handleChange("first_name", e.target.value)}
                  className={errors.first_name ? "border-red-500" : ""}
                />
                {errors.first_name && (
                  <p className="text-sm text-red-500">{errors.first_name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="last_name">
                  Apellido <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="last_name"
                  type="text"
                  placeholder="Pérez"
                  value={formData.last_name}
                  onChange={(e) => handleChange("last_name", e.target.value)}
                  className={errors.last_name ? "border-red-500" : ""}
                />
                {errors.last_name && (
                  <p className="text-sm text-red-500">{errors.last_name}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={formData.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Dirección</Label>
              <Input
                id="address"
                type="text"
                placeholder="123 Main St"
                value={formData.address}
                onChange={(e) => handleChange("address", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">Ciudad</Label>
                <Input
                  id="city"
                  type="text"
                  placeholder="Nueva York"
                  value={formData.city}
                  onChange={(e) => handleChange("city", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">Estado</Label>
                <Input
                  id="state"
                  type="text"
                  placeholder="NY"
                  value={formData.state}
                  onChange={(e) => handleChange("state", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="zip_code">Código Postal</Label>
              <Input
                id="zip_code"
                type="text"
                placeholder="10001"
                value={formData.zip_code}
                onChange={(e) => handleChange("zip_code", e.target.value)}
              />
            </div>
          </div>

          {errors.submit && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {errors.submit}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="submit"
              disabled={saving}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Continuar al Dashboard"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

