# 🚀 Guía de Deploy - Admin Dashboard

## ✅ Build Completado

**Fecha del build:** 10 Diciembre 2025  
**Tamaño del build:** 441 MB  
**Estado:** ✅ Build exitoso

---

## 📦 Preparación para Deploy

### 1. Variables de Entorno de Producción

Asegúrate de configurar las siguientes variables en tu plataforma de deploy:

```env
# Supabase - Públicas
NEXT_PUBLIC_SUPABASE_URL=https://[tu-proyecto].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[tu-anon-key]

# Supabase - Servidor (IMPORTANTE: Service Role Key)
SUPABASE_SERVICE_ROLE_KEY=[tu-service-role-key]

# URLs de Producción
NEXT_PUBLIC_ADMIN_DASHBOARD_URL=https://admin.tudominio.com
NEXT_PUBLIC_DASHBOARD_URL=https://app.tudominio.com
```

⚠️ **IMPORTANTE:** 
- `SUPABASE_SERVICE_ROLE_KEY` **NO debe ser expuesta** al cliente
- Solo debe estar en las variables de entorno del servidor
- Nunca la subas a GitHub

---

## 🔧 Configuración de Supabase para Producción

### 1. Actualizar Redirect URLs

Ve a **Supabase Dashboard → Authentication → URL Configuration**:

```
Site URL:
https://app.tudominio.com

Redirect URLs (agregar):
https://admin.tudominio.com/auth/callback
https://admin.tudominio.com/admin/set-password
https://admin.tudominio.com/auth/invite-callback
```

### 2. Actualizar Email Templates

Ve a **Supabase Dashboard → Authentication → Email Templates**

**Invite User (Confirm signup):**
```html
<h2>Has sido invitado</h2>
<p>Has sido invitado a crear una cuenta en {{ .SiteURL }}. Haz clic en el siguiente enlace para aceptar la invitación:</p>
<p><a href="{{ .ConfirmationURL }}">Aceptar invitación</a></p>
```

⚠️ **IMPORTANTE:** El `{{ .ConfirmationURL }}` ya incluye el `redirectTo` configurado en el código.

### 3. Configurar SMTP (Opcional pero Recomendado)

Para producción, configura tu propio servidor SMTP:

- **Supabase Dashboard → Project Settings → Auth**
- Configura: Gmail, SendGrid, AWS SES, etc.
- Esto asegura mejor deliverability y evita límites de Supabase

---

## 📁 Archivos para Deploy

### Archivos Necesarios:
- `.next/` (generado por el build)
- `public/`
- `package.json`
- `next.config.mjs`
- `.env` o variables de entorno configuradas en la plataforma

### Archivos NO Necesarios:
- `node_modules/` (se instalan en el servidor)
- `.git/`
- Archivos `.md` de documentación
- `context/` (solo para desarrollo)

---

## 🌐 Deploy en Vercel (Recomendado)

### Opción 1: Deploy desde GitHub

1. **Conectar repositorio:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit - Admin Dashboard"
   git remote add origin https://github.com/tu-usuario/epicare-admin.git
   git push -u origin main
   ```

2. **En Vercel:**
   - Ir a https://vercel.com/new
   - Importar tu repositorio
   - Configurar variables de entorno
   - Deploy automático ✅

### Opción 2: Deploy con Vercel CLI

```bash
# Instalar Vercel CLI
npm i -g vercel

# Ir al directorio del proyecto
cd epicare-admindashboard

# Deploy
vercel

# Deploy a producción
vercel --prod
```

### Configuración en Vercel:

**Root Directory:**
```
epicare-admindashboard
```

**Build Command:**
```
npm run build
```

**Output Directory:**
```
.next
```

**Install Command:**
```
npm install
```

---

## 🐳 Deploy con Docker (Alternativo)

### 1. Crear `Dockerfile`:

```dockerfile
# Dockerfile
FROM node:18-alpine AS base

# Instalar dependencias solo cuando sea necesario
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Instalar dependencias
COPY package*.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variables de entorno para build
ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

### 2. Crear `.dockerignore`:

```
node_modules
.next
.git
*.md
context
.env.local
```

### 3. Build y run:

```bash
# Build imagen
docker build -t epicare-admin .

# Run container
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=your_url \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key \
  -e SUPABASE_SERVICE_ROLE_KEY=your_service_key \
  epicare-admin
```

---

## 🖥️ Deploy en VPS (Ubuntu/Debian)

### 1. Instalar Node.js y PM2:

```bash
# Instalar Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar PM2
sudo npm install -g pm2
```

### 2. Clonar y configurar:

```bash
# Clonar repositorio
git clone https://github.com/tu-usuario/epicare-admin.git
cd epicare-admin/epicare-admindashboard

# Instalar dependencias
npm install

# Build
npm run build

# Crear archivo de variables de entorno
nano .env.production
# (Pegar tus variables de entorno)
```

### 3. Configurar PM2:

