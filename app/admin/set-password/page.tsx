'use client'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAdminAuth } from "@/contexts/admin-auth-context"
import { createClient } from "@/lib/supabase/client"
import { Loader2, Eye, EyeOff } from "lucide-react"

export default function SetPasswordPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAdminAuth()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [processingHash, setProcessingHash] = useState(false)
  const [hasProcessedHash, setHasProcessedHash] = useState(false)

  useEffect(() => {
    const setupSession = async () => {
      console.log('🔍 set-password useEffect iniciado')
      console.log('🔍 Usuario actual:', user ? user.email : 'sin usuario')
      console.log('🔍 authLoading:', authLoading)
      console.log('🔍 processingHash:', processingHash)
      console.log('🔍 hasProcessedHash:', hasProcessedHash)
      
      // Verificar si hay hash con tokens
      const currentHash = window.location.hash
      if (currentHash && currentHash.includes('access_token') && !user && !processingHash && !hasProcessedHash) {
        console.log('🔐 Hash con tokens detectado, estableciendo sesión...')
        setProcessingHash(true)
        setHasProcessedHash(true)
        
        try {
          const hashParams = new URLSearchParams(currentHash.substring(1))
          const accessToken = hashParams.get('access_token')
          const refreshToken = hashParams.get('refresh_token')
          
          if (accessToken && refreshToken) {
            console.log('✅ Tokens extraídos del hash')
            const supabase = createClient()
            
            console.log('🔄 Llamando setSession...')
            
            // Agregar timeout de 3 segundos
            const setSessionPromise = supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            })
            
            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new Error('setSession timeout')), 3000)
            })
            
            try {
              const result = await Promise.race([setSessionPromise, timeoutPromise]) as any
              
              if (result.error) {
                console.error('❌ Error estableciendo sesión:', result.error)
                router.push('/admin/login?error=session_failed')
                return
              }
              
              console.log('✅ Sesión establecida desde hash')
            } catch (timeoutError: any) {
              if (timeoutError.message === 'setSession timeout') {
                console.warn('⚠️ setSession timeout, pero continuando (la sesión puede estar establecida)')
              } else {
                throw timeoutError
              }
            }
            
            // Limpiar hash de la URL
            window.history.replaceState(null, '', window.location.pathname)
            console.log('🔄 Hash limpiado, recargando página...')
            
            // Esperar un momento antes de recargar
            setTimeout(() => {
              window.location.reload()
            }, 100)
            return
          }
        } catch (err) {
          console.error('❌ Error procesando hash:', err)
          setProcessingHash(false)
        }
      }
      
      // Si no está cargando y no hay usuario (y no hay hash), redirigir a login
      if (!authLoading && !user && !currentHash && !processingHash) {
        console.log('⚠️ No hay usuario autenticado, redirigiendo a login')
        setTimeout(() => {
          router.push('/admin/login')
        }, 1000)
        return
      }
      
      // Si ya hay usuario autenticado
      if (user && !authLoading) {
        console.log('✅ Usuario autenticado, mostrando formulario para:', user.email)
      }
    }

    setupSession()
  }, [user, authLoading, router, processingHash, hasProcessedHash])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!password.trim()) {
      newErrors.password = "La contraseña es requerida"
    } else if (password.length < 6) {
      newErrors.password = "La contraseña debe tener al menos 6 caracteres"
    }

    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = "Confirma tu contraseña"
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Las contraseñas no coinciden"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('🔐 handleSubmit iniciado')

    if (!validateForm()) {
      console.log('❌ Validación falló')
      return
    }

    if (!user) {
      console.log('❌ No hay usuario')
      return
    }

    console.log('✅ Validación OK, estableciendo contraseña para:', user.email)
    setSaving(true)

    try {
      // USAR API ROUTE EN LUGAR DE CLIENTE SUPABASE
      // Esto evita problemas de timeout y red en el cliente
      console.log('🔄 Llamando API /api/auth/update-password...')
      
      const response = await fetch('/api/auth/update-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: password.trim() }),
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('❌ Error API:', result)
        
        // Manejar caso específico de contraseña igual
        if (result.error?.includes('different from the old password') || 
            result.error?.includes('same as the old password')) {
          console.log('⚠️ Contraseña ya establecida, redirigiendo a /admin')
          window.location.href = '/admin'
          return
        }
        
        throw new Error(result.error || 'Error al actualizar contraseña')
      }

      console.log('✅ Contraseña actualizada exitosamente (vía API)')
      console.log('📊 Datos del usuario recibidos:', result.user)
      
      const userData = result.user

      // Verificar perfil para redirección
      if (userData) {
        if (userData.profile_completed || (userData.first_name && userData.last_name)) {
          console.log('✅ Perfil completo, redirigiendo al dashboard')
          if (userData.role === 'client') {
            const dashboardUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL || 'http://localhost:3001'
            window.location.href = `${dashboardUrl}/`
          } else {
            window.location.href = '/admin'
          }
          return
        }
        
        if (userData.role === 'client') {
          const dashboardUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL || 'http://localhost:3001'
          window.location.href = `${dashboardUrl}/complete-profile`
          return
        }
      }
      
      console.log('➡️ Redirigiendo a /admin/complete-profile')
      window.location.href = '/admin/complete-profile'

    } catch (error: any) {
      console.error('❌ Error general:', error)
      setErrors({ submit: error.message || 'Error al establecer la contraseña.' })
    } finally {
      setSaving(false)
    }
  }

  // Mostrar loader mientras está cargando el estado de autenticación o procesando el hash
  // PERO: Si ya tenemos usuario, no mostrar loader aunque authLoading sea true
  const shouldShowLoader = processingHash || (authLoading && !user)
  
  if (shouldShowLoader) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500 mx-auto" />
          <p className="mt-4 text-sm text-gray-600">
            {processingHash ? 'Estableciendo sesión...' : 'Cargando...'}
          </p>
        </div>
      </div>
    )
  }

  // Si no hay usuario después de cargar, no mostrar nada (el useEffect redirigirá)
  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Establece tu contraseña
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Para completar tu registro, establece una contraseña segura
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="password">Nueva Contraseña</Label>
              <div className="mt-1 relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className={errors.password ? "border-red-500" : ""}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
              <div className="mt-1 relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirma tu contraseña"
                  className={errors.confirmPassword ? "border-red-500" : ""}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
              )}
            </div>
          </div>

          {errors.submit && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-700">{errors.submit}</p>
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              'Guardar contraseña'
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
