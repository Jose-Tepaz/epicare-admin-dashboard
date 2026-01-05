# APIs del Módulo de Gestión de Agentes

**Fecha:** 29 de Diciembre, 2024
**Versión:** 1.0

## 📋 Resumen

Se crearon **14 endpoints de API** para el módulo completo de gestión de agentes en el admin dashboard.

---

## 🔐 Autenticación y Permisos

Todos los endpoints requieren autenticación mediante Supabase Auth. Los permisos varían por rol:

| Endpoint | Admin/Super Admin | Agent | Client |
|----------|-------------------|-------|--------|
| GET /api/agents | ✅ Ver todos | ✅ Ver solo su perfil | ❌ |
| POST /api/agents | ✅ Crear | ❌ | ❌ |
| PUT /api/agents/[id] | ✅ Editar todos | ✅ Editar su perfil | ❌ |
| DELETE /api/agents/[id] | ✅ Desactivar | ❌ | ❌ |
| GET /api/appointments | ✅ Ver todos | ✅ Ver todos (read-only) | ❌ |
| POST /api/appointments | ✅ Crear | ❌ | ❌ |
| PUT /api/appointments/[id] | ✅ Editar | ❌ | ❌ |
| DELETE /api/appointments/[id] | ✅ Eliminar | ❌ | ❌ |
| GET /api/licenses | ✅ Ver todas | ✅ Ver todas (read-only) | ❌ |
| POST /api/licenses | ✅ Crear | ❌ | ❌ |
| PUT /api/licenses/[id] | ✅ Editar | ❌ | ❌ |
| DELETE /api/licenses/[id] | ✅ Eliminar | ❌ | ❌ |
| POST /api/licenses/[id]/upload | ✅ Upload PDF | ❌ | ❌ |
| GET /api/agent-clients | ✅ Ver todas | ✅ Ver sus relaciones | ❌ |
| POST /api/agent-clients | ✅ Asignar | ❌ | ❌ |
| DELETE /api/agent-clients | ✅ Desasignar | ❌ | ❌ |

---

## 📚 Documentación de Endpoints

### 1. Gestión de Agentes

#### `GET /api/agents`
**Descripción:** Obtener lista de agentes con paginación y filtros

**Query Params:**
- `page` (number, default: 1)
- `pageSize` (number, default: 25)
- `search` (string) - Busca en nombre, apellido, email, unique_link_code
- `status` (string) - Filtrar por status: active, inactive

**Response:**
```json
{
  "agents": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "first_name": "Juan",
      "last_name": "Pérez",
      "email": "juan@example.com",
      "unique_link_code": "juan-perez",
      "npm": "12345",
      "epicare_number": "EP001",
      "business_name": "Seguros JP",
      "status": "active",
      "is_default": false,
      "join_date": "2024-01-15",
      "user": {
        "id": "uuid",
        "email": "juan@example.com",
        "created_at": "2024-01-15T00:00:00Z"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 25,
    "total": 50,
    "totalPages": 2
  }
}
```

---

#### `POST /api/agents`
**Descripción:** Crear un nuevo agente

**Body:**
```json
{
  "email": "nuevo@example.com",
  "first_name": "María",
  "last_name": "García",
  "phone": "555-1234",
  "unique_link_code": "maria-garcia",
  "npm": "67890",
  "epicare_number": "EP002",
  "business_name": "Seguros MG",
  "is_default": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Agente creado exitosamente",
  "agent": { ... }
}
```

**Validaciones:**
- Email debe ser válido y único
- unique_link_code: 3-50 caracteres, solo letras minúsculas, números y guiones
- Crea automáticamente:
  1. Usuario en Supabase Auth
  2. Registro en tabla `users` con role='agent'
  3. Registro en tabla `agent_profiles`
  4. Envía email de invitación

---

#### `GET /api/agents/[id]`
**Descripción:** Obtener detalles completos de un agente

**Response:**
```json
{
  "agent": { ... },
  "appointments": [...],
  "licenses": [...],
  "clients": [...],
  "stats": {
    "total_clients": 25,
    "total_applications": 50,
    "total_appointments": 5,
    "total_licenses": 3
  }
}
```

---

#### `PUT /api/agents/[id]`
**Descripción:** Actualizar información de un agente

**Body:**
```json
{
  "first_name": "Juan Carlos",
  "photo_url": "https://...",
  "status": "inactive"
}
```

**Notas:**
- Agentes solo pueden editar: first_name, last_name, phone, email, photo_url
- Admins pueden editar todos los campos
- Si `is_default=true`, desmarca otros agentes

---

#### `DELETE /api/agents/[id]`
**Descripción:** Desactivar un agente (soft delete)

**Response:**
```json
{
  "success": true,
  "message": "Agente desactivado exitosamente"
}
```

