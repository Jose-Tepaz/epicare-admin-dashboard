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
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        console.log('✅ Sesión activa detectada, redirigiendo a /admin...')
        router.push('/admin')
      }
    }
    checkSession()
  }, [supabase, router])

  useEffect(() => {
    // Detectar si viene de una invitación (hash fragment con access_token)
    const checkInvitation = async () => {
      const hash = window.location.hash
      console.log('🔍 Hash fragment detectado:', hash)
      
      if (hash && hash.includes('access_token')) {
        const hashParams = new URLSearchParams(hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        const type = hashParams.get('type')
        
        console.log('🔑 Tokens detectados:', { 
          hasAccessToken: !!accessToken, 
          hasRefreshToken: !!refreshToken, 
          type 
        })

        if (accessToken && refreshToken) {
          console.log('📧 Tokens de invitación detectados, redirigiendo a set-password...')
          
          // Redirigir DIRECTAMENTE a set-password con el hash preservado
          // set-password se encargará de establecer la sesión
          window.location.href = `/admin/set-password${hash}`
          return
        }
        // Si hay token, no mostrar errores de acceso denegado
        return
      }

      // Solo mostrar errores si NO hay token en el hash
      const errorParam = searchParams.get('error')
      if (errorParam === 'access_denied') {
        setError('No tienes permisos para acceder al panel de administración.')
      } else if (errorParam === 'role_check_failed') {
        setError('Error al verificar permisos. Por favor intenta nuevamente.')
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

        {/* Errores */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Formulario de Login */}
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
              <Label htmlFor="password">Contraseña</Label>
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
