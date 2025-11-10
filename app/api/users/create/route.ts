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
      return NextResponse.json({ error: 'No tienes permisos para crear usuarios' }, { status: 403 })
    }

    // Obtener datos del body
    const body = await request.json()
    const { email, password, first_name, last_name, phone, roleId } = body

    if (!email || !password) {
      return NextResponse.json({ error: 'Email y contraseña son requeridos' }, { status: 400 })
    }

    // Crear usuario en auth.users usando el cliente admin
    const adminClient = createAdminClient()
    
    const { data: authUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirmar el email
    })

    if (createError) {
      console.error('Error creating auth user:', createError)
      return NextResponse.json({ error: createError.message }, { status: 400 })
    }

    if (!authUser.user) {
      return NextResponse.json({ error: 'Error al crear usuario' }, { status: 500 })
    }

    // Verificar si el perfil ya existe (puede ser creado automáticamente por un trigger)
    const { data: existingProfile } = await adminClient
      .from('users')
      .select('id')
      .eq('id', authUser.user.id)
      .single()

    // Crear o actualizar registro en public.users usando upsert
    const { error: profileError } = await adminClient
      .from('users')
      .upsert({
        id: authUser.user.id,
        email,
        first_name: first_name || null,
        last_name: last_name || null,
        phone: phone || null,
      }, {
        onConflict: 'id'
      })

    if (profileError) {
      // Si falla la creación/actualización del perfil, intentar eliminar el usuario de auth
      await adminClient.auth.admin.deleteUser(authUser.user.id)
      console.error('Error creating user profile:', profileError)
      return NextResponse.json({ 
        error: 'Error al crear el perfil del usuario',
        details: profileError.message 
      }, { status: 500 })
    }

    // Asignar rol si se proporciona roleId, o asignar 'user' por defecto si no se especifica
    if (roleId) {
      // Verificar si el rol a asignar es admin o super_admin
      const { data: targetRole, error: roleFetchError } = await adminClient
        .from('roles')
        .select('name')
        .eq('id', roleId)
        .single()

      if (!roleFetchError && targetRole) {
        const roleName = targetRole.name
        
        // Solo super_admin puede asignar roles admin o super_admin
        if ((roleName === 'admin' || roleName === 'super_admin') && !isSuperAdmin) {
          return NextResponse.json({ 
            error: 'Solo los super administradores pueden crear usuarios con rol admin o super_admin' 
          }, { status: 403 })
        }
      }

      // Asignar el rol específico proporcionado
      const { error: roleAssignError } = await adminClient
        .from('user_roles')
        .insert({
          user_id: authUser.user.id,
          role_id: roleId,
        })

      if (roleAssignError) {
        console.error('Error assigning role:', roleAssignError)
        // No fallar la creación del usuario si falla la asignación del rol
      }
    } else {
      // Solo asignar rol 'user' por defecto si no se especificó ningún rol
      const { data: roleData, error: roleFetchError } = await adminClient
        .from('roles')
        .select('id')
        .eq('name', 'user')
        .single()

      if (!roleFetchError && roleData) {
        await adminClient
          .from('user_roles')
          .insert({
            user_id: authUser.user.id,
            role_id: roleData.id,
          })
      }
    }

    return NextResponse.json({ 
      success: true, 
      user: {
        id: authUser.user.id,
        email: authUser.user.email,
        first_name,
        last_name,
        phone,
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Error in create user API:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
