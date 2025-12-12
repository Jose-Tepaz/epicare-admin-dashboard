"use client"

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Loader2, CheckCircle2, Eye, EyeOff } from 'lucide-react'

function ResetPasswordForm() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [validatingToken, setValidatingToken] = useState(true)
  const router = useRouter()
  const searchParams = useSearchParams()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const validateToken = async () => {
      try {
        console.log('🔍 Validando token de recuperación...')
        
        // Verificar si hay un hash con access_token
        const hash = window.location.hash
        if (hash && hash.includes('access_token')) {
          const hashParams = new URLSearchParams(hash.substring(1))
          const accessToken = hashParams.get('access_token')
          const refreshToken = hashParams.get('refresh_token')
          const type = hashParams.get('type')

          console.log('🔑 Tokens detectados:', { hasAccessToken: !!accessToken, type })

          if (accessToken && refreshToken && type === 'recovery') {
            console.log('✅ Token de recuperación válido, estableciendo sesión...')
            
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            })

            if (sessionError) {
              console.error('❌ Error estableciendo sesión:', sessionError)
              setError('El enlace de recuperación es inválido o ha expirado.')
              setValidatingToken(false)
              return
            }

            console.log('✅ Sesión establecida, usuario puede cambiar contraseña')
            setValidatingToken(false)
            return
          }
        }

        // Si no hay hash, verificar si ya hay una sesión activa
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session) {
          console.log('✅ Sesión activa encontrada')
          setValidatingToken(false)
        } else {
          console.log('❌ No hay sesión activa ni token válido')
          setError('No se encontró un token de recuperación válido. Por favor solicita un nuevo enlace.')
          setValidatingToken(false)
        }
      } catch (err) {
        console.error('❌ Error validando token:', err)
        setError('Error al validar el enlace de recuperación.')
        setValidatingToken(false)
      }
    }

    validateToken()
  }, [supabase])

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validaciones
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      setLoading(false)
      return
    }

    try {
      console.log('🔐 Actualizando contraseña...')

      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      })

      if (updateError) {
        console.error('❌ Error actualizando contraseña:', updateError)
        setError('Error al actualizar la contraseña. Por favor intenta nuevamente.')
        setLoading(false)
        return
      }

      console.log('✅ Contraseña actualizada exitosamente')
      setSuccess(true)

      // Redirigir al login después de 3 segundos
      setTimeout(() => {
        router.push('/admin/login?password_reset=success')
      }, 3000)

    } catch (err) {
      console.error('Error reseteando contraseña:', err)
      setError('Error inesperado al resetear la contraseña.')
      setLoading(false)
    }
  }

  if (validatingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-[#F26023] mx-auto mb-4" />
            <p className="text-gray-600">Validando enlace de recuperación...</p>
          </div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg">
          <div className="text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              ¡Contraseña actualizada!
            </h2>
            <p className="text-gray-600 mb-4">
              Tu contraseña ha sido cambiada exitosamente.
            </p>
            <p className="text-sm text-gray-500">
              Redirigiendo al inicio de sesión...
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg">
        {/* Logo y Título */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-[#F26023] rounded-full flex items-center justify-center mb-4">
            <span className="text-white font-bold text-2xl">E</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Restablecer Contraseña</h2>
          <p className="mt-2 text-sm text-gray-600">
            Ingresa tu nueva contraseña
          </p>
        </div>

        {/* Errores */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Formulario */}
        <form onSubmit={handleResetPassword} className="mt-8 space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="password">Nueva Contraseña</Label>
              <div className="relative mt-1">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  disabled={loading}
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Mínimo 8 caracteres
              </p>
            </div>

            <div>
              <Label htmlFor="confirm-password">Confirmar Contraseña</Label>
              <div className="relative mt-1">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  disabled={loading}
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              type="submit"
              className="w-full bg-[#F26023] hover:bg-[#d9531f]"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Actualizando...
                </>
              ) : (
                'Restablecer Contraseña'
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => router.push('/admin/login')}
              disabled={loading}
            >
              Volver al inicio de sesión
            </Button>
          </div>
        </form>

        {/* Nota de seguridad */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Tu contraseña debe ser segura y única.</p>
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-sm text-gray-600">Cargando...</p>
        </div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}
