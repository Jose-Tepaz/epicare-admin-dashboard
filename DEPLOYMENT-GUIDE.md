# 🚀 Guía de Deployment - Sistema de Roles

## 📋 Checklist Pre-Deployment

### 1. Base de Datos (Supabase)

#### Ejecutar Scripts SQL en Orden:
```bash
# 1. Dashboard y métricas
sql/policies/01-dashboard-policies.sql

# 2. Gestión de usuarios
sql/policies/02-users-policies.sql

# 3. Applications/Requests
sql/policies/03-applications-policies.sql

# 4. Documents
sql/policies/04-documents-policies.sql

# 5. Support Tickets
sql/policies/05-tickets-policies.sql
```

#### Verificación Post-SQL:
```sql
-- Verificar que todas las funciones existen
SELECT proname FROM pg_proc WHERE proname LIKE '%transition%' OR proname LIKE '%document%' OR proname LIKE '%ticket%';

-- Verificar políticas RLS
SELECT tablename, policyname FROM pg_policies WHERE tablename IN ('users', 'applications', 'documents', 'support_tickets');

-- Verificar triggers
SELECT tgname, tgrelid::regclass FROM pg_trigger WHERE tgname LIKE '%validate%' OR tgname LIKE '%auto%';
```

### 2. Variables de Entorno

Ya configuradas, verificar que existan:
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Otras variables existentes
ALLSTATE_API_URL_RATE_CART=...
ALLSTATE_AUTH_TOKEN=...
NEXT_PUBLIC_AGENT_NUMBER=...
```

### 3. Dependencias

No se requieren nuevas dependencias. Todo usa:
- ✅ Supabase client (ya instalado)
- ✅ Next.js 14 (ya configurado)
- ✅ TypeScript (ya configurado)

### 4. Build y Test

```bash
# 1. Limpiar y rebuild
npm run build

# 2. Verificar tipos TypeScript
npx tsc --noEmit

# 3. Ejecutar en dev para testing
npm run dev
```

## 🧪 Testing Manual

### Test 1: Verificar Roles y Permisos

```typescript
// En consola del navegador o test script
import { getUserRoles, checkUserRole } from '@/lib/utils/permissions'

// Test 1: Obtener rol de usuario
const roles = await getUserRoles('<user_id>')
console.log('User roles:', roles) // Debe retornar ['agent'] o ['admin'], etc.

// Test 2: Verificar permisos
const canDelete = await checkUserRole('<user_id>', ['super_admin', 'admin'])
console.log('Can delete:', canDelete)
```

### Test 2: Transiciones de Estado (Applications)

```sql
-- En Supabase SQL Editor
-- Test como agent
SELECT can_transition_application_status('draft', 'submitted', 'agent'); -- TRUE
SELECT can_transition_application_status('approved', 'draft', 'agent');   -- FALSE

-- Obtener transiciones permitidas
SELECT get_allowed_status_transitions('<app_id>', '<agent_user_id>');
-- Debe retornar: ['submitted', 'cancelled'] si está en draft
```

### Test 3: Scope de Support Staff

```sql
-- Crear support_staff con scope agent_specific
-- El trigger auto_assign_support_staff_scope debe asignar el scope

-- Verificar que solo ve datos del agent asignado
-- Loguearse como support_staff y verificar métricas del dashboard
```

### Test 4: Documents Versioning

```sql
-- Test reemplazo de documento
SELECT replace_document(
  '<old_doc_id>',
  'https://new-url.com/doc.pdf',
  'documento_v2.pdf',
  '<user_id>',
  'Actualización de información'
);

-- Verificar historial
SELECT * FROM get_document_version_history('<new_doc_id>');
-- Debe mostrar ambas versiones
```

### Test 5: Tickets y Notas Internas

```sql
-- Crear nota interna
SELECT add_ticket_internal_note('<ticket_id>', 'Nota privada', '<staff_id>');

-- Verificar que agent NO puede ver notas internas
-- Loguearse como agent y consultar ticket_notes
```

## 🔍 Monitoreo Post-Deployment

### Queries Útiles de Monitoreo

```sql
-- 1. Ver actividad reciente
SELECT * FROM admin_activity_logs
ORDER BY created_at DESC
LIMIT 50;

-- 2. Ver transiciones de estado de applications
SELECT 
  id,
  email,
  status,
  status_changed_by,
  status_changed_at
FROM applications
WHERE status_changed_at > NOW() - INTERVAL '24 hours'
ORDER BY status_changed_at DESC;

-- 3. Ver documents por estado
SELECT 
  status,
  COUNT(*) as total,
  COUNT(DISTINCT client_id) as clients
FROM documents
GROUP BY status;

-- 4. Ver tickets por estado y asignación
SELECT 
  status,
  COUNT(*) as total,
  COUNT(assigned_to) as assigned
