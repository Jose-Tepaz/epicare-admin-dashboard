# Fix: Políticas Duplicadas en Documents - Solo se muestran 2 documentos

## Problema Identificado

Hay **políticas duplicadas** en la tabla `documents`:
- Políticas con nombres descriptivos: "Admin can view all documents"
- Políticas con nombres cortos: "admin_select_all_documents"
- Políticas de versiones anteriores: "support_staff_select_documents"

Esto puede causar conflictos y comportamientos inesperados en RLS.

## Solución: Limpieza Completa

He creado el archivo `07-documents-policies-CLEAN.sql` que:

1. ✅ **Elimina TODAS las políticas existentes** (incluyendo duplicadas)
2. ✅ **Recrea solo las políticas correctas** (12 políticas en total)
3. ✅ **Usa nombres consistentes** y descriptivos
4. ✅ **Mantiene la lógica correcta** según requisitos

## Pasos para Resolver

### Paso 1: Ejecutar el Script de Limpieza

1. Ve a Supabase Dashboard → **SQL Editor**
2. Abre el archivo: `epicare-admindashboard/sql/policies/07-documents-policies-CLEAN.sql`
3. **Copia TODO el contenido**
4. Pégalo en el SQL Editor
5. Haz clic en **"Run"**

### Paso 2: Verificar que Solo Hay 12 Políticas

Ejecuta esta query para verificar:

```sql
SELECT policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'documents'
ORDER BY cmd, policyname;
```

**Deberías ver exactamente 12 políticas**:

**SELECT (4 políticas)**:
- Admin can view all documents
- Agent can view their clients documents
- Support staff can view documents
- Client can view own documents

**INSERT (4 políticas)**:
- Admin can upload documents
- Agent can upload documents
- Support staff can upload documents
- Client can upload own documents

**UPDATE (3 políticas)**:
- Admin can update documents
- Agent can update their clients documents
- Support staff can update documents

**DELETE (2 políticas)**:
- Admin can delete documents
- Agent can delete documents

### Paso 3: Verificar RLS está Habilitado

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'documents';
```

Debe retornar `rowsecurity = true`

### Paso 4: Verificar el Usuario Actual

Ejecuta esto para ver qué rol tiene tu usuario:

```sql
SELECT 
  id, 
  email, 
  role,
  get_current_user_role() as current_role
FROM public.users 
WHERE id = auth.uid();
```

### Paso 5: Probar la Query Directamente

Ejecuta esta query para ver si RLS está bloqueando documentos:

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

Si esta query retorna 2 documentos pero la UI también muestra 2, entonces el problema NO es RLS sino que realmente solo hay 2 documentos con `is_current = true`.

### Paso 6: Verificar en la Consola del Navegador

Después de ejecutar el script de limpieza:

1. Refresca la página de documentos
2. Abre la consola del navegador (F12)
3. Busca los logs:
   - "Fetching documents with filters"
   - "Documents fetched successfully"
4. Verifica el `count` en los logs
5. Verifica si hay errores de "permission denied"

## Si Aún Solo Muestra 2 Documentos

Si después de limpiar las políticas duplicadas aún solo muestra 2 documentos, verifica:

1. **¿Cuántos documentos tienen `is_current = true`?**
   ```sql
   SELECT COUNT(*) FROM public.documents WHERE is_current = true;
   ```

2. **¿El usuario tiene el rol correcto?**
   - Si eres admin/super_admin, deberías ver TODOS los documentos
   - Si eres agent, solo verás documentos de tus clientes
   - Si eres support_staff, depende del scope

3. **¿Los client_id de los documentos existen en la tabla users?**
   ```sql
   SELECT d.id, d.client_id, d.is_current, u.id as user_exists
   FROM public.documents d
   LEFT JOIN public.users u ON d.client_id = u.id
   WHERE d.is_current = true;
   ```
   Si `user_exists` es NULL, hay un problema de integridad referencial.

4. **¿Hay errores en la consola del navegador?**
   - Busca errores de "permission denied"
   - Busca errores de "policy violation"
   - Revisa los logs detallados que agregamos

## Troubleshooting Adicional

### Si ves "function get_current_user_role() does not exist"
Ejecuta primero el archivo que contiene la definición de esta función:
- `00-admin-global-access-fixed.sql` o
- `02-users-policies.sql`

### Si las políticas no se eliminan
Algunas políticas pueden estar protegidas. Intenta eliminarlas manualmente desde Supabase Dashboard:
1. Table Editor → documents → "Policies" tab
2. Elimina cada política duplicada manualmente
3. Luego ejecuta el script CLEAN

### Si RLS sigue disabled
Habilítalo manualmente:
1. Table Editor → documents → "..." → "Enable RLS"
2. O ejecuta: `ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;`

## Resultado Esperado

Después de ejecutar `07-documents-policies-CLEAN.sql`:
- ✅ Solo 12 políticas activas (sin duplicados)
- ✅ RLS habilitado
- ✅ Todos los documentos con `is_current = true` se muestran según el rol del usuario
- ✅ No hay errores de "permission denied" en la consola

