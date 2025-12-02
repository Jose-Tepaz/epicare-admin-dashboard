# Test: Dropdown No Visible

## 🔍 Problema

El dropdown se abre (ves los logs) pero no ves el menú en pantalla.

## 🧪 Prueba de Depuración

### Paso 1: Inspeccionar el DOM

1. Abre DevTools (F12)
2. Ve a la pestaña **Elements**
3. Haz clic en el botón de 3 puntos
4. En Elements, busca `[data-radix-popper-content-wrapper]` o `[role="menu"]`
5. Verifica:
   - ¿Existe el elemento en el DOM?
   - ¿Tiene `display: none` o `visibility: hidden`?
   - ¿Cuál es su `z-index`?
   - ¿Cuál es su posición (`top`, `left`)?

### Paso 2: Verificar Estilos

En DevTools, busca el elemento del dropdown y revisa:

```css
/* Debería tener algo como: */
z-index: 9999;
position: fixed; /* o absolute */
top: [algún valor];
left: [algún valor];
```

### Paso 3: Prueba con Select en lugar de Dropdown

Si el dropdown sigue sin funcionar, usa un `Select` simple:

```typescript
// Reemplaza el DropdownMenu con esto:
<Select
  value={doc.status}
  onValueChange={(newStatus) => {
    console.log('Status changed to:', newStatus)
    handleUpdateStatus(doc.id, newStatus as DocumentStatus, doc)
  }}
>
  <SelectTrigger className="h-8 w-24">
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="received">Received</SelectItem>
    <SelectItem value="under_review">Under Review</SelectItem>
    <SelectItem value="approved">Approved</SelectItem>
    <SelectItem value="rejected">Rejected</SelectItem>
    <SelectItem value="expired">Expired</SelectItem>
  </SelectContent>
</Select>
```

## 🎯 Solución Temporal: Usar Select

Voy a crear una versión con `Select` que definitivamente funcionará.

