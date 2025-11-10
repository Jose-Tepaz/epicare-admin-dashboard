import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar que el usuario esté autenticado y sea admin
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar que el usuario tenga rol admin
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select(`
        roles:role_id (
          name
        )
      `)
      .eq('user_id', user.id)

    if (rolesError) {
      return NextResponse.json({ error: 'Error al verificar permisos' }, { status: 500 })
    }

    const roles = userRoles?.map((ur: any) => ur.roles?.name).filter(Boolean) || []
    const isSuperAdmin = roles.includes('super_admin')
    const isAdmin = roles.includes('admin')
    
    if (!isSuperAdmin && !isAdmin) {
      return NextResponse.json({ error: 'No tienes permisos para eliminar usuarios' }, { status: 403 })
    }

    const { id: userId } = await params

    // No permitir que un admin se elimine a sí mismo
    if (userId === user.id) {
      return NextResponse.json({ error: 'No puedes eliminar tu propia cuenta' }, { status: 400 })
    }

    // Verificar si el usuario a eliminar es admin
    const { data: targetUserRoles, error: targetRolesError } = await supabase
      .from('user_roles')
      .select(`
        roles:role_id (
          name
        )
      `)
      .eq('user_id', userId)

    const targetRoles = targetUserRoles?.map((ur: any) => ur.roles?.name).filter(Boolean) || []
    const targetIsAdmin = targetRoles.includes('admin') || targetRoles.includes('super_admin')
    
    // Solo super_admin puede eliminar admins
    if (targetIsAdmin && !isSuperAdmin) {
      return NextResponse.json({ 
        error: 'Solo los super administradores pueden eliminar usuarios con rol admin' 
      }, { status: 403 })
    }

    // Usar cliente admin para eliminar
    const adminClient = createAdminClient()

    // Eliminar roles del usuario primero
    await adminClient
      .from('user_roles')
      .delete()
      .eq('user_id', userId)

    // Eliminar perfil del usuario
    const { error: profileError } = await adminClient
      .from('users')
      .delete()
      .eq('id', userId)

    if (profileError) {
      console.error('Error deleting user profile:', profileError)
      return NextResponse.json({ error: 'Error al eliminar el perfil del usuario' }, { status: 500 })
    }

    // Eliminar usuario de auth
    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(userId)

    if (authDeleteError) {
      console.error('Error deleting auth user:', authDeleteError)
      return NextResponse.json({ error: 'Error al eliminar el usuario de autenticación' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: 'Usuario eliminado correctamente'
    }, { status: 200 })

  } catch (error) {
    console.error('Error in delete user API:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

