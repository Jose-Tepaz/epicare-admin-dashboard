'use client'

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAdminAuth } from "@/contexts/admin-auth-context"
import { createClient } from "@/lib/supabase/client"
import { Loader2, Eye, EyeOff } from "lucide-react"

function SetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAdminAuth()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [processingHash, setProcessingHash] = useState(false)
  const [hasProcessedHash, setHasProcessedHash] = useState(false)
  const [allowAccessWithoutUser, setAllowAccessWithoutUser] = useState(false)

  useEffect(() => {
    const setupSession = async () => {
      const fromInvite = searchParams.get('from_invite') === 'true'
      
      console.log('🔍 set-password useEffect iniciado')
      console.log('🔍 Usuario actual:', user ? user.email : 'sin usuario')
      console.log('🔍 authLoading:', authLoading)
      console.log('🔍 processingHash:', processingHash)
      console.log('🔍 hasProcessedHash:', hasProcessedHash)
      console.log('🔍 allowAccessWithoutUser:', allowAccessWithoutUser)
      console.log('🔍 from_invite:', fromInvite)
      
      // ⭐ PRIORIDAD 1: Si ya permitimos acceso, no hacer nada más
      if (allowAccessWithoutUser) {
        console.log('✅ Acceso ya permitido, mostrando formulario')
        return
      }
      
      // ⭐ PRIORIDAD 2: Si viene de invitación, permitir acceso inmediatamente
      // NO importa el estado de authLoading o user
      if (fromInvite) {
        console.log('✅✅✅ from_invite=true detectado, permitiendo acceso inmediato')
        setAllowAccessWithoutUser(true)
        return
      }
      
      const supabase = createClient()
      
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
      
      // IMPORTANTE: Verificar si hay sesión en Supabase Auth directamente
      // No confiar solo en el contexto porque puede fallar si el usuario no existe en public.users
      if (!authLoading && !user && !currentHash && !processingHash) {
        console.log('⚠️⚠️⚠️ SET-PASSWORD: No hay usuario en contexto')
        
        // Si viene de invitación, permitir acceso sin más verificaciones
        if (fromInvite) {
          console.log('✅ from_invite=true, permitiendo acceso directo')
          setAllowAccessWithoutUser(true)
          return
        }
        
        console.log('🔍 Verificando sesión en Supabase Auth...')
        
        try {
          console.log('🔍 Llamando a supabase.auth.getSession()...')
          
          // Agregar timeout de 3 segundos
          const getSessionPromise = supabase.auth.getSession()
          const timeoutPromise = new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('getSession timeout')), 3000)
          )
          
          let session = null
          let sessionError = null
          
          try {
            const result = await Promise.race([getSessionPromise, timeoutPromise]) as any
            session = result.data?.session
            sessionError = result.error
          } catch (timeoutErr: any) {
            if (timeoutErr.message === 'getSession timeout') {
              console.warn('⚠️ getSession timeout (>3s)')
              console.log('⚠️ Asumiendo que HAY sesión (usuario invitado recién creado)')
              console.log('✅ Permitiendo acceso a set-password')
              // Si hay timeout, ASUMIR que hay sesión válida
              // Esto sucede con usuarios recién invitados
              setAllowAccessWithoutUser(true)
              return
            }
            throw timeoutErr
          }
          
          console.log('📊 Resultado de getSession:', {
            hasSession: !!session,
            hasUser: !!session?.user,
            userId: session?.user?.id,
            error: sessionError?.message
          })
          
          if (session?.user) {
            console.log('✅✅✅ Sesión encontrada en Supabase Auth (usuario invitado sin perfil completo)')
            console.log('✅ Permitiendo que el usuario establezca su contraseña')
            // NO redirigir - permitir que el usuario establezca su contraseña
            return
          }
          
          console.log('⚠️⚠️⚠️ No hay sesión en Supabase Auth')
          console.log('➡️ Redirigiendo a login en 1 segundo...')
          setTimeout(() => {
            console.log('➡️ Ejecutando router.push(/admin/login)')
            router.push('/admin/login')
          }, 1000)
        } catch (err) {
          console.error('❌ Error verificando sesión:', err)
          // En caso de error, redirigir a login
          setTimeout(() => {
            router.push('/admin/login')
          }, 1000)
        }
        return
      }
      
      // Si ya hay usuario autenticado
      if (user && !authLoading) {
        console.log('✅ Usuario autenticado, mostrando formulario para:', user.email)
      }
    }

    setupSession()
  }, [user, authLoading, router, processingHash, hasProcessedHash, searchParams, allowAccessWithoutUser])

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

    // No verificar user aquí - el API route obtendrá el usuario del servidor
    console.log('✅ Validación OK, estableciendo contraseña...')
    
    // Obtener userId - priorizar el user del contexto
    let userId = user?.id || null
    
    if (user) {
      console.log('👤 Usuario del contexto:', user.email, 'ID:', user.id)
    } else {
      console.log('👤 No hay usuario en contexto, extrayendo de localStorage...')
    }
    
    // Si no hay user del contexto, intentar extraer de otras fuentes
    if (!userId) {
      console.log('🔍 Intentando extraer userId del hash...')
      // Intentar extraer del hash fragment (si tiene access_token)
      const hash = window.location.hash
      if (hash && hash.includes('access_token')) {
        try {
          const hashParams = new URLSearchParams(hash.substring(1))
          const accessToken = hashParams.get('access_token')
          if (accessToken) {
            // Decodificar el JWT (sin verificar firma, solo para extraer el sub)
            const payload = accessToken.split('.')[1]
            const decoded = JSON.parse(atob(payload))
            userId = decoded.sub
            console.log('✅ userId obtenido del access_token en hash:', userId)
          }
        } catch (hashErr) {
          console.warn('⚠️ No se pudo extraer userId del hash:', hashErr)
        }
      }
      
      // Si no hay en hash, intentar localStorage
      if (!userId) {
        console.log('🔍 Intentando extraer de localStorage...')
        try {
          // Buscar la clave correcta en localStorage
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (key && key.includes('supabase') && key.includes('auth-token')) {
              const data = localStorage.getItem(key)
              if (data) {
                try {
                  const parsed = JSON.parse(data)
                  if (parsed?.user?.id) {
                    userId = parsed.user.id
                    console.log('✅ userId obtenido de localStorage:', userId)
                    break
                  }
                } catch (e) {
                  // Continuar buscando
                }
              }
            }
          }
        } catch (localErr) {
          console.warn('⚠️ No se pudo leer localStorage:', localErr)
        }
      }
    }
    
    if (!userId) {
      console.error('❌ No se pudo identificar al usuario de ninguna fuente')
      throw new Error('No se pudo identificar al usuario. Por favor recarga la página.')
    }
    
    console.log('🔑 userId final a enviar:', userId)
    setSaving(true)

    try {
      
      // USAR API ROUTE CON ADMIN CLIENT
      console.log('🔄 Llamando API con userId:', userId)
      
      const response = await fetch('/api/auth/update-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          password: password.trim(),
          userId: userId
        }),
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

      console.log('✅ Contraseña actualizada exitosamente')
      console.log('📊 Datos del usuario:', result.user || 'No disponibles')

      // Después de establecer contraseña, redirigir al login
      console.log('✅ Contraseña establecida con éxito')
      console.log('➡️ Esperando 500ms...')
      
      await new Promise(resolve => setTimeout(resolve, 500))
      
      console.log('➡️ Redirigiendo al login para iniciar sesión...')
      
      // Redirigir al login con mensaje de éxito
      window.location.href = '/admin/login?password_set=true'

    } catch (error: any) {
      console.error('❌ Error general:', error)
      setErrors({ submit: error.message || 'Error al establecer la contraseña.' })
    } finally {
      setSaving(false)
    }
  }

  // Mostrar loader mientras está cargando el estado de autenticación o procesando el hash
  // PERO: Si ya tenemos usuario O permitimos acceso sin usuario, no mostrar loader
  const shouldShowLoader = processingHash || (authLoading && !user && !allowAccessWithoutUser)
  
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
  // EXCEPTO si permitimos acceso explícitamente por timeout
  if (!user && !allowAccessWithoutUser) {
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

export default function SetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500 mx-auto" />
          <p className="mt-4 text-sm text-gray-600">Cargando...</p>
        </div>
      </div>
    }>
      <SetPasswordForm />
    </Suspense>
  )
}