FROM support_tickets
GROUP BY status;

-- 5. Ver usuarios por rol
SELECT 
  role,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE is_active = true) as active
FROM users
GROUP BY role;
```

### Métricas de Performance

```sql
-- Ver queries lentas (requiere pg_stat_statements)
SELECT 
  query,
  calls,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
WHERE query LIKE '%applications%' OR query LIKE '%documents%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

## 🚨 Troubleshooting

### Problema 1: "User does not have permission"

**Causa:** RLS policies no aplicadas o usuario sin rol correcto

**Solución:**
```sql
-- Verificar que el usuario tiene rol
SELECT id, email, role FROM users WHERE id = '<user_id>';

-- Verificar policies activas
SELECT * FROM pg_policies WHERE tablename = '<tabla>';

-- Probar policy manualmente
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claim.sub TO '<user_id>';
SELECT * FROM applications; -- Debe filtrar automáticamente
```

### Problema 2: "Cannot transition from X to Y"

**Causa:** Transición no permitida para ese rol

**Solución:**
```sql
-- Ver transiciones permitidas
SELECT get_allowed_status_transitions('<entity_id>', '<user_id>');

-- Verificar rol del usuario
SELECT role FROM users WHERE id = '<user_id>';
```

### Problema 3: Support Staff no ve scope correcto

**Causa:** Trigger no ejecutado o scope no asignado

**Solución:**
```sql
-- Ver scope actual
SELECT id, email, role, scope, assigned_to_agent_id 
FROM users 
WHERE role = 'support_staff';

-- Actualizar manualmente si es necesario
UPDATE users
SET 
  scope = 'agent_specific',
  assigned_to_agent_id = '<agent_id>'
WHERE id = '<support_staff_id>';
```

### Problema 4: Notas internas visibles para agent

**Causa:** Policy de ticket_notes no aplicada

**Solución:**
```sql
-- Verificar policy
SELECT * FROM pg_policies WHERE tablename = 'ticket_notes';

-- Re-crear policy si es necesario
-- (copiar del archivo 05-tickets-policies.sql)
```

## 📊 Performance Tips

### 1. Índices Críticos

Ya creados en los scripts SQL, verificar que existan:

```sql
-- Applications
CREATE INDEX IF NOT EXISTS idx_applications_agent_status ON applications(agent_id, status);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);

-- Documents
CREATE INDEX IF NOT EXISTS idx_documents_client_status ON documents(client_id, status);

-- Tickets
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON support_tickets(status);

-- Users
CREATE INDEX IF NOT EXISTS idx_users_agent_id ON users(agent_id);
CREATE INDEX IF NOT EXISTS idx_users_role_active ON users(role, is_active);
```

### 2. Optimización de Queries

```typescript
// ✅ BUENO: Usar select específico
const { data } = await supabase
  .from('applications')
  .select('id, status, email')
  .eq('status', 'pending_review')

// ❌ MALO: Select * innecesario
const { data } = await supabase
  .from('applications')
  .select('*')
```

## 🔐 Seguridad Final

### Checklist de Seguridad:

- ✅ RLS habilitado en todas las tablas
- ✅ Políticas para SELECT, INSERT, UPDATE, DELETE
- ✅ Triggers de validación activos
- ✅ Audit logging configurado
- ✅ Variables de entorno seguras
- ✅ Service Role Key NUNCA expuesta al cliente
- ✅ Middleware protegiendo rutas admin

### Verificación de Seguridad:

```sql
-- Verificar que RLS está habilitado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'applications', 'documents', 'support_tickets');
-- Todos deben tener rowsecurity = true
```

## ✅ Deployment Checklist Final

- [ ] Scripts SQL ejecutados en orden
- [ ] Funciones SQL verificadas
- [ ] Policies RLS activas
- [ ] Triggers funcionando
- [ ] Variables de entorno configuradas
- [ ] Build exitoso sin errores
- [ ] Tests manuales pasados
- [ ] Métricas de dashboard filtradas correctamente
- [ ] Transiciones de estado validadas
- [ ] Documentación revisada
- [ ] Backup de BD realizado
- [ ] Monitoreo configurado

## 🎉 Go Live!

Una vez completado el checklist:

1. **Staging:** Deploy en ambiente de staging primero
2. **Test completo:** Probar todos los flujos con usuarios reales
3. **Monitoreo:** Verificar logs y métricas 24h
4. **Production:** Deploy a producción
5. **Comunicación:** Notificar al equipo de cambios

## 📞 Soporte

Si encuentras problemas:
1. Revisar logs de Supabase
2. Verificar audit_logs tabla
3. Consultar esta guía de troubleshooting
4. Revisar documentación en RBAC-IMPLEMENTATION-COMPLETE.md

