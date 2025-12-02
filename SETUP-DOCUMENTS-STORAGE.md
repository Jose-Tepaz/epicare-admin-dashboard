# Configuración de Storage para Documentos

## ⚠️ IMPORTANTE: RLS debe estar habilitado

**ANTES de continuar**, verifica que RLS está habilitado en la tabla `documents`:

1. Ve a Supabase Dashboard → **Table Editor** → tabla `documents`
2. Verifica que dice **"RLS enabled"** (no "RLS disabled")
3. Si dice "RLS disabled", haz clic en **"..."** → **"Enable RLS"**
4. O ejecuta en SQL Editor: `ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;`

**Sin RLS habilitado, los documentos no se mostrarán en la lista aunque se suban correctamente.**

Ver archivo `FIX-DOCUMENTS-RLS.md` para más detalles.

---

## ⚠️ Error: "Bucket not found"

Si ves el error `StorageApiError: Bucket not found` o `El bucket de documentos no está configurado` al intentar subir documentos, necesitas crear el bucket de storage en Supabase.

## 🚀 Pasos Rápidos para Configurar el Bucket

### Paso 1: Crear el Bucket en Supabase Dashboard

**IMPORTANTE**: El bucket debe llamarse exactamente `documents` (en minúsculas, sin espacios)

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. En el menú lateral izquierdo, haz clic en **"Storage"**
3. Haz clic en el botón **"New bucket"** o **"Create bucket"** (arriba a la derecha)
4. En el modal que aparece, configura:

   | Campo | Valor |
   |-------|-------|
   | **Name** | `documents` (exactamente este nombre) |
   | **Public bucket** | ❌ **DESMARCAR** (debe ser **privado**) |
   | **File size limit** | `10485760` (esto es 10 MB en bytes) |
   | **Allowed MIME types** | `application/pdf,image/jpeg,image/png,image/jpg` |

5. Haz clic en **"Create bucket"** o **"Save"**

**Nota**: Si no ves las opciones de "File size limit" o "Allowed MIME types" en el modal inicial, créalo primero y luego edita el bucket para agregar estas restricciones.

### Paso 2: Ejecutar las Políticas de Storage RLS

Después de crear el bucket, necesitas ejecutar las políticas RLS para el storage:

1. En Supabase Dashboard, ve a **SQL Editor** (menú lateral)
2. Haz clic en **"New query"** o abre una nueva pestaña
3. Abre el archivo en tu editor: 
   ```
   epicare-admindashboard/sql/storage/documents-storage-policies.sql
   ```
4. **Copia TODO el contenido** del archivo (desde `-- ============================================` hasta el final)
5. Pégalo en el SQL Editor de Supabase
6. Haz clic en **"Run"** o presiona `Cmd/Ctrl + Enter`
7. Deberías ver un mensaje de éxito como "Success. No rows returned"

### Paso 3: Verificar la Función `get_current_user_role()`

Las políticas de storage dependen de la función `get_current_user_role()`. 

**Verifica si ya existe**:
1. En SQL Editor, ejecuta:
   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'get_current_user_role';
   ```
2. Si devuelve una fila, la función existe ✅
3. Si no devuelve nada, necesitas ejecutar el archivo que la contiene:
   - Busca `00-admin-global-access-fixed.sql` o similar
   - Ejecuta ese archivo primero

### Paso 4: Ejecutar las Políticas RLS de la Tabla Documents

También necesitas ejecutar las políticas RLS para la tabla `documents`:

1. En Supabase Dashboard, ve a **SQL Editor**
2. Haz clic en **"New query"** o abre una nueva pestaña
3. Abre el archivo: `epicare-admindashboard/sql/policies/07-documents-policies.sql`
4. **Copia TODO el contenido** del archivo
5. Pégalo en el SQL Editor
6. Haz clic en **"Run"**
7. Deberías ver un mensaje de éxito

## ✅ Verificación

Después de completar estos pasos:

1. **Refresca la página** del admin dashboard (o cierra y vuelve a abrir el modal)
2. Intenta subir un documento desde `/admin/documents`
3. Deberías poder:
   - ✅ Ver el documento en la lista
   - ✅ Descargar el documento
   - ✅ Ver las estadísticas actualizadas

Si aún ves el error "Bucket not found":
- Verifica que el bucket se llame exactamente `documents` (sin mayúsculas, sin espacios)
- Verifica que el bucket esté creado en el proyecto correcto de Supabase
- Espera unos segundos y refresca la página

## Troubleshooting

### Error: "function get_current_user_role() does not exist"
- Ejecuta primero el archivo que contiene la definición de `get_current_user_role()`
- Busca en `sql/policies/00-*.sql` o archivos similares

### Error: "permission denied"
- Verifica que las políticas RLS estén ejecutadas correctamente
- Verifica que el usuario tenga el rol correcto en la tabla `users`

### Los documentos no se muestran
- Verifica que las políticas de SELECT estén ejecutadas
- Verifica que el usuario tenga permisos según su rol

## Notas Importantes

- El bucket debe llamarse exactamente `documents` (en minúsculas)
- El bucket debe ser **privado** (Public: false)
- Las políticas de storage y de la tabla deben ejecutarse en orden
- Después de crear el bucket y ejecutar las políticas, puede tomar unos segundos para que los cambios se apliquen

