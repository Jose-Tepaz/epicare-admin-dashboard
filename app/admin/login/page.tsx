"use client"

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Loader2 } from 'lucide-react'

function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Usar createBrowserClient de @supabase/ssr (recomendado para Next.js)
  // Esto evita múltiples instancias y conflictos
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Verificar si ya hay una sesión activa y redirigir
  useEffect(() => {
    console.log('🔄 checkSession useEffect iniciado en Login')
    let mounted = true
    
    const checkSession = async () => {
      try {
        console.log('🔍 Obteniendo sesión en Login...')
        
        // Agregar timeout de 2 segundos a getSession
        const getSessionPromise = supabase.auth.getSession()
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('getSession timeout')), 2000)
        )
        
        let session = null
        let sessionError = null
        
        try {
          const result = await Promise.race([getSessionPromise, timeoutPromise]) as any
          session = result.data?.session
          sessionError = result.error
        } catch (timeoutErr: any) {
          console.warn('⚠️ getSession timeout en Login (>2s), asumiendo sin sesión')
          return // Salir y mostrar formulario de login
        }
        
        console.log('📊 Estado de sesión:', {
          hasSession: !!session,
          hasUser: !!session?.user,
          userId: session?.user?.id,
          sessionError: sessionError?.message
        })
        
        if (!mounted) {
          console.log('⏸️ Componente desmontado, cancelando verificación')
          return
        }
        
        if (session?.user) {
          console.log('✅ Sesión activa detectada en Login para usuario:', session.user.id)
          
          // Crear un timeout de 1 segundo para la consulta de perfil
          const timeoutPromise = new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Timeout verificando perfil')), 1000)
          )
          
          console.log('🔍 Verificando si usuario existe en public.users...')
          const profilePromise = supabase
            .from('users')
            .select('id')
            .eq('id', session.user.id)
            .maybeSingle()
          
          try {
            const result = await Promise.race([profilePromise, timeoutPromise])
            
            if (!mounted) return
            
            if ('error' in result && result.error) {
              console.warn('⚠️ Error verificando perfil:', result.error)
              console.log('➡️ Redirigiendo a set-password por error...')
              router.push('/admin/set-password')
              return
            }
            
            if (!result.data) {
              console.log('⚠️ Usuario sin perfil en BD (invitación incompleta)')
              console.log('➡️ Redirigiendo a set-password...')
              router.push('/admin/set-password')
              return
            }
            
            console.log('✅ Perfil encontrado en BD')
            console.log('➡️ Redirigiendo a dashboard...')
            router.push('/admin')
          } catch (timeoutError) {
            if (!mounted) return
            console.warn('⚠️ Timeout verificando perfil (>1s)')
            console.log('➡️ Asumiendo invitación incompleta, redirigiendo a set-password...')
            router.push('/admin/set-password')
          }
        } else {
          console.log('ℹ️ No hay sesión activa en Login, mostrando formulario')
        }
      } catch (e) {
        console.error('❌ Error en checkSession:', e)
      }
    }
    
    // Pequeño delay para permitir que AdminAuthContext inicialice
    const timer = setTimeout(checkSession, 100)
    
    return () => {
      mounted = false
      clearTimeout(timer)
    }
  }, [supabase, router])

  useEffect(() => {
    // Detectar si viene de una invitación (hash fragment con access_token)
    const checkInvitation = async () => {
      const hash = window.location.hash
      const fullUrl = window.location.href
      
      console.log('🔍 Login page - Verificando invitación...')
      console.log('🔍 URL completa:', fullUrl.substring(0, 300))
      console.log('🔍 Hash fragment:', hash ? hash.substring(0, 100) + '...' : 'VACÍO')
      console.log('🔍 Search params:', Object.fromEntries(searchParams.entries()))
      console.log('🔍 Document referrer:', document.referrer.substring(0, 200))
      
      // Verificar si viene después de establecer contraseña
      const passwordSet = searchParams.get('password_set')
      if (passwordSet === 'true') {
        setSuccessMessage('✅ Contraseña establecida exitosamente. Inicia sesión con tu nueva contraseña.')
      }

      // Verificar si viene después de resetear contraseña
      const passwordReset = searchParams.get('password_reset')
      if (passwordReset === 'success') {
        setSuccessMessage('✅ Contraseña actualizada exitosamente. Ahora puedes iniciar sesión con tu nueva contraseña.')
      }
      
      // Verificar si venimos de Supabase (el referrer puede ayudar a detectar invitaciones)
      const isFromSupabase = document.referrer.includes('supabase.co')
      console.log('🔍 Viene de Supabase:', isFromSupabase)
      
      if (hash && hash.includes('access_token')) {
        const hashParams = new URLSearchParams(hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        const type = hashParams.get('type')
        
        console.log('🔑 Tokens detectados en hash:', { 
          hasAccessToken: !!accessToken, 
          hasRefreshToken: !!refreshToken, 
          type 
        })

        if (accessToken && refreshToken) {
          console.log('📧 ✅ Tokens de invitación detectados, estableciendo sesión...')
          
          try {
            // Establecer la sesión directamente desde el hash
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            })
            
            if (sessionError) {
              console.error('❌ Error estableciendo sesión:', sessionError)
              // Si falla, redirigir a set-password con el hash preservado
              window.location.href = `/admin/set-password${hash}`
              return
            }
            
            console.log('✅ Sesión establecida correctamente, redirigiendo a set-password...')
            // Redirigir a set-password después de establecer la sesión
            window.location.href = '/admin/set-password'
            return
          } catch (e) {
            console.error('❌ Error procesando tokens:', e)
            // Fallback: redirigir a set-password con el hash preservado
            window.location.href = `/admin/set-password${hash}`
            return
          }
        }
        // Si hay token, no mostrar errores de acceso denegado
        return
      }

      // Verificar si hay código en los query params (PKCE flow)
      const code = searchParams.get('code')
      const type = searchParams.get('type')
      
      if (code) {
        console.log('🔑 Code detectado en query params (PKCE flow)')
        console.log('🔗 Redirigiendo a /auth/callback para procesar el código...')
        // Redirigir al callback para que procese el código
        const next = searchParams.get('next') || '/admin/set-password'
        window.location.href = `/auth/callback?code=${code}&next=${encodeURIComponent(next)}&type=${type || 'invite'}`
        return
      }

      // Si venimos de Supabase pero no hay hash ni code, podría ser una invitación
      // que Supabase redirigió directamente al login. Intentar verificar si hay sesión pendiente.
      if (isFromSupabase && !hash && !code) {
        console.log('⚠️ Viene de Supabase pero sin tokens. Verificando sesión...')
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          console.log('✅ Sesión encontrada después de venir de Supabase, redirigiendo a set-password...')
          window.location.href = '/admin/set-password'
          return
        }
      }

      // Solo mostrar errores si NO hay token ni código
      const errorParam = searchParams.get('error')
      if (errorParam === 'access_denied') {
        setError('No tienes permisos para acceder al panel de administración.')
      } else if (errorParam === 'role_check_failed') {
        setError('Error al verificar permisos. Por favor intenta nuevamente.')
      } else if (errorParam) {
        console.warn('⚠️ Error en login:', errorParam)
        setError(`Error de autenticación: ${errorParam}`)
      }
    }

    checkInvitation()
  }, [searchParams, router, supabase])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    console.log('🔐 Iniciando login...')
    console.log('📧 Email:', email)
    console.log('🔗 Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)

    try {
      // Intentar login
      console.log('⏳ Llamando a signInWithPassword...')
      
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      console.log('📧 Respuesta de signInWithPassword recibida!')
      console.log('📧 Datos:', {
        hasUser: !!authData?.user,
        userId: authData?.user?.id,
        hasError: !!authError,
        errorMessage: authError?.message
      })

      if (authError) {
        console.error('❌ Error de autenticación:', authError)
        setError('Email o contraseña incorrectos.')
        setLoading(false)
        return
      }

      if (!authData.user) {
        console.error('❌ No se recibió usuario')
        setError('Error al iniciar sesión.')
        setLoading(false)
        return
      }

      // Verificar rol del usuario
      console.log('👤 Verificando rol del usuario:', authData.user.id)
      
      // Primero intentar obtener el rol del user_metadata (más rápido)
      let userRole = authData.user.user_metadata?.role || authData.user.app_metadata?.role
      
      console.log('📋 Rol desde metadata:', userRole)
      
      // Si no hay rol en metadata, consultar la tabla users
      if (!userRole) {
        console.log('⏳ Rol no encontrado en metadata, consultando tabla users...')
        
        try {
          // Usar fetch directo en lugar de Supabase client para evitar RLS
          const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/users?id=eq.${authData.user.id}&select=role`, {
            headers: {
              'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
              'Authorization': `Bearer ${authData.session?.access_token}`,
              'Content-Type': 'application/json',
            },
            signal: AbortSignal.timeout(5000) // 5 second timeout
          })
          
          if (response.ok) {
            const data = await response.json()
            userRole = data[0]?.role
            console.log('✅ Rol obtenido de la tabla:', userRole)
          } else {
            console.error('❌ Error en fetch:', response.status, response.statusText)
          }
        } catch (err: any) {
          console.error('❌ Error consultando rol:', err.message)
        }
      }

      console.log('🔑 Verificación de acceso:', {
        userRole,
        allowedRoles: ['super_admin', 'admin', 'agent', 'support_staff']
      })

      const hasAdminAccess = userRole && ['super_admin', 'admin', 'agent', 'support_staff'].includes(userRole)

      if (!hasAdminAccess) {
        console.error('❌ Usuario sin permisos de admin')
        setError('No tienes permisos para acceder al panel de administración.')
        await supabase.auth.signOut()
        setLoading(false)
        return
      }

      // Login exitoso con permisos correctos
      console.log('✅ Login exitoso! Redirigiendo a /admin...')
      console.log('⏳ Esperando 500ms para que las cookies se establezcan...')
      
      // Esperar un momento para que las cookies se establezcan
      await new Promise(resolve => setTimeout(resolve, 500))
      
      console.log('🔄 Redirigiendo con window.location.href...')
      // Forzar recarga completa de la página para asegurar que el middleware vea la sesión
      window.location.href = '/admin'
    } catch (err) {
      console.error('Login error:', err)
      setError('Error inesperado al iniciar sesión.')
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccessMessage('')

    console.log('🔐 Iniciando recuperación de contraseña...')
    console.log('📧 Email:', resetEmail)

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/admin/reset-password`,
      })

      if (resetError) {
        console.error('❌ Error enviando email de recuperación:', resetError)
        setError('Error al enviar el email de recuperación. Verifica que el email sea correcto.')
        setLoading(false)
        return
      }

      console.log('✅ Email de recuperación enviado exitosamente')
      setSuccessMessage('✅ Se ha enviado un enlace de recuperación a tu email. Por favor revisa tu bandeja de entrada.')
      setResetEmail('')
      
      // Volver al formulario de login después de 3 segundos
      setTimeout(() => {
        setShowForgotPassword(false)
        setSuccessMessage('')
      }, 5000)
      
      setLoading(false)
    } catch (err) {
      console.error('Error en recuperación de contraseña:', err)
      setError('Error inesperado al enviar el email de recuperación.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg">
        {/* Logo y Título */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-[#F26023] rounded-full flex items-center justify-center mb-4">
            <span className="text-white font-bold text-2xl">E</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">epicare</h2>
          <p className="mt-2 text-lg text-gray-600">Panel de Administración</p>
        </div>

        {/* Mensaje de éxito */}
        {successMessage && (
          <Alert className="border-green-200 bg-green-50 text-green-800">
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        )}

        {/* Errores */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Formulario de Login o Recuperar Contraseña */}
        {!showForgotPassword ? (
          <form onSubmit={handleLogin} className="mt-8 space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1"
                  placeholder="admin@epicare.com"
                  disabled={loading}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label htmlFor="password">Contraseña</Label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(true)
                      setError('')
                      setSuccessMessage('')
                    }}
                    className="text-xs text-[#F26023] hover:text-[#d9531f] font-medium"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="mt-1"
                  placeholder="••••••••"
                  disabled={loading}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-[#F26023] hover:bg-[#d9531f]"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                'Iniciar Sesión'
              )}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleForgotPassword} className="mt-8 space-y-6">
            <div className="space-y-4">
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Recuperar Contraseña</h3>
                <p className="text-sm text-gray-600 mt-2">
                  Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.
                </p>
              </div>

              <div>
                <Label htmlFor="reset-email">Email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  className="mt-1"
                  placeholder="admin@epicare.com"
                  disabled={loading}
                />
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
                    Enviando...
                  </>
                ) : (
                  'Enviar enlace de recuperación'
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  setShowForgotPassword(false)
                  setResetEmail('')
                  setError('')
                  setSuccessMessage('')
                }}
                disabled={loading}
              >
                Volver al inicio de sesión
              </Button>
            </div>
          </form>
        )}

        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="text-center space-y-3">
            <Button
              variant="outline"
              className="w-full text-sm"
              onClick={() => router.push('/admin/set-password')}
            >
              ¿Tienes problemas con tu invitación?
            </Button>
            
            <Button
              variant="ghost"
              className="w-full text-xs text-gray-400 h-6"
              onClick={() => router.push('/admin/test-rls')}
            >
              Diagnóstico de conexión
            </Button>
          </div>
        </div>

        {/* Nota de seguridad */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Solo usuarios con rol de administrador o soporte pueden acceder.</p>
        </div>
      </div>
    </div>
  )
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-sm text-gray-600">Cargando...</p>
        </div>
      </div>
    }>
      <AdminLogin />
    </Suspense>
  )
}
