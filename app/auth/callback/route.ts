import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/admin'

  console.log('🔐 Admin callback recibido:', { 
    code: code ? 'presente' : 'ausente',
    next, 
    origin,
    fullUrl: request.url
  })

  // CASO 1: Flujo PKCE con code
  if (code) {
    console.log('✅ Code presente, intercambiando por sesión...')
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('❌ Error en exchangeCodeForSession:', error)
      return NextResponse.redirect(`${origin}/admin/login?error=auth`)
    }
    
    console.log('✅ Sesión establecida, procesando autenticación...')
    return await handleSuccessfulAuth(supabase, next, origin)
  }
  
  // CASO 2: Flujo Implicit (sin code) - Los tokens están en el hash fragment
  // Como el servidor no puede leer el hash, redirigir directamente a la página destino
  // La página del cliente leerá el hash y establecerá la sesión
  console.log('⚠️ No hay code, asumiendo flujo implicit (tokens en hash)')
  console.log('🔗 Redirigiendo a la página destino para que el cliente lea el hash')
  const redirectPath = next.startsWith('/') ? next : `/${next}`
  return NextResponse.redirect(`${origin}${redirectPath}`)
}

async function handleSuccessfulAuth(
  supabase: any, 
  next: string, 
  origin: string
) {
  // Sync basic profile fields (first_name, last_name, email) into public.users
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const meta: any = user.user_metadata || {}
      
      const firstName = meta.first_name || meta.given_name || null
      const lastName = meta.last_name || meta.family_name || null
      const payload = {
        id: user.id,
        email: user.email,
        first_name: firstName,
        last_name: lastName,
      }
      
      // Upsert to ensure row exists and names are stored
      const { error: upsertError } = await supabase
        .from('users')
        .upsert(payload, { onConflict: 'id' })
      
      if (upsertError) {
        console.error('Failed to upsert users profile in callback:', upsertError)
      }
      
      console.log('✅ Usuario autenticado:', { 
        email: user.email,
        redirecting_to: next
      })
    }
  } catch (e) {
    console.error('Profile sync error in callback:', e)
  }
  
  // Usar el next especificado (que puede ser /admin/set-password o /admin)
  const redirectPath = next.startsWith('/') ? next : `/${next}`
  console.log('🔗 Redirigiendo a:', redirectPath)
  return NextResponse.redirect(`${origin}${redirectPath}`)
}

