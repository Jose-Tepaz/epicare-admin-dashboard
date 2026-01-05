# Módulo de Agentes - Frontend (Admin Dashboard)

## 📋 Resumen

Este documento describe la implementación del frontend para el módulo de gestión de agentes en el Admin Dashboard de Epicare. La implementación incluye hooks personalizados para consumir las APIs y componentes UI para gestionar agentes, appointments, licencias y clientes.

---

## 🎯 Componentes Principales

### 1. Hooks Personalizados (`lib/hooks/use-agents.ts`)

Hooks de React para interactuar con las APIs del módulo de agentes:

#### **Agentes**
- `useAgentProfile(userId)` - Obtener perfil de agente por user_id
- `useUpdateAgentProfile()` - Actualizar perfil de agente
- `useAgentStats(agentProfileId)` - Obtener estadísticas del agente

#### **Appointments**
- `useAppointments(agentProfileId)` - Listar appointments
- `useCreateAppointment()` - Crear nuevo appointment
- `useUpdateAppointment()` - Actualizar appointment
- `useDeleteAppointment()` - Eliminar appointment

#### **Licencias**
- `useLicenses(agentProfileId)` - Listar licencias
- `useCreateLicense()` - Crear nueva licencia
- `useUpdateLicense()` - Actualizar licencia
- `useDeleteLicense()` - Eliminar licencia
- `useUploadLicenseDocument()` - Subir documento de licencia

#### **Clientes**
- `useAgentClients(agentProfileId)` - Listar clientes asignados
- `useAssignClient()` - Asignar cliente a agente
- `useUnassignClient()` - Desasignar cliente de agente

---

### 2. Componente Principal (`components/agent-detail-view.tsx`)

Componente que muestra toda la información y gestión de un agente mediante tabs:

#### **Estructura de Tabs:**

1. **Información** - Perfil del agente
   - Link único del agente (copiable)
   - NPM, Número Epicare
   - Estado (activo/inactivo/pendiente)
   - Fecha de ingreso
   - Edición de información

2. **Appointments** - Gestión de appointments
   - Lista de appointments con aseguradoras
   - Crear, editar y eliminar appointments
   - Estados: activo, expirado, pendiente
   - Fechas de inicio y vencimiento

3. **Licencias** - Gestión de licencias estatales
   - Lista de licencias por estado
   - Crear, editar y eliminar licencias
   - Upload de documentos (PDF, imágenes)
   - Estados: activa, expirada, pendiente, suspendida

4. **Clientes** - Gestión de clientes asignados
   - Lista de clientes asignados al agente
   - Asignar nuevos clientes
   - Desasignar clientes
   - Información de contacto

5. **Ventas** - Historial de ventas
   - Lista de applications vendidas por el agente
   - Filtrado por estado
   - Link a detalles de cada application

#### **Estadísticas (Cards superiores):**
- Total de clientes
- Total de appointments
- Licencias activas
- Ventas totales

---

## 🔗 Integración

### Página de Detalles de Usuario

El componente `AgentDetailView` se integra automáticamente en la página de detalles de usuario (`/admin/users/[id]/page.tsx`) cuando el usuario tiene el rol de **agent**.

```tsx
{user.roles?.some((role: any) => role.name === 'agent') && (
  <AgentDetailView userId={user.id} />
)}
```

---

## 📊 Flujos de Usuario

### 1. Ver Perfil de Agente

1. Admin navega a `/admin/users`
2. Hace clic en un usuario con rol "agent"
3. Se muestra la información básica del usuario
4. Debajo aparece el componente `AgentDetailView` con todas las tabs

### 2. Gestionar Appointments

1. En la vista de agente, ir a tab "Appointments"
2. Hacer clic en "Nuevo Appointment"
3. Completar formulario:
   - Cliente ID (UUID)
   - Aseguradora ID (UUID)
   - Fechas de inicio y vencimiento
   - Estado
   - Notas opcionales
4. Guardar

**Editar/Eliminar:**
- Hacer clic en el ícono de editar o eliminar en cada appointment
- Confirmar acción

### 3. Gestionar Licencias

1. En la vista de agente, ir a tab "Licencias"
2. Hacer clic en "Nueva Licencia"
3. Completar formulario:
   - Estado (FL, CA, TX, etc.)
   - Número de licencia
   - Fecha de emisión
   - Fecha de vencimiento
   - Estado (activa, pendiente, expirada, suspendida)
   - Notas opcionales