**Validaciones:**
- No permite desactivar el agente por defecto

---

### 2. Gestión de Appointments

#### `GET /api/appointments`
**Descripción:** Obtener lista de appointments

**Query Params:**
- `agent_id` (uuid) - Filtrar por agente
- `company_id` (uuid) - Filtrar por aseguradora
- `status` (string) - Filtrar por status

**Response:**
```json
{
  "appointments": [
    {
      "id": "uuid",
      "agent_profile_id": "uuid",
      "company_id": "uuid",
      "agent_code": "AG123",
      "agent_number": "159208",
      "start_date": "2024-01-01",
      "expiration_date": "2024-12-31",
      "status": "active",
      "commission_percentage": 5.5,
      "agent": { ... },
      "company": { ... }
    }
  ]
}
```

---

#### `POST /api/appointments`
**Descripción:** Crear nuevo appointment

**Body:**
```json
{
  "agent_profile_id": "uuid",
  "company_id": "uuid",
  "agent_code": "AG123",
  "agent_number": "159208",
  "start_date": "2024-01-01",
  "expiration_date": "2024-12-31",
  "commission_percentage": 5.5
}
```

**Validaciones:**
- No permite duplicados (mismo agente + aseguradora)

---

#### `PUT /api/appointments/[id]`
**Descripción:** Actualizar appointment

**Body:**
```json
{
  "agent_number": "159209",
  "expiration_date": "2025-12-31",
  "status": "active"
}
```

---

#### `DELETE /api/appointments/[id]`
**Descripción:** Eliminar appointment

---

### 3. Gestión de Licenses

#### `GET /api/licenses`
**Descripción:** Obtener lista de licenses

**Query Params:**
- `agent_id` (uuid) - Filtrar por agente
- `state` (string) - Filtrar por estado (ej: FL, NY)
- `status` (string) - Filtrar por status

**Response:**
```json
{
  "licenses": [
    {
      "id": "uuid",
      "agent_id": "uuid",
      "license_number": "L123456",
      "state": "FL",
      "status": "active",
      "document_url": "https://...",
      "created_at": "2024-01-01T00:00:00Z",
      "agent": { ... }
    }
  ]
}
```

---

#### `POST /api/licenses`
**Descripción:** Crear nueva license

**Body:**
```json
{
  "agent_id": "uuid",
  "license_number": "L123456",
  "state": "FL",
  "status": "active",
  "document_url": null
}
```

**Validaciones:**
- state: exactamente 2 letras mayúsculas
- No permite duplicados (mismo agente + estado)

---

#### `PUT /api/licenses/[id]`
**Descripción:** Actualizar license

**Body:**
```json
{
  "license_number": "L789012",
  "status": "suspended"
}
```

---

#### `DELETE /api/licenses/[id]`
**Descripción:** Eliminar license

---

#### `POST /api/licenses/[id]/upload`
**Descripción:** Subir documento PDF de una license

**Body:** FormData
- `file` (File) - Archivo PDF

**Validaciones:**
- Solo archivos PDF
- Máximo 5MB
- Se guarda en Supabase Storage: `documents/licenses/{agent_id}/license-{agent_id}-{state}-{timestamp}.pdf`

**Response:**
```json
{
  "success": true,
  "message": "Documento subido exitosamente",
  "license": { ... },
  "document_url": "https://..."
}
```

---

#### `DELETE /api/licenses/[id]/upload`
**Descripción:** Eliminar documento de una license

- Elimina archivo del storage
- Limpia `document_url` en la BD

---

### 4. Gestión Multi-Agente (agent_clients)

#### `GET /api/agent-clients`
**Descripción:** Obtener relaciones agente-cliente

**Query Params:**
- `agent_id` (uuid) - Filtrar por agente
- `client_id` (uuid) - Filtrar por cliente

**Response:**
```json
{
  "relations": [
    {
      "id": "uuid",
      "agent_id": "uuid",
      "client_id": "uuid",
      "assigned_at": "2024-01-01T00:00:00Z",
      "assigned_by": "uuid",
      "source": "link",
      "agent": { ... },
      "client": { ... }
    }
  ]
}
```

**Sources posibles:**
- `link` - Cliente desde link único
- `marketplace` - Cliente registrado en marketplace (agente default)
- `manual_creation` - Agente/Admin creó al cliente
- `admin_reassignment` - Admin asignó cliente a agente adicional

---

#### `POST /api/agent-clients`
**Descripción:** Asignar cliente a un agente (multi-agente)

**Body:**
```json
{
  "agent_id": "uuid",
  "client_id": "uuid"
}
```

**Validaciones:**
- Agente debe estar activo
- Usuario debe ser role='client'
- No permite duplicados

