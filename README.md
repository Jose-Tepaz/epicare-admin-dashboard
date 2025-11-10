# EpiCare Admin Dashboard

Panel de administración para gestión de usuarios y aplicaciones de seguros de EpiCare.

## 🚀 Características

- ✅ **Autenticación basada en roles** (Admin, Support Staff)
- ✅ **Gestión completa de Applications** (CRUD, filtros, búsqueda)
- ✅ **Gestión completa de Users** (CRUD, asignación de roles)
- ✅ **Dashboard con estadísticas en tiempo real**
- ✅ **Gráficos y reportes visuales**
- ✅ **Sistema de permisos granulares**
- ✅ **Protección de rutas con middleware**
- ✅ **Compartición de base de datos con marketplace y user dashboard**

## 📋 Prerrequisitos

- Node.js 18+ 
- npm o pnpm
- Cuenta de Supabase (la misma que usa el marketplace y user dashboard)
- Usuario con rol `admin` o `support_staff` en la base de datos

## 🔧 Configuración

### 1. Instalar dependencias

```bash
cd epicare-admindashboard
npm install
```

### 2. Configurar variables de entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```bash
# Supabase (usar las MISMAS credenciales que marketplace y dashboard)
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key

# URLs de las aplicaciones
NEXT_PUBLIC_ADMIN_DASHBOARD_URL=http://localhost:3002
NEXT_PUBLIC_MARKETPLACE_URL=http://localhost:3000
NEXT_PUBLIC_DASHBOARD_URL=http://localhost:3001
```

### 3. Configurar políticas RLS en Supabase

Ejecuta el archivo SQL `supabase-admin-policies.sql` en el SQL Editor de Supabase:

```bash
# El archivo contiene todas las políticas necesarias para que
# los usuarios con rol admin/support_staff puedan acceder a los datos
```

**IMPORTANTE**: Las políticas permiten a usuarios con rol `admin` o `support_staff` acceder a datos que normalmente no podrían ver.

### 4. Crear un usuario administrador

En Supabase SQL Editor, ejecuta:

```sql
-- Asignar rol admin a un usuario existente
INSERT INTO public.user_roles (user_id, role_id) 
VALUES 
  ('tu_user_id_aqui', (SELECT id FROM public.roles WHERE name = 'admin'));

-- O crear el rol admin si no existe
INSERT INTO public.roles (name, description) 
VALUES ('admin', 'Administrador con acceso completo');

-- O crear el rol support_staff
INSERT INTO public.roles (name, description) 
VALUES ('support_staff', 'Personal de soporte con acceso limitado');
```

## 🏃‍♂️ Ejecutar en desarrollo

```bash
npm run dev
```

El admin dashboard estará disponible en: `http://localhost:3002`

## 🔐 Sistema de Roles y Permisos

### Admin
- ✅ CRUD completo en users y applications
- ✅ Asignar/remover roles
- ✅ Eliminar applications
- ✅ Ver datos sensibles (SSN, etc.)
- ✅ Acceso completo a todas las funcionalidades

### Support Staff
- ✅ Ver users y applications (solo READ)
- ✅ Actualizar status de applications
- ✅ Agregar notas a applications
- ❌ NO puede asignar roles
- ❌ NO puede eliminar registros
- ❌ Datos sensibles ofuscados

## 📁 Estructura del Proyecto

```
epicare-admindashboard/
├── app/
│   ├── admin/
│   │   ├── login/          # Página de login
│   │   ├── requests/       # Gestión de applications
│   │   │   └── [id]/       # Detalle de application
│   │   ├── users/          # Gestión de usuarios
│   │   │   └── [id]/       # Detalle de usuario
│   │   ├── documents/      # Gestión de documentos
│   │   └── support/        # Soporte (futuro)
│   └── layout.tsx          # Layout principal con AdminAuthProvider
├── components/
│   ├── admin-layout.tsx    # Layout del admin con sidebar y nav
│   ├── admin-stats.tsx     # Estadísticas del dashboard
│   ├── admin-overview.tsx  # Gráficos y reportes
│   ├── recent-activity.tsx # Actividad reciente
│   ├── requests-table.tsx  # Tabla de applications
│   ├── users-table.tsx     # Tabla de usuarios
│   └── ...
├── contexts/
│   └── admin-auth-context.tsx  # Context de autenticación con roles
├── lib/
│   ├── supabase/
│   │   ├── client.ts       # Cliente browser
│   │   ├── server.ts       # Cliente server
│   │   └── admin.ts        # Cliente con bypass RLS
│   ├── hooks/
│   │   ├── use-applications.ts  # Hook para applications
│   │   ├── use-users.ts         # Hook para users
│   │   └── use-stats.ts         # Hook para estadísticas
│   ├── types/
│   │   ├── database.ts     # Tipos de la BD
│   │   └── admin.ts        # Tipos específicos del admin
│   └── utils/
│       └── permissions.ts  # Helpers de permisos
├── middleware.ts           # Protección de rutas
└── supabase-admin-policies.sql  # Políticas RLS
```

