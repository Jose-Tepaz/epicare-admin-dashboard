# Fix: Auth Loading Timeout Issue

## Problema Identificado

La aplicación se quedaba cargando indefinidamente y no mostraba datos. Los logs de consola mostraban:

```
📡 Starting Supabase query for user: 19c986c7-ca33-4e4c-9f3f-530e72ba9113
⚠️ Auth loading timed out after 5s, forcing loading to false
```

### Causa Raíz

Las queries de Supabase en `AdminAuthProvider` se quedaban colgadas y nunca completaban. Esto puede ser causado por:

1. **Problemas de conexión a Supabase** - latencia alta o timeouts de red
2. **Políticas RLS (Row Level Security)** que causan queries lentas
3. **Índices faltantes** en las tablas de Supabase
4. **Sesiones de Supabase inválidas o corruptas**

### Síntoma

El usuario veía una pantalla de carga permanente porque:
- La query inicial nunca completaba
- El timeout de seguridad de 5s forzaba `loading = false`
- Pero no había datos para mostrar (sin usuario, sin roles)

## Solución Implementada

### 1. Función Helper para Timeouts

Agregamos una función `withTimeout` que envuelve cualquier promesa con un timeout:

```typescript
const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number, errorMsg: string): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(errorMsg)), timeoutMs)
    )
  ])
}
```

### 2. Timeouts en fetchUserContext

Agregamos timeouts a todas las queries:

#### Query de usuarios (4 segundos)
```typescript
const userQuery = supabase
  .from('users')
  .select('*')
  .eq('id', userId)
  .maybeSingle()

const result = await withTimeout(
  userQuery,
  4000,
  'User query timeout after 4s'
)
```

Si la query hace timeout, **recarga la página automáticamente** después de 1 segundo.

#### Query de roles disponibles (3 segundos)
```typescript
const rolesQuery = supabase.rpc('get_available_roles')
const result = await withTimeout(
  rolesQuery,
  3000,
  'Roles query timeout after 3s'
)
```

Si hace timeout, usa **fallback al rol principal** del usuario.

#### Query de agent_profiles (3 segundos)
```typescript
const agentQuery = supabase
  .from('agent_profiles')
  .select('id')
  .eq('user_id', userId)
  .maybeSingle()

const result = await withTimeout(
  agentQuery,
  3000,
  'Agent profile query timeout after 3s'
)
```

Si hace timeout, establece `agentId = null` y continúa.

### 3. Timeout en initAuth - getSession (4 segundos)

También agregamos timeout a `supabase.auth.getSession()`:

```typescript
const sessionQuery = supabase.auth.getSession()
const result = await withTimeout(
  sessionQuery,
  4000,
  'getSession timeout after 4s'
)
```

Si hace timeout, **recarga la página** después de 1 segundo.

### 4. Mejores Logs de Debug

Agregamos logs más detallados para identificar dónde ocurre el problema:

- `✅ getSession completado` - cuando la sesión se obtiene correctamente
- `⚠️ User query timeout after Xms` - cuando una query específica hace timeout
- `🔄 Recargando página debido a timeout...` - cuando se detecta un problema y se recarga

## Beneficios

1. **Recuperación automática** - Si hay un timeout, la página se recarga automáticamente
2. **Fallbacks inteligentes** - Para queries no críticas, usa valores por defecto
3. **Mejor debugging** - Logs más claros identifican exactamente qué query falla
4. **Evita pantallas de carga infinitas** - Los timeouts son cortos (3-4s) y hay recuperación

## Próximos Pasos Recomendados

### 1. Verificar Políticas RLS en Supabase

Ir al dashboard de Supabase y verificar las políticas de la tabla `users`:

```sql
-- Verificar que las políticas permiten SELECT
SELECT * FROM users WHERE id = auth.uid();
```

### 2. Revisar Logs de Supabase

En el dashboard de Supabase → Logs → Database:
- Buscar queries lentas
- Verificar si hay errores de permisos

### 3. Agregar Índices

Si las queries son lentas, agregar índices:

```sql
-- Índice en users.id (probablemente ya existe)
CREATE INDEX IF NOT EXISTS idx_users_id ON users(id);

-- Índice en agent_profiles.user_id
CREATE INDEX IF NOT EXISTS idx_agent_profiles_user_id ON agent_profiles(user_id);
```

### 4. Verificar Conexión a Supabase

Asegurarse de que las variables de entorno estén correctas:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
```

### 5. Probar en Red Diferente

Si el problema persiste, probar desde una red diferente para descartar problemas de conexión local.

## Testing

1. **Probar login normal** - debería funcionar sin timeouts
2. **Probar con conexión lenta** - debería mostrar logs de timeout y recargar
3. **Verificar logs en consola** - deberían verse los nuevos mensajes de debug

## Monitoreo

Los nuevos logs permitirán identificar:
- Qué query específica causa el timeout
- Cuánto tiempo tarda cada query
- Si el problema es de conexión o de RLS/permisos