**Response:**
```json
{
  "success": true,
  "message": "Cliente asignado exitosamente al agente",
  "relation": { ... }
}
```

---

#### `DELETE /api/agent-clients`
**Descripción:** Desasignar cliente de un agente

**Body:**
```json
{
  "agent_id": "uuid",
  "client_id": "uuid"
}
```

**Validaciones:**
- Cliente debe tener al menos 2 agentes (no puede quedarse sin agentes)
- No puede desasignar el agente principal (users.agent_profile_id)

---

## 🔍 Ejemplos de Uso

### Crear un agente completo

```javascript
// 1. Crear agente
const response1 = await fetch('/api/agents', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'nuevo@example.com',
    first_name: 'Juan',
    last_name: 'Pérez',
    unique_link_code: 'juan-perez',
    npm: '12345'
  })
});
const { agent } = await response1.json();

// 2. Agregar appointment con Allstate
await fetch('/api/appointments', {
  method: 'POST',
  body: JSON.stringify({
    agent_profile_id: agent.id,
    company_id: 'allstate-uuid',
    agent_code: 'AG123',
    agent_number: '159208',
    expiration_date: '2025-12-31'
  })
});

// 3. Agregar license de Florida
await fetch('/api/licenses', {
  method: 'POST',
  body: JSON.stringify({
    agent_id: agent.id,
    license_number: 'L123456',
    state: 'FL'
  })
});

// 4. Upload documento de license
const formData = new FormData();
formData.append('file', pdfFile);
await fetch(`/api/licenses/${licenseId}/upload`, {
  method: 'POST',
  body: formData
});
```

### Asignar cliente a múltiples agentes

```javascript
// Cliente ya existe con agente principal
const clientId = 'client-uuid';

// Asignar como agente adicional
await fetch('/api/agent-clients', {
  method: 'POST',
  body: JSON.stringify({
    agent_id: 'agent2-uuid',
    client_id: clientId
  })
});

// Ahora el cliente tiene 2 agentes
// users.agent_profile_id = primer agente (principal)
// agent_clients = ambos agentes
```

---

## 🚨 Manejo de Errores

Todos los endpoints devuelven errores en formato consistente:

```json
{
  "error": "Mensaje de error descriptivo"
}
```

**Códigos HTTP:**
- `200` - Éxito
- `400` - Validación fallida
- `401` - No autenticado
- `403` - Sin permisos
- `404` - Recurso no encontrado
- `500` - Error interno del servidor

---

## 📝 Notas Importantes

### 1. Sistema Dual de Agentes
- `users.agent_profile_id` → Agente principal (no cambia)
- `agent_clients` → Todos los agentes (puede crecer)
- Triggers mantienen ambos sincronizados automáticamente

### 2. Soft Deletes
- Los agentes se "desactivan" (status='inactive') en lugar de eliminarse
- Appointments y licenses se eliminan de manera hard (se pueden recrear)

### 3. Validaciones de Negocio
- Un agente no puede tener 2 appointments con la misma aseguradora
- Un agente no puede tener 2 licenses en el mismo estado
- Un cliente no puede quedarse sin agentes
- No se puede desactivar el agente por defecto

### 4. RLS Policies
- Las políticas RLS protegen los datos automáticamente
- Agentes solo ven sus datos incluso si intentan hacer queries directas
- Admins tienen acceso total

---

## 🧪 Testing

Para probar las APIs, usar Postman o curl:

```bash
# Obtener agentes
curl -X GET "http://localhost:3002/api/agents" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Crear agente
curl -X POST "http://localhost:3002/api/agents" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"email":"test@example.com","first_name":"Test","last_name":"User"}'
```

---

## 📂 Estructura de Archivos

```
epicare-admindashboard/app/api/
├── agents/
│   ├── route.ts                    # GET, POST
│   └── [id]/
│       └── route.ts                # GET, PUT, DELETE
├── appointments/
│   ├── route.ts                    # GET, POST
│   └── [id]/
│       └── route.ts                # PUT, DELETE
├── licenses/
│   ├── route.ts                    # GET, POST
│   └── [id]/
│       ├── route.ts                # PUT, DELETE
│       └── upload/
│           └── route.ts            # POST, DELETE (upload PDF)
└── agent-clients/
    └── route.ts                    # GET, POST, DELETE
```

---

## 🚀 Próximos Pasos

1. ✅ Migraciones de BD - Completado
2. ✅ APIs del Backend - Completado
3. ⏳ Hooks de React - Pendiente
4. ⏳ Componentes de UI - Pendiente
5. ⏳ Testing E2E - Pendiente

---

**Estado:** ✅ APIs completadas y listas para usar
**Próximo paso:** Crear hooks de React para consumir estas APIs

