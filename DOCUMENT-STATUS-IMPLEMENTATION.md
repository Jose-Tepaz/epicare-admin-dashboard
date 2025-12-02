# Implementación de Estado de Documentos

## ✅ Resumen

Se ha implementado un sistema completo de estados para documentos, permitiendo rastrear el ciclo de vida de cada documento desde su recepción hasta su aprobación o rechazo.

## 📋 Cambios en la Base de Datos

### Migración SQL: `sql/migrations/add-document-status.sql`

**Nuevos campos agregados a la tabla `documents`**:

1. **`status`** (VARCHAR, NOT NULL, DEFAULT 'received')
   - Valores permitidos: `'received'`, `'under_review'`, `'approved'`, `'rejected'`, `'expired'`
   - Constraint CHECK para validar valores
   - Estado por defecto: `'received'`

2. **`status_changed_by`** (UUID, nullable)
   - Referencia a `public.users(id)`
   - Registra quién cambió el estado

3. **`status_changed_at`** (TIMESTAMP WITH TIME ZONE, nullable)
   - Registra cuándo se cambió el estado

**Índices creados**:
- `idx_documents_status` - Para búsquedas por estado
- `idx_documents_status_current` - Para búsquedas por estado e `is_current`

**Actualización automática**:
- Los documentos existentes con `expires_at` pasado se marcan como `'expired'`
- Los documentos con `marked_expired_at` se marcan como `'expired'`

## 🎯 Estados Disponibles

| Estado | Descripción | Color UI |
|--------|-------------|----------|
| `received` | Documento recién subido | Gris |
| `under_review` | En proceso de revisión | Amarillo |
| `approved` | Aprobado | Verde |
| `rejected` | Rechazado | Rojo |
| `expired` | Expirado | Naranja |

## 🔧 Cambios en el Código

### 1. Tipos TypeScript (`lib/types/admin.ts`)

```typescript
export type DocumentStatus = 'received' | 'under_review' | 'approved' | 'rejected' | 'expired'

export interface Document {
  // ... campos existentes
  status: DocumentStatus
  status_changed_by: string | null
  status_changed_at: string | null
}

export interface DocumentFilters {
  // ... filtros existentes
  status?: DocumentStatus | 'all'
}

export interface DocumentStats {
  total: number
  received: number
  under_review: number
  approved: number
  rejected: number
  expired: number
  uploaded_today: number
  by_type: { ... }
}
```

### 2. Hooks (`lib/hooks/use-documents.ts`)

#### `useDocuments()`
- ✅ Filtro por `status` agregado
- ✅ Query incluye campo `status` de la BD
- ✅ Dependencias actualizadas para incluir `filters.status`

#### `useDocumentStats()`
- ✅ Conteo por estado usando el campo `status` de la BD
- ✅ Estadísticas actualizadas: `received`, `under_review`, `approved`, `rejected`, `expired`

#### `useUploadDocument()`
- ✅ Nuevos documentos se crean con `status: 'received'` por defecto

#### `useUpdateDocumentStatus()` - **NUEVO**
```typescript
const { updateDocumentStatus, updating, error } = useUpdateDocumentStatus()

// Uso:
await updateDocumentStatus(documentId, 'under_review')
```
- Actualiza el estado del documento
- Registra `status_changed_by` y `status_changed_at`
- Si el estado es `'expired'`, también actualiza `marked_expired_by` y `marked_expired_at`

### 3. Componentes UI

#### `components/documents-manager.tsx`

**Filtro de Estado**:
- ✅ Select dropdown para filtrar por estado
- ✅ Opciones: All Status, Received, Under Review, Approved, Rejected, Expired

**Columna Status**:
- ✅ Muestra badge con el estado actual
- ✅ Colores según el estado
- ✅ Función `getDocumentStatus()` actualizada para usar el campo `status` de la BD

**Dropdown de Cambio de Estado**:
- ✅ Botón con icono `MoreVertical`
- ✅ Menú desplegable con todas las opciones de estado
- ✅ Indica el estado actual con checkmark
- ✅ Deshabilita la opción del estado actual
- ✅ Llama a `handleUpdateStatus()` que usa `useUpdateDocumentStatus()`

**Funciones actualizadas**:
- `getDocumentStatus()` - Usa `doc.status` de la BD
- `handleUpdateStatus()` - Nueva función para cambiar estado
- `handleVerifyDocument()` - Ahora cambia a `'under_review'`

#### `components/documents-stats.tsx`

**Estadísticas actualizadas**:
- ✅ "Under Review" en lugar de "Verified"
- ✅ "Approved" con icono `CheckCircle`
- ✅ Usa los nuevos campos de `DocumentStats`

## 📝 Pasos para Implementar

### 1. Ejecutar la Migración SQL

1. Ve a **Supabase Dashboard → SQL Editor**
2. Abre el archivo: `epicare-admindashboard/sql/migrations/add-document-status.sql`
3. **Copia TODO el contenido**
4. Pégalo en el SQL Editor
5. Haz clic en **"Run"**

### 2. Verificar la Migración

Ejecuta estas queries para verificar:

```sql
-- Verificar que la columna status existe
SELECT column_name, data_type, column_default, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'documents' 
  AND column_name IN ('status', 'status_changed_by', 'status_changed_at');

-- Verificar los valores de status
SELECT status, COUNT(*) as count 
FROM public.documents 
GROUP BY status
ORDER BY count DESC;

-- Verificar el constraint
SELECT conname, consrc 
FROM pg_constraint 
WHERE conrelid = 'public.documents'::regclass 
  AND conname LIKE '%status%';
```

### 3. Probar la Funcionalidad

1. **Refresca la página** `/admin/documents`
2. **Verifica el filtro de estado** - Deberías ver el dropdown "Status"
3. **Sube un nuevo documento** - Debería tener estado "Received"
4. **Cambia el estado** - Usa el dropdown de 3 puntos en la columna Actions
5. **Verifica las estadísticas** - Deberían mostrar los conteos correctos

## 🎨 UI/UX

### Colores de Estado

- **Received**: `bg-gray-100 text-gray-800` - Gris neutro
- **Under Review**: `bg-yellow-100 text-yellow-800` - Amarillo (en proceso)
- **Approved**: `bg-green-100 text-green-800` - Verde (aprobado)
- **Rejected**: `bg-red-100 text-red-800` - Rojo (rechazado)
- **Expired**: `bg-orange-100 text-orange-800` - Naranja (expirado)

### Interacciones

1. **Filtro de Estado**: Filtra la lista de documentos por estado
2. **Dropdown de Estado**: Menú contextual con todas las opciones
3. **Indicador Visual**: Checkmark en el estado actual
4. **Feedback**: Loading state mientras se actualiza
5. **Auto-refresh**: La lista se actualiza después de cambiar el estado

## 🔒 Consideraciones de Seguridad

- El campo `status_changed_by` registra quién hizo el cambio
- El campo `status_changed_at` registra cuándo se hizo el cambio
- RLS policies existentes aplican a las actualizaciones de estado
- Solo usuarios autorizados pueden cambiar el estado (según RLS)

## 📊 Flujo de Estados Recomendado

```
received → under_review → approved
                ↓
            rejected
                ↓
            expired (automático si expires_at < now)
```

## 🚀 Próximos Pasos Opcionales

1. **Notificaciones**: Enviar notificación al cliente cuando el estado cambia
2. **Historial**: Tabla separada para historial de cambios de estado
3. **Comentarios**: Campo para comentarios al rechazar
4. **Workflow**: Definir reglas de transición entre estados
5. **Bulk Actions**: Cambiar estado de múltiples documentos a la vez

