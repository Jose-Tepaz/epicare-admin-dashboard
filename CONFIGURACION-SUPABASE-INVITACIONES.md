# Configuración de Supabase para Invitaciones por Correo

## 🔧 Configuración Requerida en Supabase Dashboard

Para que los correos de invitación funcionen correctamente, necesitas configurar las URLs de redirección en Supabase.

### Paso 1: Ir a Configuración de URLs

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Navega a **Authentication** → **URL Configuration**
3. En la sección **Redirect URLs**, agrega las siguientes URLs:

### URLs para Desarrollo (Local)

**IMPORTANTE**: Agrega TODAS estas URLs a la lista de Redirect URLs:

```
http://localhost:3000/auth/callback
http://localhost:3001/auth/callback
http://localhost:3002/auth/callback
http://localhost:3001/auth/callback?next=/complete-profile&type=invite
http://localhost:3002/auth/callback?next=/admin/complete-profile&type=invite
```

**Nota**: Supabase puede requerir que agregues las URLs con parámetros de query también. Si prefieres usar comodines (más flexible), puedes usar:

```
http://localhost:300*/auth/callback*
```

Esto permitirá cualquier puerto y cualquier parámetro de query.

### URLs para Producción

Reemplaza con tus dominios reales:

```
https://dashboard.epicare.com/auth/callback
https://admin.epicare.com/auth/callback
```

O si usas subdominios:

```
https://tu-dominio.com/auth/callback
https://admin.tu-dominio.com/auth/callback
```

### Paso 2: Configurar Site URL

La **Site URL** debe estar configurada. **IMPORTANTE**: Supabase usa esta URL como fallback cuando envía correos de invitación.

Para desarrollo local, usa:

```
http://localhost:3002
```

**Nota**: En el flujo actual, Supabase está usando el método "implicit grant" que envía el `access_token` directamente en el hash fragment de la URL (ej: `#access_token=...&type=invite`). Las páginas de login detectan esto automáticamente y redirigen a la página de establecer contraseña.

Para producción, usa tu dominio del dashboard de administración:

```
https://admin.tu-dominio.com
```

**Nota**: El callback en `localhost:3000` ahora detecta automáticamente si es una invitación y redirige al dashboard correcto según el rol del usuario. Esto soluciona el problema cuando Supabase usa la Site URL en lugar del `redirectTo` especificado.

### Paso 3: Verificar Plantilla de Invitación

1. Ve a **Authentication** → **Email Templates**
2. Selecciona la plantilla **"Invite user"**
3. Asegúrate de que esté habilitada
4. Puedes personalizar el contenido del correo si lo deseas

### Paso 4: Verificar Variables de Entorno

Asegúrate de tener estas variables configuradas en tu `.env.local`:

**En `epicare-admindashboard/.env.local`:**
```bash
# Dashboard de Usuario (para clientes)
NEXT_PUBLIC_DASHBOARD_URL=http://localhost:3001

# Dashboard de Administración (para otros roles)
NEXT_PUBLIC_ADMIN_DASHBOARD_URL=http://localhost:3002
```

**En `epicareplans-marketplace/.env.local` (también necesario para el callback):**
```bash
# Dashboard de Usuario (para clientes)
NEXT_PUBLIC_DASHBOARD_URL=http://localhost:3001

# Dashboard de Administración (para otros roles)
NEXT_PUBLIC_ADMIN_DASHBOARD_URL=http://localhost:3002
```

## 🔄 Flujo de Invitación

### Para Usuarios con rol "cliente" o "client":

1. **Admin crea usuario** con rol `cliente` o `client`
2. **Sistema envía correo** a `http://localhost:3001/auth/callback?next=/set-password&type=invite`
3. **Usuario hace clic** → Supabase redirige con `access_token` en el hash fragment
4. **Página de login detecta** tokens y establece sesión
5. **Redirige a** `http://localhost:3001/set-password` 
6. **Usuario establece contraseña**
7. **Redirige a** `http://localhost:3001/complete-profile` para datos adicionales
8. **Redirige a** `http://localhost:3001/` (Dashboard de usuario)

### Para Usuarios con otros roles (admin, support_staff, etc.):

1. **Admin crea usuario** con rol admin/support/etc.
2. **Sistema envía correo** a `http://localhost:3002/auth/callback?next=/admin/set-password&type=invite`
3. **Usuario hace clic** → Supabase redirige con `access_token` en el hash fragment
4. **Página de login detecta** tokens y establece sesión
5. **Redirige a** `http://localhost:3002/admin/set-password`
6. **Usuario establece contraseña**
7. **Redirige a** `http://localhost:3002/admin/complete-profile` para datos adicionales
8. **Redirige a** `http://localhost:3002/admin` (Dashboard de administración)

**Nota importante**: El sistema detecta automáticamente si el rol se llama `cliente` o `client` (ambos funcionan).

## 🔄 Reenviar Invitaciones

Si un usuario no recibió el correo de invitación o el token expiró, puedes reenviar la invitación fácilmente:

### Desde la Tabla de Usuarios:

1. **Identifica usuarios pendientes**: Los usuarios que no han completado su perfil tienen un badge "Pendiente" en la columna de roles
2. **Haz clic en el icono de correo** (📧) en la columna de acciones
3. **Se enviará automáticamente** un nuevo correo de invitación con un token nuevo
4. **El usuario recibirá** el correo inmediatamente y podrá completar su registro

### Características:

