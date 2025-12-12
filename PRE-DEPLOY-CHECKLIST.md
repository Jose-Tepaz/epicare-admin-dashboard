# ✅ Pre-Deploy Checklist

## 🎯 Antes de hacer Deploy

### 1. Variables de Entorno ✅

Asegúrate de tener estas variables configuradas en tu plataforma:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://[proyecto].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]  # ⚠️ SOLO EN SERVIDOR
NEXT_PUBLIC_ADMIN_DASHBOARD_URL=https://admin.tudominio.com
NEXT_PUBLIC_DASHBOARD_URL=https://app.tudominio.com
```

### 2. Configuración de Supabase ✅

#### A. Redirect URLs
- [ ] Site URL: `https://app.tudominio.com`
- [ ] Redirect URL 1: `https://admin.tudominio.com/auth/callback`
- [ ] Redirect URL 2: `https://admin.tudominio.com/admin/set-password`

#### B. Email Template (Invite User)
- [ ] Verificar que use `{{ .ConfirmationURL }}`
- [ ] Probar enviando un email de prueba

#### C. SMTP (Opcional pero recomendado)
- [ ] Configurar servidor SMTP propio
- [ ] Probar envío de emails

### 3. Build Local ✅

```bash
cd epicare-admindashboard
npm run build
```

- [ ] Build completa sin errores críticos
- [ ] Advertencia de `/auth/callback` es normal (usar dinámica)
- [ ] Tamaño del build: ~441MB

### 4. Código Listo ✅

- [ ] No hay `console.log()` de debug en producción (opcional)
- [ ] Variables de entorno hardcodeadas removidas
- [ ] `.env.local` en `.gitignore`
- [ ] Todos los archivos commiteados

### 5. Supabase RLS ✅

- [ ] Políticas RLS verificadas
- [ ] `can_create_role()` funcionando
- [ ] `get_my_role()` funcionando
- [ ] Usuarios pueden leer su propio perfil

### 6. Testing Local ✅

Probar flujo completo localmente antes de deploy:

- [ ] Login funciona
- [ ] Crear usuario funciona
- [ ] Email de invitación llega
- [ ] Set password funciona
- [ ] Dashboard carga correctamente
- [ ] Todas las secciones accesibles

---

## 🚀 Deploy

### Opción A: Vercel (Más Fácil)

```bash
# 1. Push a GitHub
git push origin main

# 2. Conectar en Vercel
# https://vercel.com/new

# 3. Configurar variables de entorno en Vercel

# 4. Deploy automático ✅
```

### Opción B: VPS con PM2

```bash
# 1. SSH al servidor
ssh user@tu-servidor.com

# 2. Clonar repo
git clone https://github.com/tu-usuario/epicare.git
cd epicare/epicare-admindashboard

# 3. Instalar dependencias
npm install

# 4. Build
npm run build

# 5. Configurar PM2
pm2 start npm --name "epicare-admin" -- start

# 6. Configurar Nginx + SSL
# Ver DEPLOY-GUIDE.md
```

---

## 📊 Post-Deploy Verification

### 1. Verificación Básica
- [ ] Sitio carga: `https://admin.tudominio.com`
- [ ] Login funciona
- [ ] No hay errores en consola del navegador

### 2. Verificación de Invitaciones
- [ ] Crear usuario de prueba
- [ ] Email llega (check spam)
- [ ] Link del email funciona
- [ ] Set password funciona
- [ ] Login con nueva cuenta funciona

### 3. Verificación de Funcionalidad
- [ ] Dashboard carga con datos
- [ ] Crear/editar usuarios
- [ ] Ver aplicaciones
- [ ] Ver documentos
- [ ] Ver tickets de soporte

### 4. Verificación de Seguridad
- [ ] HTTPS habilitado (candado verde)
- [ ] Headers de seguridad configurados
- [ ] No se exponen variables sensibles en cliente
- [ ] Service Role Key NO visible en Network tab

---

## 🐛 Si algo falla

### Error común 1: "Redirect URL not allowed"
**Solución:** 
1. Ir a Supabase → Authentication → URL Configuration
2. Agregar todas las URLs de producción
3. Esperar 2-3 minutos
4. Reintentar

### Error común 2: "Cannot connect to Supabase"
**Solución:**
1. Verificar variables de entorno
2. Verificar que `NEXT_PUBLIC_*` estén bien escritas
3. Rebuild y redeploy

### Error común 3: "Auth session missing"
**Solución:**
1. Verificar que cookies se envían correctamente
2. Verificar dominio de producción
3. Verificar configuración de CORS en Supabase

---

## 📞 Recursos

- **Guía completa:** `DEPLOY-GUIDE.md`
- **Documentación de invitaciones:** `../context/flujo-invitacion-usuarios.md`
- **Supabase Dashboard:** https://app.supabase.com
- **Vercel Dashboard:** https://vercel.com/dashboard

---

## ✅ Todo listo para Deploy

Una vez que hayas verificado todos los items:

```bash
# Push final
git add .
git commit -m "Ready for production deploy"
git push origin main
```

🎉 **¡Deploy en camino!**

---

Última actualización: 10 Diciembre 2025