## 🔗 Integración con otros proyectos

Este admin dashboard comparte la misma base de datos de Supabase con:

- **EpiCare Marketplace** (`epicareplans-marketplace`) - Puerto 3000
- **EpiCare User Dashboard** (`epicare-dashboard`) - Puerto 3001

### Base de datos compartida

Todas las aplicaciones usan las mismas tablas:
- `users` - Usuarios del sistema
- `roles` - Roles disponibles
- `user_roles` - Asignación de roles (M:N)
- `applications` - Solicitudes de seguro
- `applicants` - Miembros de cada aplicación
- `coverages` - Coberturas contratadas
- `beneficiaries` - Beneficiarios
- `submission_results` - Resultados de APIs externas
- `insurance_companies` - Aseguradoras
- `application_notes` - Notas internas (nueva)
- `admin_activity_logs` - Logs de auditoría (nueva)

## 🛡️ Seguridad

1. **Middleware de protección**: Todas las rutas `/admin/*` están protegidas
2. **Verificación de roles**: Solo usuarios con rol `admin` o `support_staff` pueden acceder
3. **RLS en Supabase**: Las políticas RLS verifican roles en cada query
4. **Cliente admin limitado**: Solo se usa después de verificar permisos
5. **Ofuscación de datos sensibles**: SSN y datos sensibles se ocultan para support_staff

## 📝 Notas importantes

1. **Service Role Key**: La `SUPABASE_SERVICE_ROLE_KEY` NUNCA debe exponerse al cliente. Solo se usa en operaciones server-side después de verificar permisos.

2. **Roles futuros**: Los roles `finance_staff` y `agent` están preparados en el código pero NO implementados en esta fase. Se agregarán cuando se requiera:
   - `finance_staff`: Para gestión de pagos y comisiones
   - `agent`: Para portal de agentes de ventas

3. **Cookies compartidas**: En producción, configurar el dominio de cookies como `.epicare.com` para compartir autenticación entre subdominios.

4. **Puerto por defecto**: El admin dashboard corre en puerto 3002 para evitar conflictos con marketplace (3000) y user dashboard (3001).

## 🐛 Troubleshooting

### Error: "No tienes permisos para acceder"
- Verifica que tu usuario tenga rol `admin` o `support_staff` en la tabla `user_roles`
- Asegúrate de haber ejecutado las políticas RLS del archivo `supabase-admin-policies.sql`

### Error: "SUPABASE_SERVICE_ROLE_KEY no está configurada"
- Agrega la service role key en tu archivo `.env.local`
- Esta key se encuentra en Settings > API de tu proyecto Supabase

### Los datos no aparecen
- Verifica que las credenciales de Supabase sean las correctas
- Confirma que las políticas RLS estén aplicadas correctamente
- Revisa la consola del navegador para errores específicos

## 📦 Dependencias principales

- Next.js 14
- React 18
- Supabase SSR & JS Client
- Shadcn/ui components
- Recharts (gráficos)
- date-fns (manejo de fechas)
- Sonner (toasts/notificaciones)
- TailwindCSS

## 🚀 Deploy

Para producción:

1. Configurar las variables de entorno en tu plataforma (Vercel, etc.)
2. Actualizar las URLs en `.env` para usar dominios de producción
3. Configurar dominio de cookies como `.epicare.com` en los clientes de Supabase
4. Asegurarse de que las políticas RLS están aplicadas en la BD de producción

## 📄 Licencia

Privado - EpiCare LLC

