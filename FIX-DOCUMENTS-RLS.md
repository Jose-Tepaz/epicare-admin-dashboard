# Fix: RLS Disabled en Tabla Documents

## Problema
La tabla `documents` muestra "RLS disabled" en Supabase Dashboard, lo que significa que las políticas RLS no se están aplicando y los usuarios no pueden ver los documentos que suben.

## Solución

### Paso 1: Habilitar RLS Manualmente
1. Ve a Supabase Dashboard → **Table Editor**
2. Selecciona la tabla `documents`
3. Haz clic en el ícono de **"..."** (tres puntos) en la parte superior
4. Selecciona **"Enable RLS"** o **"Enable Row Level Security"**
5. Confirma la acción

### Paso 2: Ejecutar las Políticas RLS
1. Ve a Supabase Dashboard → **SQL Editor**
2. Abre el archivo: `epicare-admindashboard/sql/policies/07-documents-policies.sql`
3. **Copia TODO el contenido** del archivo
4. Pégalo en el SQL Editor
5. Haz clic en **"Run"** o presiona `Cmd/Ctrl + Enter`
6. Deberías ver mensajes de éxito para cada política creada

### Paso 3: Verificar que RLS está Habilitado
Ejecuta esta query en SQL Editor para verificar:

```sql
SELECT 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'documents';
```

Debe retornar `rowsecurity = true`

### Paso 4: Verificar que las Políticas Existen
Ejecuta esta query para ver todas las políticas de la tabla documents:

```sql
SELECT 
  policyname, 
  cmd, 
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'documents'
ORDER BY policyname;
```

Deberías ver políticas como:
- "Admin can view all documents"
- "Agent can view their clients documents"
- "Support staff global can view all documents"
- "Client can view own documents"
- Y políticas para INSERT, UPDATE, DELETE

### Paso 5: Verificar la Función get_current_user_role()
Las políticas dependen de la función `get_current_user_role()`. Verifica que existe:

```sql
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'get_current_user_role';
```

Si no existe, busca el archivo que la contiene (probablemente `00-admin-global-access-fixed.sql`) y ejecútalo primero.

## Troubleshooting

### Si RLS sigue disabled después de ejecutar el SQL
- Verifica que tienes permisos de superuser o admin en Supabase
- Intenta habilitarlo manualmente desde el Table Editor
- Verifica que no hay errores en la consola de SQL

### Si los documentos no aparecen después de habilitar RLS
1. Verifica que el usuario tiene el rol correcto en la tabla `users`
2. Verifica que `get_current_user_role()` retorna el rol correcto
3. Revisa los logs de la consola del navegador para ver errores de permisos
4. Prueba hacer un `refetch` manual en la página de documentos

### Si ves errores de "permission denied"
- Verifica que todas las políticas se crearon correctamente
- Verifica que `get_current_user_role()` existe y funciona
- Revisa que el usuario tiene el rol correcto en `users.role`

## Nota Importante
Después de habilitar RLS y ejecutar las políticas, puede tomar unos segundos para que los cambios se apliquen. Refresca la página de documentos después de hacer los cambios.

