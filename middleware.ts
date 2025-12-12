import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const path = request.nextUrl.pathname
  
  console.log('🔍 MIDDLEWARE: Request path:', path)

  // Redirigir la ruta raíz a /admin (el dashboard protegido)
  if (path === '/') {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  // Permitir acceso a la página de login sin autenticación
  if (path === '/admin/login') {
    console.log('✅ MIDDLEWARE: Permitiendo acceso a /admin/login')
    // No redirigir automáticamente si viene de una invitación o hay error
    // La página de login se encargará de manejar estos casos
    return response
  }

  // Permitir acceso a invite-callback sin autenticación
  // Esta página procesa el hash y redirige a set-password
  if (path === '/auth/invite-callback') {
    console.log('✅ MIDDLEWARE: Permitiendo acceso a /auth/invite-callback')
    return response
  }

  // Permitir acceso a auth/callback y callback-handler sin autenticación
  // Estos endpoints manejan la autenticación de Supabase
  if (path === '/auth/callback' || path === '/auth/callback-handler') {
    console.log('✅ MIDDLEWARE: Permitiendo acceso a', path)
    return response
  }

  // Permitir acceso a set-password y complete-profile
  // Permitir acceso sin sesión - la página se encargará de verificar si hay tokens en el hash
  // Esto permite que usuarios recién creados establezcan su contraseña
  if (path === '/admin/set-password' || path === '/admin/complete-profile') {
    // Siempre permitir acceso - la página verificará si hay sesión o tokens en el hash
    return response
  }

  // Verificar autenticación usando getUser() (más seguro y eficiente que getSession())
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  // Todas las demás rutas /admin/* requieren autenticación y roles
  if (path.startsWith('/admin')) {
    if (userError || !user) {
      // No autenticado, redirigir a login
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }

    // Verificar si el usuario necesita establecer contraseña
    // IMPORTANTE: No podemos confiar solo en last_sign_in_at porque Supabase lo establece
    // automáticamente cuando el usuario hace clic en el link de invitación
    const userMetadata = user.user_metadata || {}
    const createdAt = new Date(user.created_at || '')
    const now = new Date()
    const accountAgeMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60)
    
    console.log('🔍 MIDDLEWARE: Verificando estado de invitación para:', user.id)
    console.log('🔍 created_at:', user.created_at)
    console.log('🔍 account age (minutes):', accountAgeMinutes.toFixed(2))
    console.log('🔍 userMetadata.password_set:', userMetadata.password_set)
    console.log('🔍 user.email:', user.email)
    
    // Verificar si el usuario ha establecido su contraseña
    // Para usuarios existentes (cuenta > 5 minutos), asumimos que ya tienen contraseña
    // Para usuarios nuevos (cuenta <= 5 minutos), verificamos el metadata password_set
    const isNewAccount = accountAgeMinutes <= 5
    const hasPasswordSet = userMetadata.password_set === true || !isNewAccount
    
    console.log('🔍 isNewAccount:', isNewAccount)
    console.log('🔍 hasPasswordSet:', hasPasswordSet)
    
    if (!hasPasswordSet) {
      console.log('⚠️⚠️⚠️ Usuario invitado sin contraseña establecida, redirigiendo a set-password')
      return NextResponse.redirect(new URL('/admin/set-password', request.url))
    }
    
    console.log('✅ Usuario con contraseña establecida, continuando...')

    // Verificar que el usuario tenga rol admin, agent o support_staff
    const { data: userData, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (error) {
      console.error('Error checking user role:', error)
      return NextResponse.redirect(new URL('/admin/login?error=role_check_failed', request.url))
    }

    const userRole = userData?.role || ''
    const hasAdminAccess = ['super_admin', 'admin', 'agent', 'support_staff'].includes(userRole)

    if (!hasAdminAccess) {
      // Usuario autenticado pero sin permisos de admin
      return NextResponse.redirect(new URL('/admin/login?error=access_denied', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

