# Fix: Auth Timeout - Solución Completa

## 🔍 Problemas Identificados

### 1. getSession() Tardando Más de 4 Segundos
```
⚠️ getSession timeout: getSession timeout after 4s
```
**Causa**: Primera conexión a Supabase tarda en establecerse ("cold start")

### 2. Query de Usuario Timeout
```
⚠️ User query timeout after 4001ms: User query timeout after 4s
```
**Causa**: Igual que getSession, primera query tarda más

### 3. React Strict Mode Ejecutando Todo Dos Veces
```
🔄 AdminAuthProvider useEffect running (aparece 2 veces)
```
**Causa**: React Strict Mode en desarrollo ejecuta effects dos veces intencionalmente

### 4. Timeout de Seguridad Disparándose
```
⚠️ Auth loading timed out after 5s, forcing loading to false
```
**Causa**: El timeout de seguridad no se limpiaba correctamente

## ✅ Soluciones Implementadas

### 1. Prevenir Ejecuciones Duplicadas

Agregamos un `initializingRef` para evitar que el useEffect se ejecute múltiples veces:

```typescript
const initializingRef = useRef(false)

useEffect(() => {
  // Evitar inicialización duplicada (React Strict Mode)
  if (initializingRef.current) {
    console.log('⏸️ Already initializing, skipping duplicate useEffect')
    return
  }
  
  initializingRef.current = true
  // ... resto del código
}, [supabase, router, pathname])
```

### 2. Aumentar Timeouts para Primera Carga

Los timeouts ahora son más generosos para la primera carga:

- **getSession**: 4s → **6s**
- **Timeout de seguridad**: 5s → **8s**

```typescript
// getSession con 6 segundos
const result = await withTimeout(
  sessionQuery,
  6000,
  'getSession timeout after 6s'
)

// Timeout de seguridad de 8 segundos
safetyTimeoutId = setTimeout(() => {
  if (mounted && loading) {
    console.warn('⚠️ Auth loading timed out after 8s, forcing loading to false')
    setLoading(false)
  }
}, 8000)
```

### 3. Mejor Cleanup de Timeouts

Ahora limpiamos correctamente todos los timeouts:

```typescript
// En el finally de initAuth
if (safetyTimeoutId) {
  clearTimeout(safetyTimeoutId)
  safetyTimeoutId = null
}

// En el cleanup del useEffect
return () => {
  mounted = false
  initializingRef.current = false
  if (safetyTimeoutId) {
    clearTimeout(safetyTimeoutId)
  }
  subscription.unsubscribe()
}
```

### 4. Manejo de Timeout en getSession

Si `getSession()` hace timeout, ahora redirige a login (en lugar de recargar):

```typescript
catch (timeoutErr: any) {
  console.error('⚠️ getSession timeout:', timeoutErr.message)
  console.warn('⚠️ Timeout en getSession, asumiendo sin sesión...')
  
  if (mounted) {
    if (!pathname?.includes('/login') && !pathname?.includes('/auth/') && !pathname?.includes('/set-password')) {
      console.log('➡️ Redirigiendo a login debido a timeout')
      router.push('/admin/login')
    }
    setLoading(false)
  }
  return
}
```

### 5. Deshabilitar React Strict Mode (Temporal)

En `next.config.mjs`:

```javascript
const nextConfig = {
  reactStrictMode: false, // Deshabilitado temporalmente
  // ... resto de config
}
```

**Nota**: Esto es temporal para debugging. En producción, React Strict Mode NO se ejecuta de todas formas.

## 📊 Logs Esperados Ahora

### ✅ Login Exitoso (sin timeouts)
```
🔄 AdminAuthProvider useEffect running
⏳ Initializing auth...
✅ getSession completado: { hasSession: true, userId: 'xxx' }
✅ Session found, user: xxx
🔍 AdminAuthContext: Fetching user context for xxx
📡 Starting Supabase query for user: xxx
⏱️ Query completed in 150ms
📋 Columnas disponibles en users: Array(35)
📡 Fetching available roles...
✅ Available roles fetched: ['agent']
✅ AdminAuthContext: Active role: agent | Primary role: agent
✅ Agent profile ID: xxx
✅ Loading complete (initAuth)
🔄 Auth state changed: SIGNED_IN
⏭️ Skipping context refresh (already have data)
✅ Auth state change handled
```

