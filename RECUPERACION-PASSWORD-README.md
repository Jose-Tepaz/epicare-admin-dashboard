# 🔐 Recuperación de Contraseña - Testing Guide

## ✅ Implementación Completa

Se ha agregado la funcionalidad completa de recuperación de contraseña al panel de administración.

---

## 📁 Archivos Modificados

### 1. `/app/admin/login/page.tsx`
- ✅ Agregado estado para modo "recuperar contraseña"
- ✅ Función `handleForgotPassword()` para enviar email
- ✅ Formulario alternativo con toggle
- ✅ Enlace "¿Olvidaste tu contraseña?"
- ✅ Manejo de mensajes de éxito

### 2. `/app/admin/reset-password/page.tsx` (NUEVO)
- ✅ Validación de token de recuperación
- ✅ Formulario de nueva contraseña
- ✅ Confirmación de contraseña
- ✅ Mostrar/ocultar contraseña
- ✅ Redireccionamiento automático al login

### 3. `/epicare-database/supabase/config.toml`
- ✅ Agregada URL de reset-password en `additional_redirect_urls`
- ✅ Configurado template de email personalizado

### 4. `/epicare-database/supabase/templates/recovery.html` (NUEVO)
- ✅ Template HTML profesional para email de recuperación
- ✅ Diseño responsive con branding de Epicare
- ✅ Notas de seguridad incluidas

### 5. `/context/configurar-recuperacion-password.md` (NUEVO)
- ✅ Documentación completa del sistema
- ✅ Guía de configuración para local y producción
- ✅ Troubleshooting y ejemplos

---

## 🧪 Cómo Probar (Local)

### Paso 1: Iniciar Supabase

```bash
cd epicare-database
supabase start
```

Verifica que esté corriendo:
- ✅ API URL: http://127.0.0.1:54321
- ✅ Studio: http://127.0.0.1:54323
- ✅ Inbucket (Email): http://127.0.0.1:54324

### Paso 2: Iniciar Admin Dashboard

```bash
cd epicare-admindashboard
npm run dev
```

Debe estar corriendo en: http://localhost:3002

### Paso 3: Probar Recuperación

1. **Ir a Login**
   - Abrir: http://localhost:3002/admin/login

2. **Solicitar Recuperación**
   - Click en "¿Olvidaste tu contraseña?"
   - Ingresar email de un usuario existente
   - Click en "Enviar enlace de recuperación"
   - Deberías ver: ✅ "Se ha enviado un enlace de recuperación..."

3. **Abrir Email (Inbucket)**
   - Abrir: http://localhost:54324
   - Buscar el email más reciente
   - Abrir el email de "Recupera tu contraseña"
   - Click en el botón "Restablecer Contraseña"

4. **Cambiar Contraseña**
   - Deberías ser redirigido a: http://localhost:3002/admin/reset-password
   - Ingresar nueva contraseña (mínimo 8 caracteres)
   - Confirmar contraseña
   - Click en "Restablecer Contraseña"
   - Deberías ver: ✅ "¡Contraseña actualizada!"
   - Automáticamente serás redirigido al login

5. **Iniciar Sesión**
   - En el login deberías ver: ✅ "Contraseña actualizada exitosamente..."
   - Iniciar sesión con tu nueva contraseña
   - Deberías poder acceder al dashboard

---

## 🔍 URLs Importantes

| Servicio | URL Local | Descripción |
|----------|-----------|-------------|
| Admin Dashboard | http://localhost:3002 | Panel de administración |
| Login | http://localhost:3002/admin/login | Página de login |
| Reset Password | http://localhost:3002/admin/reset-password | Cambiar contraseña |
| Supabase Studio | http://127.0.0.1:54323 | Interface de Supabase |
| Inbucket (Email) | http://127.0.0.1:54324 | Ver emails de prueba |

---

## 🎨 Características UI

### Login Page

- ✅ Enlace "¿Olvidaste tu contraseña?" junto al campo de contraseña
- ✅ Formulario alternativo con campo de email únicamente
- ✅ Botón "Volver al inicio de sesión"
- ✅ Mensajes de éxito en verde
- ✅ Mensajes de error en rojo

### Reset Password Page

