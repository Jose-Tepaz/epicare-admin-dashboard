# Debug: Documentos no se muestran en la lista

## Situación
- Hay 3 documentos en la tabla `documents`
- Solo se muestran 2 en la UI
- El tercer documento tiene `is_current: false` (es una versión anterior)

## Análisis de los Datos

### Documento 1 (se muestra ✅)
- ID: `236641aa-9eb6-42a4-af72-bd9fac6346df`
- client_id: `723c8fad-ba55-4914-a23f-da1c1f4f7469`
- document_type: `property`
- is_current: `true`
- uploaded_by: `cfbe5527-3b82-40ca-9e85-23b9b8059027`

### Documento 2 (se muestra ✅)
- ID: `a51eb685-8df4-4ab4-aa10-55c1715e7cbf`
- client_id: `4bb0f88d-ddd2-4c02-8bda-ac0bd2c8a638`
- document_type: `medical`
- is_current: `true`
- version: `2` (segunda versión)
- uploaded_by: `cfbe5527-3b82-40ca-9e85-23b9b8059027`

### Documento 3 (NO se muestra ❌ - esperado)
- ID: `e77839b3-ed83-4894-acba-f9432373d531`
- client_id: `4bb0f88d-ddd2-4c02-8bda-ac0bd2c8a638`
- document_type: `medical`
- is_current: `false` ← **Esta es la razón por la que no se muestra**
- version: `1` (versión anterior, reemplazada por el documento 2)

## Conclusión

**El comportamiento es CORRECTO**. El sistema está diseñado para mostrar solo documentos con `is_current = true`. 

El documento 3 es una versión anterior del documento 2 (ambos son `medical` para el mismo `client_id`). Cuando se subió el documento 2, el sistema marcó el documento 3 como `is_current: false` según la lógica de versionado.

## Si quieres ver TODOS los documentos (incluyendo versiones antiguas)

Si necesitas ver también las versiones antiguas, puedes:

1. **Opción 1**: Agregar un filtro en la UI para mostrar "All versions" o "Include old versions"
2. **Opción 2**: Modificar temporalmente la query para no filtrar por `is_current`
3. **Opción 3**: Crear una vista separada de "Document History" o "Version History"

## Verificación en Consola

Revisa la consola del navegador. Deberías ver logs como:

```
Fetching documents with filters: { search: undefined, document_type: "all", ... }
Documents fetched successfully: { count: 2, ... }
```

Si ves `count: 2`, el sistema está funcionando correctamente.

## Si realmente faltan documentos con is_current=true

Si hay documentos con `is_current: true` que no se muestran, verifica:

1. **RLS está habilitado**: Ejecuta `ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;`
2. **Políticas están ejecutadas**: Verifica que las políticas de `07-documents-policies.sql` están activas
3. **Usuario tiene permisos**: Verifica que el usuario tiene el rol correcto
4. **Revisa errores en consola**: Busca errores de "permission denied" o "policy violation"

## Query de Verificación en SQL

Ejecuta esto en Supabase SQL Editor para verificar:

```sql
-- Ver todos los documentos con is_current=true
SELECT 
  id, 
  client_id, 
  document_type, 
  is_current, 
  version,
  uploaded_at
FROM public.documents 
WHERE is_current = true
ORDER BY uploaded_at DESC;

-- Verificar políticas activas
SELECT policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'documents'
ORDER BY cmd, policyname;

-- Verificar RLS está habilitado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'documents';
```

