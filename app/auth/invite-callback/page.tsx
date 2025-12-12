'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'

/**
 * Página intermedia para preservar el hash fragment
 * Supabase puede redirigir aquí, y esta página preserva el hash y redirige a set-password
 */
function InviteCallback() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const type = searchParams.get('type') || 'invite'
  const next = searchParams.get('next') || '/admin/set-password'

  useEffect(() => {
    console.log('🔗 invite-callback page iniciado')
    console.log('🔗 Type:', type)
    console.log('🔗 Next:', next)
    console.log('🔗 URL completa:', window.location.href)
    console.log('🔗 Hash:', window.location.hash ? window.location.hash.substring(0, 100) + '...' : 'sin hash')

    // Leer el hash de la URL actual
    const hash = window.location.hash

    // Redirigir a set-password preservando el hash
    if (hash && hash.includes('access_token')) {
      console.log('✅ Hash detectado, redirigiendo a set-password con hash preservado')
      // Usar window.location.href para preservar el hash completamente
      const targetPath = next.startsWith('/') ? next : `/${next}`
      window.location.href = `${targetPath}${hash}`
    } else {
      console.log('⚠️ No se encontró hash, redirigiendo a set-password sin hash')
      // Si no hay hash, redirigir de todas formas (puede que ya se haya procesado)
      const targetPath = next.startsWith('/') ? next : `/${next}`
      router.push(targetPath)
    }
  }, [router, type, next])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        <p className="mt-4 text-sm text-gray-600">Procesando invitación...</p>
      </div>
    </div>
  )
}

export default function InviteCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-sm text-gray-600">Cargando...</p>
        </div>
      </div>
    }>
      <InviteCallback />
    </Suspense>
  )
}
