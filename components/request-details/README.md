# Request Details Components

Componentes modulares para la página de detalles de requests/applications.

## Estructura

```
request-details/
├── index.ts                      # Barrel export
├── types.ts                      # Tipos compartidos
├── constants.ts                  # Constantes (statusConfig, etc.)
├── user-information-card.tsx     # Información del usuario
├── insurance-company-card.tsx    # Información de la aseguradora
├── applicants-card.tsx           # Miembros de la aplicación
├── coverages-card.tsx            # Coberturas contratadas
├── beneficiaries-card.tsx        # Beneficiarios
├── status-update-card.tsx        # Actualización de estado
├── submission-results-card.tsx   # Historial de envíos
└── metadata-card.tsx             # Información adicional
```

## Uso

```tsx
import {
  UserInformationCard,
  InsuranceCompanyCard,
  ApplicantsCard,
  CoveragesCard,
  BeneficiariesCard,
  StatusUpdateCard,
  SubmissionResultsCard,
  MetadataCard,
  statusConfig,
} from "@/components/request-details"

// En tu página:
<UserInformationCard application={application} />
<ApplicantsCard applicants={application.applicants || []} permissions={permissions} />
// etc.
```

## Componentes

### UserInformationCard
Muestra la información del usuario asociado a la aplicación.
- Nombre, email, teléfono
- Fecha de nacimiento, género
- Dirección completa
- Fecha de solicitud

### InsuranceCompanyCard
Muestra la aseguradora asociada a la aplicación.

### ApplicantsCard
Muestra todos los miembros/aplicantes de la aplicación.
- Información personal (nombre, fecha de nacimiento, género)
- SSN (con enmascaramiento según permisos)
- Datos físicos (peso, altura)
- Estado de fumador

### CoveragesCard
Muestra las coberturas contratadas.
- Plan, carrier
- Fecha efectiva
- Prima mensual y frecuencia de pago

### BeneficiariesCard
Muestra los beneficiarios designados.
- Nombre completo
- Relación
- Porcentaje de asignación
- Fecha de nacimiento

### StatusUpdateCard
Permite actualizar el estado de la aplicación (solo si el usuario tiene permisos).
- Selector de nuevo estado
- Botón de actualización
- Estados disponibles según permisos

### SubmissionResultsCard
Muestra el historial de envíos a carriers.
- Plan, estado de recepción
- Número de póliza
- Fecha efectiva
- Errores de envío

### MetadataCard
Muestra información de auditoría.
- Fecha de creación
- Última actualización

## Tipos

Todos los tipos están definidos en `types.ts`:
- `ApplicationData`
- `UserData`
- `ApplicantData`
- `CoverageData`
- `BeneficiaryData`
- `SubmissionResultData`
- `AdminPermissions`

## Constantes

En `constants.ts`:
- `statusConfig`: Configuración de colores e iconos para cada estado
- `relationshipLabels`: Etiquetas en español para los tipos de relación