```bash
# Crear archivo ecosystem
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'epicare-admin',
    script: 'npm',
    args: 'start',
    cwd: '/ruta/al/proyecto/epicare-admindashboard',
    env: {
      NODE_ENV: 'production',
      PORT: 3002
    }
  }]
}
EOF

# Iniciar con PM2
pm2 start ecosystem.config.js

# Guardar configuración
pm2 save

# Auto-start en boot
pm2 startup
```

### 4. Configurar Nginx como Reverse Proxy:

```nginx
# /etc/nginx/sites-available/admin.tudominio.com
server {
    listen 80;
    server_name admin.tudominio.com;

    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Habilitar sitio
sudo ln -s /etc/nginx/sites-available/admin.tudominio.com /etc/nginx/sites-enabled/

# Test configuración
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
```

### 5. Configurar SSL con Let's Encrypt:

```bash
# Instalar Certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtener certificado
sudo certbot --nginx -d admin.tudominio.com

# Renovación automática
sudo certbot renew --dry-run
```

---

## 🔍 Verificación Post-Deploy

### Checklist:

- [ ] El sitio carga en `https://admin.tudominio.com`
- [ ] Login funciona correctamente
- [ ] Crear usuario funciona
- [ ] Email de invitación llega y funciona
- [ ] Set password funciona
- [ ] Dashboard carga con datos
- [ ] Todas las secciones son accesibles según rol
- [ ] No hay errores en la consola del navegador
- [ ] Variables de entorno configuradas correctamente

### Comandos de verificación:

```bash
# Ver logs en Vercel
vercel logs

# Ver logs en PM2
pm2 logs epicare-admin

# Ver logs en Docker
docker logs <container-id>
```

---

## 🐛 Troubleshooting

### Error: "Cannot read properties of undefined"
- Verificar que todas las variables de entorno estén configuradas
- Verificar que `SUPABASE_SERVICE_ROLE_KEY` esté presente

### Error: "Redirect URL not allowed"
- Verificar configuración de Redirect URLs en Supabase
- Esperar 2-3 minutos después de cambiar configuración

### Error: "Auth session missing"
- Verificar que las cookies se estén enviando correctamente
- Verificar configuración de dominio en producción

### Performance lento:
- Verificar que estés usando la región de Supabase más cercana
- Considerar Vercel Edge Functions
- Habilitar caché de Next.js

---

## 📊 Monitoreo

### Recomendaciones:

1. **Vercel Analytics** (incluido por defecto)
   - Ya está configurado en el código
   - Ver estadísticas en Vercel Dashboard

2. **Sentry** (para errores)
   ```bash
   npm install @sentry/nextjs
   ```

3. **Logs de Supabase**
   - Dashboard → Logs
   - Monitorear autenticación y queries

4. **Uptime Monitoring**
   - UptimeRobot
   - Pingdom
   - Better Uptime

---

## 🔄 Actualizaciones

### Deploy de nuevas versiones:

**Con Vercel:**
```bash
git add .
git commit -m "Update feature X"
git push
# Deploy automático en Vercel
```

**Con PM2:**
```bash
cd epicare-admindashboard
git pull
npm install
npm run build
pm2 restart epicare-admin
```

**Con Docker:**
```bash
docker build -t epicare-admin:v2 .
docker stop epicare-admin-container
docker run -d --name epicare-admin-container -p 3000:3000 epicare-admin:v2
```

---

## 🔐 Seguridad

### Checklist de seguridad:

- [ ] HTTPS habilitado (SSL/TLS)
- [ ] Variables sensibles en `.env` (no en código)
- [ ] CORS configurado correctamente
- [ ] Rate limiting habilitado en Supabase
- [ ] Políticas RLS verificadas
- [ ] Service Role Key protegida
- [ ] Headers de seguridad configurados
- [ ] CSP (Content Security Policy) configurado

### Headers de seguridad en `next.config.mjs`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ]
  },
}

export default nextConfig
```

---

## 📞 Soporte

Para problemas con el deploy:

1. **Verificar documentación:**
   - `context/flujo-invitacion-usuarios.md`
   - Esta guía

2. **Logs del sistema:**
   - Consola del navegador (F12)
   - Logs del servidor (PM2/Vercel/Docker)
   - Logs de Supabase

3. **Errores comunes:**
   - Ver sección de Troubleshooting arriba
   - Revisar variables de entorno

---

## ✅ Deploy Exitoso

Una vez completado, tendrás:

- ✅ Admin Dashboard en producción
- ✅ Sistema de invitaciones funcionando
- ✅ Autenticación segura
- ✅ Monitoreo activo
- ✅ HTTPS habilitado
- ✅ Backups automáticos (Supabase)

---

**Próximos pasos sugeridos:**

1. Configurar dominio personalizado
2. Habilitar monitoreo de errores (Sentry)
3. Configurar backups adicionales
4. Documentar procesos de actualización
5. Crear runbook para incidentes

---

Última actualización: 10 Diciembre 2025