- ✅ **Solo visible para usuarios pendientes**: El botón solo aparece si `profile_completed = false`
- ✅ **Solo para admins**: Solo usuarios con rol `admin` o `super_admin` pueden reenviar invitaciones
- ✅ **Mantiene la configuración**: Usa el mismo rol y URLs de redirección configuradas para el usuario
- ✅ **Actualiza el token**: Genera un nuevo token de invitación válido por 24 horas (por defecto de Supabase)
- ✅ **Feedback visual**: Muestra spinner mientras se envía y toast de confirmación

### Casos de Uso:

- El usuario reporta que no le llegó el correo
- El token de invitación expiró (24 horas por defecto)
- El usuario borró el correo accidentalmente
- Necesitas que el usuario complete su perfil urgentemente

## ⚠️ Solución de Problemas

### Error: "ERR_TOO_MANY_REDIRECTS" cuando usuario admin hace clic en el enlace

**Solución implementada**: 
- El middleware ya no redirige automáticamente desde `/admin/login` cuando detecta una sesión
- La página de login limpia el hash y los query params antes de redirigir
- Esto evita el bucle de redirección que ocurría cuando el usuario venía de una invitación

**Si sigues viendo este error**:

1. **Borra las cookies del navegador** completamente:
   - Chrome: DevTools → Application → Cookies → Borrar todo para localhost
   - O usa ventana de incógnito

2. **Reinicia los servidores** de desarrollo:
   ```bash
   # En cada proyecto
   npm run dev
   ```

3. **Prueba nuevamente** haciendo clic en el enlace del correo

### Los clientes (role: client) están siendo enviados a localhost:3002 en lugar de localhost:3001

**Solución implementada**: El código ahora detecta automáticamente si el rol se llama `cliente` o `client` y redirige correctamente.

**Para verificar**:

1. **Revisa los logs del servidor** cuando creas un usuario:
   ```
   📧 Invitando usuario con redirectTo: http://localhost:3001/auth/callback?next=/set-password&type=invite
   📧 Rol del usuario: client
   ```

2. **Si ves que dice `localhost:3002`**, verifica:
   - El nombre del rol en la base de datos (debería ser `client` o `cliente`)
   - Las variables de entorno `NEXT_PUBLIC_DASHBOARD_URL` y `NEXT_PUBLIC_ADMIN_DASHBOARD_URL`

3. **Si Supabase está ignorando el redirectTo**:
   - Verifica la configuración de **Site URL** en Supabase (debería ser `http://localhost:3002` o `http://localhost:3000`)
   - El sistema ahora maneja esto con el callback del marketplace que detecta el rol y redirige correctamente

### El enlace redirige al login en lugar de set-password

**Solución implementada**: Las páginas de login ahora detectan automáticamente el `access_token` en el hash fragment y redirigen a `/set-password` o `/admin/set-password`. Verifica:

1. **Abre la consola del navegador**: Deberías ver logs como:
   - `🔍 Hash fragment detectado: #access_token=...`
   - `🔑 Tokens detectados: { hasAccessToken: true, hasRefreshToken: true, type: 'invite' }`
   - `✅ Sesión establecida correctamente`
   - `📧 Detectada invitación, redirigiendo a set-password`

2. **Si no ves los logs**: Recarga la página o borra la caché del navegador

3. **Si sigue sin funcionar**: 
   - Verifica que la URL de **Site URL** en Supabase esté configurada correctamente
   - Revisa los logs del servidor para ver qué está pasando

### El enlace no redirige correctamente

1. **Verifica que las URLs estén en Redirect URLs**: Las URLs deben coincidir exactamente (incluyendo protocolo, dominio y puerto)
2. **Verifica las variables de entorno**: Asegúrate de que `NEXT_PUBLIC_DASHBOARD_URL` y `NEXT_PUBLIC_ADMIN_DASHBOARD_URL` estén configuradas correctamente
3. **Revisa los logs**: Ve a **Authentication** → **Logs** en Supabase para ver si hay errores

### El correo no llega

1. **Verifica la configuración SMTP**: Por defecto Supabase usa su servicio, pero puedes configurar uno personalizado
2. **Revisa la carpeta de spam**: A veces los correos van a spam
3. **Verifica los logs de Supabase**: Ve a **Authentication** → **Logs** → **Auth Logs**

### Error "Invalid redirect URL"

- Asegúrate de que la URL esté exactamente en la lista de Redirect URLs
- **IMPORTANTE**: Si usas parámetros de query (`?next=...&type=...`), también debes agregar esas URLs completas a la lista
- Alternativamente, usa comodines: `http://localhost:300*/auth/callback*` para permitir cualquier puerto y parámetros
- No debe tener trailing slash a menos que esté en la lista
- Debe coincidir con el protocolo (http vs https)

### Verificar qué URL está usando Supabase

1. Revisa los logs del servidor cuando creas un usuario - deberías ver: `📧 Invitando usuario con redirectTo: ...`
2. Revisa los logs cuando haces clic en el enlace - deberías ver: `🔐 Admin callback recibido:` o `🔐 User callback recibido:`
3. Si el callback no se ejecuta, verifica que la URL en el correo coincida con las URLs permitidas

## 📝 Notas Importantes

- Las URLs de redirección son sensibles a mayúsculas/minúsculas
- No uses `localhost` en producción
- En desarrollo, cada puerto necesita su propia entrada en Redirect URLs
- El callback `/auth/callback` debe existir en ambas aplicaciones (dashboard y admin dashboard)

