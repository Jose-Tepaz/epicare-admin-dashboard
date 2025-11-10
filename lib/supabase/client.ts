import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // En el navegador, Supabase maneja las cookies automáticamente usando document.cookie
  // La configuración de domain se hace a nivel de servidor (middleware y server client)
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

