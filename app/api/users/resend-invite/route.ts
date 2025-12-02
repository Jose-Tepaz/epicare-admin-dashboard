import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // Verificar que el usuario esté autenticado y sea admin
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar que el usuario tenga rol admin (✅ usando users.role directamente)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError) {
      return NextResponse.json({ error: 'Error al verificar permisos' }, { status: 500 })
    }

    const userRole = userData?.role || ''
    const isSuperAdmin = userRole === 'super_admin'
    const isAdmin = userRole === 'admin'
    
    if (!isSuperAdmin && !isAdmin) {
      return NextResponse.json({ error: 'No tienes permisos para reenviar invitaciones' }, { status: 403 })
    }

    // Obtener datos del body
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json({ error: 'El ID del usuario es requerido' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Obtener información del usuario (✅ incluyendo role directamente)
    const { data: targetUserData, error: targetUserError } = await adminClient
      .from('users')
      .select(`
        id,
        email,
        first_name,
        last_name,
        role
      `)
      .eq('id', userId)
      .single()

    if (targetUserError || !targetUserData) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    if (!targetUserData.role) {
      return NextResponse.json({ error: 'El usuario no tiene un rol asignado' }, { status: 400 })
    }

    const roleName = targetUserData.role

    // Determinar la URL de redirección basada en el rol
    // Redirigir DIRECTAMENTE a set-password (sin pasar por /auth/callback)
    // Esto preserva el hash fragment con los tokens
    let redirectTo: string
    if (roleName === 'client') {
      // Clientes van al dashboard de usuario
      const userDashboardUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL || 'http://localhost:3001'
      redirectTo = `${userDashboardUrl}/set-password`
    } else {
      // Otros roles van al dashboard de administración
      const adminDashboardUrl = process.env.NEXT_PUBLIC_ADMIN_DASHBOARD_URL || request.headers.get('origin') || 'http://localhost:3002'
      redirectTo = `${adminDashboardUrl}/admin/set-password`
    }

    console.log('📧 Reenviando invitación con redirectTo:', redirectTo)
    console.log('📧 Rol del usuario:', roleName)
    console.log('📧 Email del usuario:', targetUserData.email)

    // Para usuarios existentes, usar type: 'recovery' (password reset)
    // Esto permite que el usuario establezca/cambie su contraseña
    // y funciona perfectamente con usuarios que ya existen
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'recovery',
      email: targetUserData.email,
      options: {
        redirectTo: redirectTo,
      }
    })

    if (linkError) {
      console.error('❌ Error generando link de recuperación:', linkError)
      return NextResponse.json({ 
        error: `No se pudo generar el link: ${linkError.message}` 
      }, { status: 400 })
    }

    console.log('✅ Link de recuperación generado')
    console.log('📧 Action link:', linkData.properties?.action_link ? 'presente' : 'ausente')

    const actionLink = linkData.properties?.action_link

    // En desarrollo, Supabase puede no enviar emails
    // Devolvemos el link para que el admin pueda copiarlo y enviarlo manualmente
    if (actionLink) {
      console.log('🔗 Link completo:', actionLink)
      return NextResponse.json({ 
        success: true,
        message: 'Invitación generada exitosamente.',
        actionLink: actionLink, // ✅ Devolver el link para uso manual
        emailSent: false, // En desarrollo, probablemente no se envió
        note: 'En desarrollo, puedes copiar el link y enviárselo al usuario manualmente.'
      }, { status: 200 })
    }

    // Si no hay action_link, asumir que el email se envió
    return NextResponse.json({ 
      success: true,
      message: 'Invitación reenviada exitosamente. El usuario recibirá un correo para establecer su contraseña.',
      emailSent: true
    }, { status: 200 })

  } catch (error) {
    console.error('Error in resend invite API:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