### ⚠️ Con Timeout (primera carga lenta)
```
🔄 AdminAuthProvider useEffect running
⏳ Initializing auth...
⚠️ getSession timeout: getSession timeout after 6s
⚠️ Timeout en getSession, asumiendo sin sesión...
➡️ Redirigiendo a login debido a timeout
✅ Loading complete (initAuth)
```

## 🧪 Testing

### 1. Probar Login Normal

```bash
cd epicare-admindashboard
npm run dev
```

- Ir a `http://localhost:3002/admin/login`
- Hacer login con un usuario válido
- **Esperado**: Dashboard carga sin timeouts

### 2. Probar con Conexión Lenta

En Chrome DevTools:
1. Network tab → Throttling → Slow 3G
2. Hacer login
3. **Esperado**: Puede tardar más pero eventualmente carga

### 3. Verificar Logs

En la consola del navegador deberías ver:
- ✅ Sin mensajes de timeout
- ✅ Un solo "AdminAuthProvider useEffect running"
- ✅ getSession completa en menos de 1 segundo
- ✅ Query de usuario completa en menos de 200ms

## 🔧 Si el Problema Persiste

### Verificar Conexión a Supabase

1. **Dashboard de Supabase** → Project Settings → API
2. Verificar que las URLs sean correctas
3. Verificar que las API keys sean válidas

### Verificar Variables de Entorno

```bash
# En epicare-admindashboard/.env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
```

### Verificar Políticas RLS

En Supabase SQL Editor:

```sql
-- Verificar que el usuario puede leer su propio perfil
SELECT * FROM users WHERE id = auth.uid();

-- Verificar función get_available_roles
SELECT get_available_roles();
```

### Agregar Índices (si queries son lentas)

```sql
-- Índice en users.id (probablemente ya existe como PK)
CREATE INDEX IF NOT EXISTS idx_users_id ON users(id);

-- Índice en agent_profiles.user_id
CREATE INDEX IF NOT EXISTS idx_agent_profiles_user_id ON agent_profiles(user_id);
```

### Verificar Logs de Supabase

Dashboard de Supabase → Logs → Database:
- Buscar queries lentas (>1s)
- Buscar errores de permisos RLS

## 📈 Mejoras Futuras

### 1. Cache de Datos de Usuario

Guardar datos del usuario en localStorage para cargar más rápido:

```typescript
// Al cargar exitosamente
localStorage.setItem('userContext', JSON.stringify({
  activeRole,
  availableRoles,
  userScope,
  timestamp: Date.now()
}))

// Al inicializar, cargar desde cache primero
const cached = localStorage.getItem('userContext')
if (cached) {
  const data = JSON.parse(cached)
  // Validar que no sea muy viejo (ej: <5 minutos)
  if (Date.now() - data.timestamp < 5 * 60 * 1000) {
    // Usar datos en cache mientras se valida en background
  }
}
```

### 2. Retry Logic con Exponential Backoff

Si una query falla, reintentar con delays incrementales:

```typescript
async function fetchWithRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (err) {
      if (i === maxRetries - 1) throw err
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
    }
  }
}
```

### 3. Optimizar Políticas RLS

Revisar y optimizar las políticas RLS en Supabase para que sean más eficientes.

### 4. Habilitar React Strict Mode Nuevamente

Una vez que todo funcione perfectamente, volver a habilitar Strict Mode:

```javascript
// next.config.mjs
reactStrictMode: true
```

Y asegurarse de que el código maneja correctamente las ejecuciones duplicadas.

## 📝 Resumen

| Cambio | Antes | Después |
|--------|-------|---------|
| getSession timeout | 4s | 6s |
| Safety timeout | 5s | 8s |
| React Strict Mode | Enabled | Disabled (temp) |
| Cleanup de timeouts | ❌ Incompleto | ✅ Completo |
| Prevención duplicados | ❌ No | ✅ Sí (ref) |
| Manejo timeout getSession | Recarga | Redirige a login |

## ✅ Checklist

- [x] Aumentar timeouts para primera carga
- [x] Prevenir ejecuciones duplicadas con ref
- [x] Cleanup correcto de timeouts
- [x] Deshabilitar React Strict Mode temporalmente
- [x] Mejor manejo de errores de timeout
- [ ] Probar en desarrollo
- [ ] Verificar logs en consola
- [ ] Probar con conexión lenta
- [ ] Re-habilitar Strict Mode cuando todo funcione








