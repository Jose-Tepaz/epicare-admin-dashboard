# Configuración de URLs de Redirección en Supabase

## Problema
Los tokens de invitación no están llegando al `callback-handler` porque Supabase requiere que las URLs de redirección estén configuradas en el dashboard.

## Solución

### 1. Ve al Dashboard de Supabase
1. Abre https://app.supabase.com
2. Selecciona tu proyecto
3. Ve a **Authentication** → **URL Configuration**

### 2. Configura las URLs de Redirección

En la sección **Redirect URLs**, agrega las siguientes URLs:

#### Para Desarrollo (localhost):
```
http://localhost:3002/auth/callback
http://localhost:3002/auth/callback-handler
http://localhost:3001/auth/callback
http://localhost:3001/auth/callback-handler
```

#### Para Producción:
```
https://tudominio.com/auth/callback
https://tudominio.com/auth/callback-handler
https://dashboard-cliente.tudominio.com/auth/callback
https://dashboard-cliente.tudominio.com/auth/callback-handler
```

### 3. Configura la Site URL

En **Site URL**, configura:
- **Desarrollo**: `http://localhost:3002`
- **Producción**: `https://tudominio.com`

### 4. Guarda los Cambios

Haz clic en **Save** al final de la página.

## Verificación

Después de guardar:
1. Crea un nuevo usuario desde el admin dashboard
2. Revisa la consola del navegador cuando hagas clic en el link de invitación
3. Deberías ver en la consola:
   ```
   🔗 callback-handler iniciado
   🔗 window.location.hash: #access_token=...
   🔐 Tokens encontrados: { hasAccessToken: true, hasRefreshToken: true, type: 'invite' }
   ✅ Tokens guardados, redirigiendo a: /admin/set-password
   ```

## Troubleshooting

### Si aún no hay hash:
1. Verifica que las URLs estén exactamente como aparecen arriba (sin trailing slash)
2. Espera 1-2 minutos después de guardar (Supabase puede tardar en actualizar)
3. Prueba con el botón "Resend Invite" para generar un nuevo link

### Si el link redirige al login:
- Verifica que `/auth/callback-handler` esté permitido en el middleware
- Revisa los logs de la terminal para ver si hay errores

## Notas Importantes

- Las URLs deben coincidir EXACTAMENTE con las que se usan en el código
- No incluyas trailing slashes (`/`) al final de las URLs
- Puedes usar wildcards en producción: `https://*.tudominio.com/auth/*` (pero no es recomendado para seguridad)

