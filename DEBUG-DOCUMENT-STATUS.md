# Debug: Cambio de Estado de Documentos

## 🔍 Logs de Depuración Agregados

He agregado logs detallados en cada paso del proceso para identificar exactamente dónde está fallando.

### Logs en la Consola

Cuando hagas clic en el dropdown de 3 puntos y selecciones un estado, deberías ver esta secuencia en la consola:

```
🔽 Dropdown opened for doc: [id] status: [status]
🎯 MENU ITEM SELECTED: [status] { docId, currentStatus, event }
🚀 handleUpdateStatus called: { docId, newStatus, currentStatus }
📋 Validating user...
✅ User authenticated: [user_id]
📤 Sending update to Supabase: { documentId, updateData }
✅ Document updated successfully: [data]
📥 Update result: true
✅ Update successful, refreshing...
🔄 updateDocumentStatus END
```

## 🧪 Pasos para Debuggear

1. **Abre la consola del navegador** (F12 → Console)
2. **Ve a `/admin/documents`**
3. **Haz clic en los 3 puntos** de cualquier documento
4. **Observa el primer log**: `🔽 Dropdown opened for doc:`
5. **Selecciona un estado diferente** (ej: "Under Review")
6. **Observa los logs siguientes**

## 📊 Qué Buscar

### Si NO ves "🔽 Dropdown opened"
- El botón de 3 puntos no se está renderizando correctamente
- Hay un problema con el `DropdownMenuTrigger`

### Si ves "🔽 Dropdown opened" pero NO ves "🎯 MENU ITEM SELECTED"
- El `onSelect` no se está disparando
- Posible problema con Radix UI o el evento
- Verifica que el item no esté `disabled`

### Si ves "🎯 MENU ITEM SELECTED" pero NO ves "🚀 handleUpdateStatus called"
- Hay un error antes de llamar a `handleUpdateStatus`
- Revisa si hay errores de JavaScript

### Si ves "🚀 handleUpdateStatus called" pero NO ves "📋 Validating user..."
- Hay un error en `handleUpdateStatus` antes de llamar a `updateDocumentStatus`
- Revisa la validación de `docId` o `newStatus`

### Si ves "📋 Validating user..." pero NO ves "✅ User authenticated"
- Error de autenticación
- El usuario no está logueado o hay problema con `getUser()`

### Si ves "📤 Sending update to Supabase" pero hay error
- **Error de RLS**: "permission denied" → Problema con políticas de UPDATE
- **Error de columna**: "column does not exist" → La migración no se ejecutó
- **Error de constraint**: "invalid input" → El valor de status no es válido

## 🐛 Errores Comunes

### Error: "column 'status' does not exist"
**Solución**: Ejecuta la migración SQL:
```sql
-- Ve a Supabase Dashboard → SQL Editor
-- Ejecuta: sql/migrations/add-document-status.sql
```

### Error: "permission denied for table documents"
**Solución**: Verifica las políticas RLS de UPDATE:
```sql
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'documents' 
  AND cmd = 'UPDATE';
```

### Error: "invalid input value for enum" o constraint violation
**Solución**: Verifica que el valor de status sea válido:
```sql
SELECT conname, consrc 
FROM pg_constraint 
WHERE conrelid = 'public.documents'::regclass 
  AND conname LIKE '%status%';
```

### El dropdown no se abre
**Solución**: Verifica que `DropdownMenu` esté importado correctamente y que no haya errores de z-index.

### Los items están disabled
**Solución**: Verifica que `doc.status` tenga un valor válido y que `updating` sea `false`.

## 📝 Información a Compartir

Si el problema persiste, comparte estos logs de la consola:

1. ¿Qué logs ves cuando abres el dropdown?
2. ¿Qué logs ves cuando haces clic en un item?
3. ¿Hay algún error en rojo en la consola?
4. ¿Qué error específico aparece (si hay alguno)?

## ✅ Cambios Realizados

1. ✅ Logs detallados en cada paso
2. ✅ `onSelect` en lugar de `onClick` para `DropdownMenuItem`
3. ✅ Validación de `docId` y `status` antes de actualizar
4. ✅ Manejo de errores mejorado con mensajes específicos
5. ✅ Query explícita incluyendo campos de status
6. ✅ Logs con emojis para fácil identificación

## 🎯 Próximo Paso

**Abre la consola y prueba el cambio de estado. Comparte los logs que ves para identificar exactamente dónde está fallando.**

