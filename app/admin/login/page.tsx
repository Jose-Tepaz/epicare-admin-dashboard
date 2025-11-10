"use client"

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Loader2 } from 'lucide-react'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    // Mostrar errores de la URL (de redirección del middleware)
    const errorParam = searchParams.get('error')
    if (errorParam === 'access_denied') {
      setError('No tienes permisos para acceder al panel de administración.')
    } else if (errorParam === 'role_check_failed') {
      setError('Error al verificar permisos. Por favor intenta nuevamente.')
    }
  }, [searchParams])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Intentar login
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        setError('Email o contraseña incorrectos.')
        setLoading(false)
        return
      }

      if (!authData.user) {
        setError('Error al iniciar sesión.')
        setLoading(false)
        return
      }

      // Verificar roles del usuario
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select(`
          roles:role_id (
            name
          )
        `)
        .eq('user_id', authData.user.id)

      if (rolesError) {
        console.error('Error checking roles:', rolesError)
        console.error('User ID:', authData.user.id)
        setError(`Error al verificar permisos: ${rolesError.message}`)
        await supabase.auth.signOut()
        setLoading(false)
        return
      }

      console.log('User roles data:', userRoles)

      const roles = userRoles?.map((ur: any) => ur.roles?.name).filter(Boolean) || []
      const hasAdminAccess = roles.some((role: string) => 
        ['super_admin', 'admin', 'support_staff'].includes(role)
      )

      if (!hasAdminAccess) {
        setError('No tienes permisos para acceder al panel de administración.')
        await supabase.auth.signOut()
        setLoading(false)
        return
      }

      // Login exitoso con permisos correctos
      router.push('/admin')
      router.refresh()
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

