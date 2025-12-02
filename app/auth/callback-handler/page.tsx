'use client'

import { useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function CallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const hasProcessed = useRef(false)
  const nextPath = searchParams.get('next') || '/admin/set-password'

  useEffect(() => {
    console.log('🔗 callback-handler iniciado')
    console.log('🔗 window.location.href:', window.location.href)
    console.log('🔗 window.location.hash:', window.location.hash || 'SIN HASH')
    console.log('🔗 nextPath:', nextPath)
    console.log('🔗 searchParams type:', searchParams.get('type'))
    console.log('🔗 searchParams code:', searchParams.get('code') || 'sin code')
    console.log('🔗 searchParams access_token:', searchParams.get('access_token') || 'sin access_token')
    
    if (hasProcessed.current) {
      console.log('⏭️ Ya procesado, saliendo')
      return
    }

    // Función para leer hash - puede ejecutarse múltiples veces
    const readHashAndRedirect = () => {
      // Leer hash de la URL completa y también de window.location.hash
      const fullUrl = window.location.href
      const hashFromUrl = window.location.hash
      const hashIndex = fullUrl.indexOf('#')
      
      console.log('🔍 URL completa:', fullUrl)
      console.log('🔍 Hash desde window.location.hash:', hashFromUrl || 'SIN HASH')
      console.log('🔍 Hash index:', hashIndex)
      
      // Usar hashFromUrl primero, luego intentar desde fullUrl
      let currentHash = hashFromUrl || (hashIndex !== -1 ? fullUrl.substring(hashIndex) : '')
      
      if (!currentHash || currentHash === '') {
        // No hay hash todavía, esperar un momento y reintentar (máximo 10 intentos)
        const retryCount = parseInt(sessionStorage.getItem('callback_retry_count') || '0')
        if (retryCount < 10) {
          console.log(`⏳ Esperando hash... (intento ${retryCount + 1}/10)`)
          sessionStorage.setItem('callback_retry_count', String(retryCount + 1))
          setTimeout(() => {
            if (!hasProcessed.current) {
              readHashAndRedirect()
            }
          }, 200)
          return
        } else {
          console.error('❌ No se encontró hash después de múltiples intentos')
          sessionStorage.removeItem('callback_retry_count')
          router.push('/admin/login?error=no_tokens')
          return
        }
      }
      
      // Limpiar contador de reintentos
      sessionStorage.removeItem('callback_retry_count')
      
      console.log('🔍 Hash encontrado:', currentHash.substring(0, 100) + '...')
      
      if (!currentHash.includes('access_token')) {
        console.error('❌ Hash no contiene access_token')
        // Esperar un poco más por si acaso
        setTimeout(() => {
          if (!hasProcessed.current) {
            const retryHash = window.location.hash
            if (retryHash && retryHash.includes('access_token')) {
              readHashAndRedirect()
            } else {
              router.push('/admin/login?error=no_tokens')
            }
          }
        }, 500)
        return
      }

      // Marcar como procesado
      hasProcessed.current = true

      // Extraer tokens del hash
      const hashParams = new URLSearchParams(currentHash.substring(1))
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')
      const type = hashParams.get('type') || searchParams.get('type') || 'recovery'

      console.log('🔐 Tokens encontrados:', {
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        type
      })

      if (!accessToken || !refreshToken) {
        console.error('❌ Tokens incompletos')
        router.push('/admin/login?error=incomplete_tokens')
        return
      }

      // Guardar tokens en sessionStorage para que set-password los use
      sessionStorage.setItem('auth_tokens', JSON.stringify({
        access_token: accessToken,
        refresh_token: refreshToken,
        type: type
      }))

      console.log('✅ Tokens guardados, redirigiendo a:', nextPath)

      // Limpiar hash
      window.history.replaceState(null, '', window.location.pathname)

      // Redirigir a la página especificada en next (o set-password por defecto)
      window.location.href = nextPath
    }

    // Intentar leer inmediatamente
    readHashAndRedirect()
  }, [router, nextPath, searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-sm text-gray-600">Redirigiendo...</p>
      </div>
    </div>
  )
}

export default function CallbackHandlerPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-sm text-gray-600">Cargando...</p>
        </div>
      </div>
    }>
      <CallbackHandler />
    </Suspense>
  )
}