- ✅ Logo y branding de Epicare
- ✅ Campos de contraseña con toggle show/hide
- ✅ Validación de contraseña (mínimo 8 caracteres)
- ✅ Confirmación de contraseña
- ✅ Pantalla de éxito con ícono de check
- ✅ Redirección automática después de 3 segundos

### Email Template

- ✅ Diseño profesional responsive
- ✅ Colores del branding (#F26023)
- ✅ Botón grande y visible
- ✅ Enlace alternativo en texto
- ✅ Notas de seguridad destacadas
- ✅ Información de expiración (60 minutos)

---

## ⚠️ Troubleshooting

### No llega el email

**Solución:**
1. Verificar que Supabase esté corriendo: `supabase status`
2. Revisar Inbucket: http://localhost:54324
3. Verificar que el email exista en la base de datos:
   ```sql
   SELECT * FROM auth.users WHERE email = 'tu-email@ejemplo.com';
   ```

### El enlace dice "Token inválido"

**Solución:**
1. El enlace expira en 60 minutos - solicita uno nuevo
2. Los enlaces solo funcionan una vez - si ya lo usaste, solicita otro
3. Limpia cookies del navegador o usa ventana de incógnito

### Error al actualizar contraseña

**Solución:**
1. Verifica que la contraseña tenga mínimo 8 caracteres
2. Asegúrate de que ambas contraseñas coincidan
3. Revisa la consola del navegador para más detalles

### El email se ve mal

**Solución:**
1. Verifica que el archivo `recovery.html` existe en: `epicare-database/supabase/templates/`
2. Reinicia Supabase: `supabase stop && supabase start`
3. El template usa variables de Supabase: `{{ .ConfirmationURL }}`

---

## 📊 Flujo Completo

```
Usuario en Login
      ↓
Click "¿Olvidaste tu contraseña?"
      ↓
Formulario: Ingresar email
      ↓
Click "Enviar enlace"
      ↓
Supabase: Genera token + envía email
      ↓
Usuario: Revisa email (Inbucket local)
      ↓
Click en enlace del email
      ↓
Redirige a /auth/callback (Intercambio de código PKCE)
      ↓
Sistema: Establece sesión
      ↓
Redirige a /admin/reset-password
      ↓
Formulario: Nueva contraseña + Confirmar
      ↓
Click "Restablecer Contraseña"
      ↓
Supabase: Actualiza auth.users
      ↓
Pantalla de éxito (3 segundos)
      ↓
Redirige a /admin/login?password_reset=success
      ↓
Mensaje: "Contraseña actualizada exitosamente"
      ↓
Usuario inicia sesión con nueva contraseña
      ↓
✅ Acceso al dashboard
```

---

## 🚀 Deploy a Producción

### Configuración Adicional Necesaria

1. **Configurar SMTP Real**
   - En Supabase Dashboard > Settings > Auth
   - Agregar credenciales SMTP (SendGrid, AWS SES, etc.)

2. **Actualizar URLs**
   - Site URL: `https://tu-dominio.com`
   - Redirect URLs: Agregar `https://tu-dominio.com/admin/reset-password`

3. **Customizar Email Template**
   - En Supabase Dashboard > Authentication > Email Templates
   - Editar "Reset Password" template
   - Pegar contenido de `recovery.html`

4. **Configurar Rate Limiting**
   - Limitar intentos de recuperación por hora
   - Configurar en Supabase Dashboard > Settings > Auth

---

## 📝 Notas de Seguridad

- ✅ Los tokens expiran en 60 minutos
- ✅ Los enlaces solo funcionan una vez
- ✅ Se requiere confirmación de contraseña
- ✅ Contraseña mínima de 8 caracteres
- ✅ Los errores no revelan si el email existe
- ✅ Se registra en logs todo intento de recuperación

---

## 📚 Documentación Adicional

- Ver: `/context/configurar-recuperacion-password.md` para guía completa
- Ver: `/context/documentacion-roles.md` para permisos y roles
- Ver: Supabase Docs: https://supabase.com/docs/guides/auth/auth-password-reset

---

**Última actualización:** Diciembre 11, 2025  
**Versión:** 1.0  
**Estado:** ✅ Funcional y probado
