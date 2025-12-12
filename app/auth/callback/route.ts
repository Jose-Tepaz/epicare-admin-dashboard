import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams, origin, hash } = new URL(request.url)
    const code = searchParams.get('code')
    const type = searchParams.get('type') // 'invite', 'recovery', etc.
    const next = searchParams.get('next')
    const errorParam = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')
    
    // Capturar todos los query params para diagnóstico
    const allParams = Object.fromEntries(searchParams.entries())

    console.log('🔐 Admin callback recibido:', { 
      code: code ? 'presente' : 'ausente',
      type,
      next: next || 'no especificado', 
      origin,
      error: errorParam,
      errorDescription,
      hash: hash || 'sin hash',
      allParams,
      fullUrl: request.url.substring(0, 300) // Limitar longitud del log
    })

    // Si hay un error en los parámetros, redirigir al login con el error
    if (errorParam) {
      console.error('❌ Error en callback:', errorParam, errorDescription)
      return NextResponse.redirect(`${origin}/admin/login?error=${errorParam}`)
    }

    // CASO 1: Flujo PKCE con code
    if (code) {
      console.log('✅ Code presente, intercambiando por sesión...')
      console.log('🔍 Creando cliente Supabase...')
      let supabase
      try {
        supabase = await createClient()
        console.log('✅ Cliente Supabase creado')
      } catch (createError: any) {
        console.error('❌ Error creando cliente Supabase:', createError)
        return NextResponse.redirect(`${origin}/admin/login?error=client&details=${encodeURIComponent(createError?.message || 'Error creando cliente')}`)
      }
      
      console.log('🔍 Intercambiando code por sesión...')
      const { error, data } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('❌ Error en exchangeCodeForSession:', error)
        console.error('❌ Detalles del error:', JSON.stringify(error, null, 2))
        return NextResponse.redirect(`${origin}/admin/login?error=auth&details=${encodeURIComponent(error.message)}`)
      }
      
      console.log('✅ Sesión establecida correctamente')
      console.log('🔍 Datos de sesión:', data?.session ? 'presente' : 'ausente', data?.user ? 'usuario presente' : 'usuario ausente')
      console.log('✅ Procesando autenticación...')
      
      // Determinar el destino: si es invitación, ir a set-password; si hay next, usarlo; sino, admin
      let destination = next
      if (!destination && type === 'invite') {
        // Si es una invitación y no hay next especificado, detectar el rol y redirigir
        try {
          const { data: { user }, error: getUserError } = await supabase.auth.getUser()
          
          if (getUserError) {
            console.error('❌ Error obteniendo usuario:', getUserError)
            destination = '/admin/set-password' // Fallback
          } else if (user) {
            const userRole = user.user_metadata?.role || user.app_metadata?.role
            console.log('🔍 Rol detectado en metadata:', userRole)
            
            if (userRole === 'client') {
              destination = '/set-password'
            } else {
              destination = '/admin/set-password'
            }
          } else {
            console.warn('⚠️ Usuario no encontrado después de autenticación')
            destination = '/admin/set-password' // Fallback
          }
        } catch (e) {
          console.error('❌ Error obteniendo usuario para detectar rol:', e)
          destination = '/admin/set-password' // Fallback
        }
      }
      
      if (!destination) {
        destination = '/admin' // Fallback por defecto
      }
      
      return await handleSuccessfulAuth(supabase, destination, origin, type)
    }
    
    // CASO 2: Flujo Implicit (sin code) - Los tokens están en el hash fragment
    // Devolver HTML con múltiples métodos de redirección para máxima compatibilidad
    console.log('⚠️ No hay code, devolviendo HTML con redirección client-side')
    
    // Agregar parámetro 'from_invite=true' para que set-password sepa que viene de invitación
    const basePath = next && next.startsWith('/') ? next : (next ? `/${next}` : '/admin/set-password')
    const redirectPath = `${basePath}${basePath.includes('?') ? '&' : '?'}from_invite=true`
    
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Procesando...</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: #f9fafb;
    }
    .container {
      text-align: center;
      padding: 2rem;
    }
    .spinner {
      border: 3px solid #f3f4f6;
      border-top: 3px solid #f26023;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="spinner"></div>
    <h2>Procesando invitación...</h2>
    <p>Redirigiendo en un momento...</p>
  </div>
  <script>
    // Ejecutar inmediatamente
    console.log('🔗🔗🔗 CALLBACK REDIRECT SCRIPT - SCRIPT TAG EJECUTADO');
    console.log('🔗🔗🔗 Timestamp:', new Date().toISOString());
    
    (function() {
      console.log('🔗 IIFE - INICIO');
      console.log('🔗 window.location.href:', window.location.href);
      console.log('🔗 window.location.hash:', window.location.hash);
      console.log('🔗 window.location.pathname:', window.location.pathname);
      
      var hash = window.location.hash || '';
      var destination = '${redirectPath}' + hash;
      
      console.log('🔗 Hash extraído:', hash);
      console.log('🔗 Hash length:', hash.length);
      console.log('🔗 Destino base:', '${redirectPath}');
      console.log('🔗 Destino completo:', destination);
      console.log('🔗 Ejecutando redirección en 500ms...');
      
      // Agregar un pequeño delay para que los logs se muestren
      setTimeout(function() {
        console.log('🔗 EJECUTANDO REDIRECT AHORA...');
        try {
          window.location.replace(destination);
        } catch (e) {
          console.error('❌ Error en replace:', e);
          window.location.href = destination;
        }
      }, 500);
    })();
  </script>
</body>
</html>`
    
    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  } catch (error: any) {
    console.error('❌ Error crítico en callback:', error)
    const origin = new URL(request.url).origin
    return NextResponse.redirect(`${origin}/admin/login?error=server&details=${encodeURIComponent(error?.message || 'Error desconocido')}`)
  }
}

async function handleSuccessfulAuth(
  supabase: any, 
  next: string, 
  origin: string,
  type?: string | null
) {
  // Sync basic profile fields (first_name, last_name, email) into public.users
  try {
    const { data: { user }, error: getUserError } = await supabase.auth.getUser()
    
    if (getUserError) {
      console.error('❌ Error obteniendo usuario en handleSuccessfulAuth:', getUserError)
    } else if (user) {
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
        console.error('⚠️ Failed to upsert users profile in callback:', upsertError)
        // No lanzar error, solo loguear - el usuario puede completar su perfil después
      } else {
        console.log('✅ Perfil sincronizado en public.users')
      }
      
      console.log('✅ Usuario autenticado:', { 
        email: user.email,
        redirecting_to: next
      })
    } else {
      console.warn('⚠️ Usuario no encontrado en handleSuccessfulAuth')
    }
  } catch (e) {
    console.error('⚠️ Profile sync error in callback (no crítico):', e)
    // No lanzar error, continuar con la redirección
  }
  
  // Usar el next especificado (que puede ser /admin/set-password o /admin)
  const redirectPath = next && next.startsWith('/') ? next : `/${next}`
  console.log('🔗 Redirigiendo a:', redirectPath)
  return NextResponse.redirect(`${origin}${redirectPath}`)
}

