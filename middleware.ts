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

  // Verificar sesión
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const path = request.nextUrl.pathname

  // Permitir acceso a la página de login sin autenticación
  if (path === '/admin/login') {
    // Si ya está autenticado, redirigir al dashboard
    if (session) {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
    return response
  }

  // Todas las rutas /admin/* requieren autenticación
  if (path.startsWith('/admin')) {
    if (!session) {
      // No autenticado, redirigir a login
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }

    // Verificar que el usuario tenga rol admin o support_staff
    const { data: userRoles, error } = await supabase
      .from('user_roles')
      .select(`
        roles:role_id (
          name
        )
      `)
      .eq('user_id', session.user.id)

    if (error) {
      console.error('Error checking user roles:', error)
      return NextResponse.redirect(new URL('/admin/login?error=role_check_failed', request.url))
    }

    const roles = userRoles?.map((ur: any) => ur.roles?.name).filter(Boolean) || []
    const hasAdminAccess = roles.some((role: string) => 
      ['super_admin', 'admin', 'support_staff'].includes(role)
    )

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

