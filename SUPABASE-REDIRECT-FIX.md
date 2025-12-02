# ⚠️ IMPORTANTE: Configurar Redirect URL en Supabase

## Problema
El correo de invitación no incluye el código de autenticación (`code: 'ausente'`).

## Solución

### 1. Ve a tu panel de Supabase
   - Dashboard → Authentication → URL Configuration

### 2. Agrega las Redirect URLs
   En **"Redirect URLs"**, agrega AMBAS URLs:

   **Para desarrollo:**
   ```
   http://localhost:3002/auth/callback
   http://localhost:3002/auth/callback-handler
   ```

   **Para producción:**
   ```
   https://tu-dominio.com/auth/callback
   https://tu-dominio.com/auth/callback-handler
   ```
   
   **Nota:** 
   - `/auth/callback` → Para login normal (PKCE flow)
   - `/auth/callback-handler` → Para invitaciones (magic link con hash fragment)

### 3. Guarda los cambios

### 4. IMPORTANTE: Configurar Email Templates
   Ve a: Authentication → Email Templates → "Invite user"
   
   Asegúrate que el template use esta URL:
   ```
   {{ .ConfirmationURL }}
   ```
   
   NO uses redirección manual, deja que Supabase maneje el `redirectTo`.

### 5. Verifica tu .env.local
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
   NEXT_PUBLIC_ADMIN_DASHBOARD_URL=http://localhost:3002
   ```

## Prueba
1. Crea un nuevo usuario
2. Revisa el correo
3. El enlace debería incluir `?code=...`
4. Al hacer clic, debería redirigir a `/admin/set-password`

