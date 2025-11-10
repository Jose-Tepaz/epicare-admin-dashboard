import { createClient } from '@supabase/supabase-js'

/**
 * Cliente administrativo de Supabase que bypasea RLS
 * 
 * IMPORTANTE: Solo usar para operaciones que requieren acceso completo
 * después de verificar permisos del usuario en el servidor.
 * 
 * Casos de uso:
 * - Operaciones batch de admin
 * - Creación de usuarios desde el admin panel
 * - Queries complejas que requieren JOIN de múltiples tablas protegidas
 */
export function createAdminClient() {
  // Este cliente usa la service_role key que bypasea RLS
  // NUNCA exponer esta key al cliente
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY no está configurada')
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

