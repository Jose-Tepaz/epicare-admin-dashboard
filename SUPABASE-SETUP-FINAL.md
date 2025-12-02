# Configuración Final de Supabase para Invitaciones

## ✅ Cambio Importante

Hemos cambiado de usar **hash fragments** (que no funcionaban) a usar **PKCE flow** (con `code`), que es el método estándar y recomendado por Supabase.

## 📝 Configuración en Supabase Dashboard

### 1. Ve a Authentication → URL Configuration

```
https://app.supabase.com → Tu Proyecto → Authentication → URL Configuration
```

### 2. Agrega las URLs de Redirección

En **"Redirect URLs"**, agrega:

```
http://localhost:3002/auth/callback
http://localhost:3001/auth/callback
```

**Para producción también agrega:**
```
https://tu-admin-dashboard.com/auth/callback
https://tu-client-dashboard.com/auth/callback
```

### 3. Configura Site URL

En **"Site URL"**, pon:
- **Desarrollo**: `http://localhost:3002`
- **Producción**: `https://tu-admin-dashboard.com`

### 4. Guarda los Cambios

Haz clic en **"Save"** al final de la página.

## 🧪 Prueba el Flujo

### Paso 1: Crea un Nuevo Usuario
1. Abre el admin dashboard: `http://localhost:3002/admin`
2. Ve a la sección de usuarios
3. Haz clic en "Create User"
4. Llena el formulario y crea un usuario con rol `admin`

### Paso 2: Revisa el Email
Verifica que el correo de invitación llegó a la bandeja de entrada.

### Paso 3: Haz Clic en el Link
El link debería verse así:
```
https://...supabase.co/auth/v1/verify?token=...&type=invite&redirect_to=http://localhost:3002/auth/callback?next=/admin/set-password
```

### Paso 4: Observa los Logs

**En la terminal del servidor:**
```
🔐 Admin callback recibido: { code: 'presente', next: '/admin/set-password', origin: 'http://localhost:3002' }
✅ Code presente, intercambiando por sesión...
✅ Sesión establecida, procesando autenticación...
✅ Usuario autenticado: { email: '...', redirecting_to: '/admin/set-password' }
🔗 Redirigiendo a: /admin/set-password
```

**En la consola del navegador:**
```
🔍 set-password useEffect iniciado
🔍 Usuario actual: email@example.com
🔍 authLoading: false
✅ Usuario autenticado, mostrando formulario para: email@example.com
```

### Paso 5: Establece la Contraseña

Cuando hagas clic en "Guardar contraseña", deberías ver:
```
🔐 handleSubmit iniciado
✅ Validación OK, estableciendo contraseña para: email@example.com
🔄 Verificando sesión actual...
📊 Sesión actual: { hasSession: true, sessionError: undefined }
🔄 Llamando updateUser...
✅ updateUser completado: { hasData: true, hasError: false }
✅ Contraseña actualizada, verificando perfil...
📊 Datos del usuario: { userData: {...}, userError: null }
➡️ Redirigiendo a /admin/complete-profile
```

## 🎯 Qué Esperar

### ✅ Si Todo Funciona:
1. El link del email te lleva directamente a `set-password`
2. Ves el formulario para establecer la contraseña
3. Al guardar, se establece la contraseña y redirige a `complete-profile`
4. No hay errores en la consola

### ❌ Si Hay Problemas:

**Problema: "No hay sesión activa"**
- Verifica que las URLs estén configuradas en Supabase
- Espera 1-2 minutos después de guardar en Supabase
- Crea un NUEVO usuario (no uses links viejos)

**Problema: "Timeout"**
- Esto ya NO debería ocurrir con el nuevo código
- Si ocurre, comparte los logs completos

**Problema: Redirecciona al login**
- Verifica que `/auth/callback` esté permitido en el middleware
- Revisa los logs de la terminal para ver si hay errores

## 🔧 Solución de Problemas

### Regenerar Link de Invitación
1. Ve a la tabla de usuarios
2. Busca el usuario
3. Haz clic en "Resend Invite"
4. Copia el link del modal (o espera el email)
5. Haz clic en el nuevo link

### Limpiar Sesión Anterior
Si un usuario ya tiene sesión y quieres probar el flujo de nuevo:
1. Abre DevTools → Application → Storage
2. Borra todas las cookies de `localhost:3002`
3. Borra todo el Local Storage
4. Borra todo el Session Storage
5. Recarga la página
6. Haz clic en el link de invitación nuevamente

## 📚 Cómo Funciona Ahora

### Flujo Anterior (NO FUNCIONABA):
```
Supabase Email → callback-handler (cliente) → tokens en hash → set-password
                                            ↑
                                      NO HAY HASH
```

### Flujo Nuevo (FUNCIONA):
```
Supabase Email → /auth/callback (servidor) → exchange code → sesión establecida → set-password
                                            ↑
                                      CODE PRESENTE
```

El servidor puede intercambiar el `code` por tokens y establecer la sesión automáticamente.

## 🚀 Siguiente Paso

Después de establecer la contraseña, el usuario será redirigido a:
- **Admin/Agent/Support**: `/admin/complete-profile` (admin dashboard)
- **Client**: `/complete-profile` (client dashboard en puerto 3001)

Después de completar el perfil:
- **Admin/Agent/Support**: `/admin` (dashboard principal)
- **Client**: `/` (client dashboard home)

