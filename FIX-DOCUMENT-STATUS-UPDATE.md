# Fix: Cambio de Estado de Documentos No Funciona

## 🔍 Problema Identificado

El dropdown de cambio de estado (3 puntos) no estaba funcionando al hacer clic en las opciones del menú.

## ✅ Soluciones Implementadas

### 1. Cambio de `onClick` a `onSelect`
**Problema**: `DropdownMenuItem` de Radix UI usa `onSelect` en lugar de `onClick` para manejar la selección de items.

**Solución**: Cambiado todos los `onClick` por `onSelect` en los `DropdownMenuItem`:
```typescript
<DropdownMenuItem
  onSelect={(e) => {
    e.preventDefault()
    handleUpdateStatus(doc.id, 'received', doc)
  }}
  disabled={doc.status === 'received' || updating}
>
```

### 2. Logs de Depuración Mejorados
Agregados logs detallados en:
- `handleUpdateStatus()` - Muestra docId, newStatus, y currentStatus
- `updateDocumentStatus()` - Muestra el proceso completo de actualización
- Cada `onSelect` - Muestra qué opción se seleccionó

### 3. Manejo de Errores Mejorado
- ✅ Alertas al usuario si falla la actualización
- ✅ Logs detallados de errores de Supabase
- ✅ Validación de que el estado sea diferente antes de actualizar

### 4. Query Mejorada
Asegurado que el campo `status` se incluye explícitamente en la query:
```typescript
.select(`
  *,
  status,
  status_changed_by,
  status_changed_at,
  ...
`)
```

### 5. Prevención de Eventos
Agregado `e.preventDefault()` en todos los `onSelect` para prevenir comportamientos por defecto.

### 6. Estado de Loading
Agregado `disabled={updating}` para prevenir múltiples clicks mientras se actualiza.

## 🧪 Cómo Verificar que Funciona

1. **Abre la consola del navegador** (F12)
2. **Ve a `/admin/documents`**
3. **Haz clic en los 3 puntos** de cualquier documento
4. **Selecciona un estado diferente**
5. **Revisa la consola** - Deberías ver:
   ```
   Selected [status] for doc: [id] current status: [current]
   handleUpdateStatus called: { docId, newStatus, currentStatus }
   Updating document status: { documentId, status }
   Update data: { status, status_changed_by, ... }
   Document updated successfully: [data]
   Update result: true
   ```

## 🐛 Si Aún No Funciona

### Verifica en la Consola:

1. **¿Aparece "Selected [status] for doc"?**
   - ✅ Sí → El evento `onSelect` se está disparando
   - ❌ No → Problema con el dropdown o el evento

2. **¿Aparece "Updating document status"?**
   - ✅ Sí → `handleUpdateStatus` se está llamando
   - ❌ No → Problema con la función `handleUpdateStatus`

3. **¿Hay errores de Supabase?**
   - Busca errores como "permission denied" → Problema de RLS
   - Busca errores como "column does not exist" → La migración no se ejecutó
   - Busca errores como "invalid input" → El valor de status no es válido

### Verifica en Supabase:

```sql
-- Verificar que la columna status existe
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'documents' 
  AND column_name = 'status';

-- Verificar el constraint
SELECT conname, consrc 
FROM pg_constraint 
WHERE conrelid = 'public.documents'::regclass 
  AND conname LIKE '%status%';

-- Verificar políticas de UPDATE
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'documents' 
  AND cmd = 'UPDATE';
```

## 📝 Cambios en los Archivos

### `lib/hooks/use-documents.ts`
- ✅ Logs detallados en `updateDocumentStatus()`
- ✅ Manejo de errores mejorado con alertas
- ✅ Query explícita incluyendo `status`, `status_changed_by`, `status_changed_at`
- ✅ Logs de datos de actualización

### `components/documents-manager.tsx`
- ✅ Cambiado `onClick` a `onSelect` en todos los `DropdownMenuItem`
- ✅ Agregado `e.preventDefault()` en todos los handlers
- ✅ Agregado parámetro `doc` a `handleUpdateStatus` para validación
- ✅ Validación de que el estado sea diferente antes de actualizar
- ✅ Logs de depuración en cada paso
- ✅ `disabled={updating}` para prevenir múltiples clicks

## 🎯 Resultado Esperado

Al hacer clic en una opción del dropdown:
1. El menú se cierra
2. Aparece un loading spinner en el botón de 3 puntos
3. La consola muestra los logs de depuración
4. El estado del documento se actualiza en la BD
5. La lista se refresca automáticamente
6. El badge de estado muestra el nuevo estado

