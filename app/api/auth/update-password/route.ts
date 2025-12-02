import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { password } = await request.json()

    if (!password) {
      return NextResponse.json({ error: 'Contraseña requerida' }, { status: 400 })
    }

    const supabase = await createClient()
    
    // Verificar usuario actual
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('❌ Error obteniendo usuario en servidor:', userError)
      return NextResponse.json({ error: 'No autorizado o sesión expirada' }, { status: 401 })
    }

    console.log('🔒 Actualizando contraseña para:', user.email)

    // Actualizar contraseña
    const { error: updateError } = await supabase.auth.updateUser({
      password: password
    })

    if (updateError) {
      console.error('❌ Error actualizando contraseña:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    // Refrescar sesión para asegurar que los cambios se apliquen
    await supabase.auth.refreshSession()

    // Obtener datos del perfil para redirección
    const { data: userData, error: profileError } = await supabase
      .from('users')
      .select('role, profile_completed, first_name, last_name')
      .eq('id', user.id)
      .single()

    return NextResponse.json({ 
      success: true, 
      user: userData 
    })

  } catch (error: any) {
    console.error('❌ Error en update-password route:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

