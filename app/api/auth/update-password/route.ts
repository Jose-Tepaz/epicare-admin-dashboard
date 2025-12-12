import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    console.log('🔐 UPDATE-PASSWORD: Iniciando...')
    
    const { password, userId } = await request.json()

    if (!password) {
      return NextResponse.json({ error: 'Contraseña requerida' }, { status: 400 })
    }

    // ESTRATEGIA 1: Intentar con cliente normal (usuarios con sesión establecida)
    console.log('🔄 Intentando con cliente normal...')
    const supabase = await createClient()
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    console.log('📊 Cliente normal - usuario:', {
      hasUser: !!user,
      userId: user?.id,
      error: userError?.message
    })
    
    let targetUserId = user?.id
    
    // ESTRATEGIA 2: Si no hay sesión normal, usar userId del body (usuarios invitados)
    if (!user && userId) {
      console.log('⚠️ No hay sesión normal, pero recibimos userId del cliente')
      console.log('🔄 Usando admin client para actualizar contraseña de usuario invitado...')
      targetUserId = userId
    }
    
    if (!targetUserId) {
      console.error('❌ No se pudo identificar al usuario')
      return NextResponse.json({ error: 'No autorizado o sesión expirada' }, { status: 401 })
    }

    console.log('🔒 Actualizando contraseña para usuario:', targetUserId)

    // Usar admin client para actualizar contraseña (bypasea problemas de sesión)
    const adminClient = createAdminClient()
    
    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      targetUserId,
      {
        password: password,
        user_metadata: {
          password_set: true // ← Marcar que el usuario estableció su contraseña
        }
      }
    )

    if (updateError) {
      console.error('❌ Error actualizando contraseña:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    console.log('✅ Contraseña actualizada con admin client y metadata password_set establecido')

    // Actualizar el campo password_set en la tabla users
    const { error: updateUserError } = await adminClient
      .from('users')
      .update({ password_set: true })
      .eq('id', targetUserId)

    if (updateUserError) {
      console.warn('⚠️ Error actualizando password_set en tabla users:', updateUserError)
    } else {
      console.log('✅ Campo password_set actualizado en tabla users')
    }

    // Obtener datos del perfil usando admin client (bypasea RLS)
    const { data: userData, error: profileError } = await adminClient
      .from('users')
      .select('role, profile_completed, first_name, last_name, password_set')
      .eq('id', targetUserId)
      .maybeSingle()

    if (profileError) {
      console.warn('⚠️ Error obteniendo perfil (no crítico):', profileError)
    }

    return NextResponse.json({ 
      success: true, 
      user: userData || { role: 'agent' } // Fallback
    })

  } catch (error: any) {
    console.error('❌ Error en update-password route:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

