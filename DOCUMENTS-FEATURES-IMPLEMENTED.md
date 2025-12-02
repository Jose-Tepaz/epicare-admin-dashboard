# Funcionalidades Implementadas en Documents

## ✅ Funcionalidades Completadas

### 1. Botón para Ver Documento
- **Implementado**: Hook `useViewDocument()` en `lib/hooks/use-documents.ts`
- **Funcionalidad**: 
  - Genera una URL firmada de Supabase Storage (válida por 1 hora)
  - Abre el documento en una nueva pestaña
  - Maneja errores de visualización
- **UI**: Botón con icono de ojo (`Eye`) en la columna "Actions"
- **Ubicación**: `components/documents-manager.tsx` - Tabla de Document Library

### 2. Estado del Documento (Aprobado/No Aprobado)
- **Implementado**: Función `getDocumentStatus()` en `components/documents-manager.tsx`
- **Estados disponibles**:
  - **Expirado** (`expired`): Si `expires_at` ha pasado o `marked_expired_at` existe
    - Color: Rojo (`bg-red-100 text-red-800`)
  - **Vinculado** (`linked`): Si tiene `application_id`
    - Color: Azul (`bg-blue-100 text-blue-800`)
  - **Recibido** (`received`): Estado por defecto
    - Color: Amarillo (`bg-yellow-100 text-yellow-800`)
- **Nota**: No hay campo de "aprobado" en la BD, se usa lógica basada en `expires_at` y `application_id`

### 3. Información de Aplicación Vinculada
- **Implementado**: Función `getApplicationInfo()` en `components/documents-manager.tsx`
- **Información mostrada**:
  - **ID corto de la aplicación** (primeros 8 caracteres)
  - **Estado de la aplicación** (badge)
  - **Nombre de la compañía de seguros** (si está disponible)
- **Fuentes de datos**:
  - `application.insurance_companies.name` (relación directa)
  - `application.carrier_name`
  - `application.enrollment_data.companyName`
  - `application.enrollment_data.carrier_name`
- **Query mejorada**: Incluye relación con `insurance_companies` via `applications_company_id_fkey`

## 📋 Cambios en la UI

### Nueva Columna "Status"
- Muestra el estado del documento con un badge colorizado
- Estados: Expirado, Vinculado, Recibido

### Nueva Columna "Application"
- Muestra información de la aplicación vinculada
- Si no hay aplicación: muestra "—"
- Si hay aplicación: muestra ID corto, estado y nombre de compañía

### Botones de Acción Actualizados
1. **Ver** (Eye icon): Abre el documento en nueva pestaña
2. **Descargar** (Download icon): Descarga el documento
3. **Verify** (CheckCircle icon): Verifica el documento (funcionalidad existente)

## 🔧 Cambios Técnicos

### Archivos Modificados

1. **`lib/hooks/use-documents.ts`**
   - ✅ Agregado hook `useViewDocument()` para visualizar documentos
   - ✅ Query mejorada para incluir relación con `applications` e `insurance_companies`
   - ✅ Corregido error TypeScript con `statusCode` en StorageError

2. **`lib/types/admin.ts`**
   - ✅ Actualizado tipo `Document` para incluir relación `application` completa
   - ✅ Agregados campos: `carrier_name`, `company_id`, `insurance_companies`

3. **`components/documents-manager.tsx`**
   - ✅ Agregadas columnas "Status" y "Application" en la tabla
   - ✅ Implementadas funciones `getDocumentStatus()` y `getApplicationInfo()`
   - ✅ Agregado botón "Ver" con icono de ojo
   - ✅ Mejorada visualización de información de aplicación

## 🎯 Query de Supabase

La query ahora incluye:
```typescript
application:applications!documents_application_id_fkey(
  id, 
  status, 
  enrollment_data,
  carrier_name,
  company_id,
  insurance_companies:applications_company_id_fkey(id, name, slug)
)
```

## 📝 Notas Importantes

1. **Estado "Aprobado"**: No existe un campo específico en la BD para "aprobado". El estado se determina por:
   - Si está expirado → "Expirado"
   - Si está vinculado a una aplicación → "Vinculado"
   - Por defecto → "Recibido"

2. **Visualización de Documentos**: Los documentos se abren en una nueva pestaña usando URLs firmadas de Supabase Storage (válidas por 1 hora)

3. **Información de Aplicación**: Se muestra de forma inteligente, priorizando la relación directa con `insurance_companies` sobre los datos en `enrollment_data`

## 🚀 Próximos Pasos Sugeridos

Si se necesita un campo de "aprobado" más explícito, se podría:
1. Agregar un campo `status` o `approved` a la tabla `documents`
2. Agregar campos `approved_by` y `approved_at` para tracking
3. Implementar un modal o acción para aprobar/rechazar documentos

