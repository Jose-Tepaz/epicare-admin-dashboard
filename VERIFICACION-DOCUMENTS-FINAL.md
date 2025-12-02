# Verificación Final: Documentos no se muestran todos

## ✅ Estado Actual

### Políticas RLS - CORRECTO
Después de la limpieza, tienes **13 políticas correctas**:
- 4 SELECT policies
- 4 INSERT policies  
- 3 UPDATE policies
- 2 DELETE policies

✅ No hay duplicados
✅ Nombres consistentes
✅ Estructura correcta

### Datos en la Tabla
Según los datos que compartiste:
- **3 documentos totales** en la tabla
- **2 con `is_current: true`** (deberían mostrarse)
- **1 con `is_current: false`** (versión anterior, NO debería mostrarse)

## 🔍 Diagnóstico

El sistema está diseñado para mostrar **solo documentos con `is_current = true`**. 

Basado en tus datos:
- Documento 1: `is_current: true` → ✅ Se muestra
- Documento 2: `is_current: true` → ✅ Se muestra  
- Documento 3: `is_current: false` → ❌ NO se muestra (correcto, es versión anterior)

## 📊 Próximos Pasos para Verificar

### 1. Revisa la Consola del Navegador

Después de refrescar la página `/admin/documents`, busca estos logs:

```
Fetching documents with filters: { ... }
Simple query result (without relations): { count: 2, ... }
Documents fetched successfully: { count: 2, ... }
```

**Preguntas clave**:
- ¿El `count` es 2? → Correcto, solo hay 2 con `is_current: true`
- ¿Hay errores de "permission denied"? → Problema de RLS
- ¿El `count` es 0? → Problema de RLS o políticas

### 2. Verifica tu Rol de Usuario

Ejecuta en Supabase SQL Editor:

```sql
-- Ver tu usuario y rol
SELECT 
  id, 
  email, 
  role,
  get_current_user_role() as current_role_function
FROM public.users 
WHERE email = 'tu-email@ejemplo.com';  -- Reemplaza con tu email
```

**Según tu rol**:
- **Admin/Super Admin**: Deberías ver TODOS los documentos con `is_current: true`
- **Agent**: Solo verás documentos de tus clientes
- **Support Staff**: Depende del scope (global vs agent_specific)

### 3. Verifica que los client_id Existen

Ejecuta esta query para verificar integridad referencial:

```sql
SELECT 
  d.id as doc_id,
  d.client_id,
  d.document_type,
  d.is_current,
  d.file_name,
  u.id as user_exists,
  u.email as client_email,
  u.role as client_role
FROM public.documents d
LEFT JOIN public.users u ON d.client_id = u.id
WHERE d.is_current = true
ORDER BY d.uploaded_at DESC;
```

**Si `user_exists` es NULL** para algún documento, hay un problema de integridad referencial y RLS puede estar bloqueando ese documento.

### 4. Prueba la Query Directamente con tu Usuario

Ejecuta esta query en Supabase SQL Editor (se ejecutará con tu usuario actual):

```sql
SELECT 
  id, 
  client_id, 
  document_type, 
  is_current,
  file_name,
  uploaded_at
FROM public.documents 
WHERE is_current = true
ORDER BY uploaded_at DESC;
```

**Compara el resultado**:
- Si retorna 2 documentos → RLS está funcionando correctamente
- Si retorna 0 documentos → RLS está bloqueando (problema de políticas)
- Si retorna más de 2 → Hay más documentos con `is_current: true` de los que pensabas

### 5. Verifica la Función get_current_user_role()

```sql
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'get_current_user_role';
```

Debe retornar al menos una fila. Si no existe, las políticas fallarán.

## 🎯 Escenarios Posibles

### Escenario A: Solo hay 2 documentos con is_current=true
**Solución**: ✅ El sistema está funcionando correctamente. El documento 3 es una versión anterior y no debería mostrarse.

### Escenario B: Hay más documentos con is_current=true que no se muestran
**Causas posibles**:
1. **RLS está bloqueando** → Verifica tu rol y las políticas
2. **client_id no existe en users** → Problema de integridad referencial
3. **Políticas están mal configuradas** → Revisa los logs de error
4. **Problema con relaciones** → Los `client` o `uploader` no se cargan

### Escenario C: La query simple retorna más documentos que la query con relaciones
**Causa**: Problema con las foreign keys o las relaciones
**Solución**: Verifica que los `client_id` y `uploaded_by` existen en la tabla `users`

## 📝 Qué Revisar en la Consola

Después de refrescar la página, busca:

1. **"Simple query result"** - ¿Cuántos documentos retorna sin relaciones?
2. **"Documents fetched successfully"** - ¿Cuántos documentos retorna con relaciones?
3. **Errores de "permission denied"** - Indica problema de RLS
4. **"Some documents have missing relations"** - Indica problema de foreign keys

## ✅ Conclusión

Si realmente solo hay **2 documentos con `is_current: true`** en la base de datos, entonces el sistema está funcionando **correctamente**. El tercer documento tiene `is_current: false` porque es una versión anterior que fue reemplazada.

Si esperas ver más documentos, verifica:
1. Que realmente tienen `is_current: true` en la BD
2. Que tu usuario tiene el rol correcto para verlos
3. Que los `client_id` existen en la tabla `users`
4. Que no hay errores en la consola del navegador