4. Guardar

**Upload de Documento:**
- Hacer clic en el ícono de upload en cada licencia
- Seleccionar archivo (PDF, JPG, PNG)
- El documento se sube automáticamente

### 4. Asignar Clientes

1. En la vista de agente, ir a tab "Clientes"
2. Hacer clic en "Asignar Cliente"
3. Ingresar el UUID del cliente
4. Agregar notas opcionales
5. Guardar

**Desasignar:**
- Hacer clic en el ícono de eliminar en cada cliente
- Confirmar acción

---

## 🎨 Componentes UI Utilizados

El módulo utiliza los componentes de shadcn/ui ya existentes en el proyecto:

- `Card`, `CardHeader`, `CardTitle`, `CardContent`
- `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`
- `Dialog`, `DialogContent`, `DialogHeader`, etc.
- `AlertDialog` para confirmaciones
- `Button`, `Input`, `Label`, `Textarea`
- `Select`, `SelectContent`, `SelectItem`
- `Badge` para estados
- `Avatar` para fotos de perfil

---

## 🔐 Permisos y Acceso

### Admin/Super Admin
- Ver todos los agentes
- Editar información de agentes
- Gestionar appointments, licencias y clientes
- Ver estadísticas completas

### Agente (cuando accede al dashboard)
- Ver solo su propia información
- Ver sus clientes asignados
- Ver sus appointments (read-only según PRD)
- Ver sus licencias (read-only según PRD)
- Ver sus ventas

**Nota:** El filtrado por rol se maneja mediante:
1. RLS policies en la base de datos
2. Contexto de autenticación (`AdminAuthContext`)
3. Middleware de Next.js

---

## 🚀 Próximos Pasos (Pendientes)

### 1. Mejoras en UI de Asignación de Clientes
- Agregar búsqueda de clientes por nombre/email
- Selector visual en lugar de UUID manual
- Vista previa de información del cliente antes de asignar

### 2. Mejoras en Appointments
- Selector de aseguradoras desde dropdown
- Selector de clientes desde dropdown
- Validación de fechas (vencimiento > inicio)
- Notificaciones de appointments próximos a vencer

### 3. Dashboard del Agente
- Implementar vistas limitadas para agentes
- Dashboard personalizado con métricas propias
- Acceso read-only a appointments y licencias

### 4. Integración con Marketplace
- Implementar ruta `/agent/[code]` en marketplace
- Sistema de cookies para tracking de referidos
- Integración en flujo de registro

### 5. Testing
- Tests unitarios para hooks
- Tests de integración para componentes
- Tests E2E para flujos completos

---

## 📝 Notas Técnicas

### Manejo de Estados
- Todos los hooks usan `useState` para loading/error states
- Refetch automático después de crear/actualizar/eliminar
- Toast notifications para feedback al usuario

### Validaciones
- Validación de campos requeridos en formularios
- Validación de formato de fechas
- Validación de UUIDs para IDs

### Performance
- Lazy loading de tabs (solo se cargan al hacer clic)
- Debounce en búsquedas (pendiente de implementar)
- Paginación en listas largas (pendiente de implementar)

### Accesibilidad
- Labels en todos los inputs
- Descripciones en dialogs
- Confirmaciones para acciones destructivas
- Keyboard navigation en formularios

---

## 🐛 Troubleshooting

### El componente AgentDetailView no aparece
- Verificar que el usuario tenga el rol "agent" en `user.roles`
- Verificar que exista un `agent_profile` para ese usuario
- Revisar console del browser para errores

### Error al crear appointment/licencia
- Verificar que los IDs sean UUIDs válidos
- Verificar permisos RLS en Supabase
- Revisar logs de la API en `/api/appointments` o `/api/licenses`

### Upload de documento falla
- Verificar tamaño del archivo (< 5MB recomendado)
- Verificar formato (PDF, JPG, PNG)
- Verificar configuración de Supabase Storage

---

## 📚 Referencias

- [Hooks Personalizados](./lib/hooks/use-agents.ts)
- [Componente AgentDetailView](./components/agent-detail-view.tsx)
- [API Endpoints](./app/api/README-AGENT-MODULE-APIS.md)
- [Migraciones de Base de Datos](../epicare-database/supabase/migrations/README-AGENT-MODULE-MIGRATIONS.md)


