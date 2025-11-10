/**
 * Tipos TypeScript Compartidos para Epicare
 * Usar en ambos sistemas: Marketplace y Dashboard
 */

// ============================================
// TIPOS BASE DE SUPABASE
// ============================================

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User
        Insert: Omit<User, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<User, 'id' | 'created_at' | 'updated_at'>>
      }
      insurance_companies: {
        Row: InsuranceCompany
        Insert: Omit<InsuranceCompany, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<InsuranceCompany, 'id' | 'created_at' | 'updated_at'>>
      }
      applications: {
        Row: Application
        Insert: Omit<Application, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Application, 'id' | 'created_at' | 'updated_at'>>
      }
      applicants: {
        Row: Applicant
        Insert: Omit<Applicant, 'id' | 'created_at'>
        Update: Partial<Omit<Applicant, 'id' | 'created_at'>>
      }
      coverages: {
        Row: Coverage
        Insert: Omit<Coverage, 'id' | 'created_at'>
        Update: Partial<Omit<Coverage, 'id' | 'created_at'>>
      }
      beneficiaries: {
        Row: Beneficiary
        Insert: Omit<Beneficiary, 'id' | 'created_at'>
        Update: Partial<Omit<Beneficiary, 'id' | 'created_at'>>
      }
      application_payment_transactions: {
        Row: PaymentTransaction
        Insert: Omit<PaymentTransaction, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<PaymentTransaction, 'id' | 'created_at' | 'updated_at'>>
      }
      application_submission_results: {
        Row: SubmissionResult
        Insert: Omit<SubmissionResult, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<SubmissionResult, 'id' | 'created_at' | 'updated_at'>>
      }
      application_validation_errors: {
        Row: ValidationError
        Insert: Omit<ValidationError, 'id' | 'created_at'>
        Update: Partial<Omit<ValidationError, 'id' | 'created_at'>>
      }
      roles: {
        Row: Role
        Insert: Omit<Role, 'id' | 'created_at'>
        Update: Partial<Omit<Role, 'id' | 'created_at'>>
      }
      user_roles: {
        Row: UserRole
        Insert: Omit<UserRole, 'id' | 'created_at'>
        Update: Partial<Omit<UserRole, 'id' | 'created_at'>>
      }
      agents: {
        Row: Agent
        Insert: Omit<Agent, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Agent, 'id' | 'created_at' | 'updated_at'>>
      }
      application_status_history: {
        Row: ApplicationStatusHistory
        Insert: Omit<ApplicationStatusHistory, 'id' | 'created_at'>
        Update: Partial<Omit<ApplicationStatusHistory, 'id' | 'created_at'>>
      }
    }
    Enums: {
      application_status: ApplicationStatus
    }
  }
}

// ============================================
// ENUMS
// ============================================

export type ApplicationStatus = 
  | 'draft'
  | 'submitted'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'active'
  | 'cancelled'
  | 'submission_failed'

export type PaymentMethod = 
  | 'credit_card'
  | 'debit_card'
  | 'ach'
  | 'bank_account'

export type TransactionStatus = 
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'refunded'

export type PaymentFrequency = 
  | 'None'
  | 'Monthly'
  | 'SinglePayment'
  | 'Quarterly'
  | 'SemiAnnual'
  | 'Annual'
  | 'SocialSecurityMonthly'

// ============================================
// INTERFACES PRINCIPALES
// ============================================

export interface User {
  id: string
  email: string
  first_name?: string
  last_name?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  country?: string
  date_of_birth?: string
  gender?: string
  is_smoker?: boolean
  last_tobacco_use?: string
  coverage_start_date?: string
  explore_completed?: boolean
  profile_completed?: boolean
  created_at: string
  updated_at: string
}

export interface InsuranceCompany {
  id: string
  name: string
  slug: string
  description?: string
  logo_url?: string
  website?: string
  api_endpoint: string
  contact_email?: string
  supported_products?: any
  integration_status?: string
  is_active?: boolean
  created_at: string
  updated_at: string
}

export interface Application {
  id: string
  user_id: string
  company_id?: string
  agent_id?: string
  status: ApplicationStatus
  external_reference_id?: string
  carrier_name?: string
  zip_code: string
  email: string
  address1: string
  address2?: string
  city: string
  state: string
  phone: string
  alternate_phone?: string
  zip_code_plus4?: string
  enrollment_date?: string
  effective_date?: string
  enrollment_data: any
  api_response?: any
  api_error?: any
  is_multi_carrier?: boolean
  parent_application_id?: string
  payment_status?: string
  member_id?: string
  member_portal_url?: string
  attestation_status?: string
  allstate_links?: any
  created_at: string
  updated_at: string
}

export interface Applicant {
  id: string
  application_id: string
  applicant_id: string
  first_name: string
  middle_initial?: string
  last_name: string
  gender: string
  date_of_birth: string
  ssn: string
  relationship: string
  smoker: boolean
  date_last_smoked?: string
  weight?: number
  height_feet?: number
  height_inches?: number
  has_prior_coverage?: boolean
  eligible_rate_tier?: string
  quoted_rate_tier?: string
  med_supp_info?: any
  medications?: any
  question_responses?: any
  phone_numbers?: any
  created_at: string
}

export interface Coverage {
  id: string
  application_id: string
  plan_key: string
  carrier_name?: string
  effective_date: string
  monthly_premium: number
  payment_frequency: string
  term?: number
  number_of_terms?: number
  termination_date?: string
  is_automatic_loan_provision_opted_in?: boolean
  riders?: any
  discounts?: any
  agent_number?: string
  created_at: string
}

export interface Beneficiary {
  id: string
  application_id: string
  beneficiary_id: number
  first_name: string
  middle_name?: string
  last_name: string
  relationship: string
  date_of_birth: string
  allocation_percentage: number
  addresses?: any
  phone_numbers?: any
  created_at: string
}

export interface PaymentTransaction {
  id: string
  application_id: string
  company_id: string
  transaction_status: TransactionStatus
  transaction_reference?: string
  amount: number
  currency: string
  payment_method: PaymentMethod
  payment_token?: string
  payment_frequency?: PaymentFrequency
  next_payment_date?: string
  payment_schedule?: any
  payment_method_info?: {
    last4?: string
    brand?: string
    account_type?: string
  }
  processor_response?: any
  processor_error?: any
  processed_at?: string
  created_at: string
  updated_at: string
}

export interface SubmissionResult {
  id: string
  application_id: string
  plan_type?: number
  plan_key?: string
  submission_received: boolean
  policy_no?: string
  total_rate?: number
  effective_date?: string
  application_id_external?: number
  partner_application_id?: number
  submission_errors?: any[]
  created_at: string
  updated_at: string
}

export interface ValidationError {
  id: string
  application_id: string
  error_code?: string
  error_detail?: string
  created_at: string
}

export interface Role {
  id: string
  name: string
  description?: string
  created_at: string
}

export interface UserRole {
  id: string
  user_id: string
  role_id: string
  created_at: string
}

export interface Agent {
  id: string
  company_id: string
  user_id?: string
  name: string
  email?: string
  phone?: string
  agent_code: string
  external_agent_id: string
  commission_percentage?: number
  additional_data?: any
  is_active?: boolean
  created_at: string
  updated_at: string
}

export interface ApplicationStatusHistory {
  id: string
  application_id: string
  previous_status?: ApplicationStatus
  new_status: ApplicationStatus
  changed_by?: string
  notes?: string
  created_at: string
}

// ============================================
// TIPOS COMPUESTOS PARA DASHBOARD
// ============================================

export interface ApplicationWithDetails extends Application {
  applicants: Applicant[]
  coverages: Coverage[]
  beneficiaries: Beneficiary[]
  submission_results: SubmissionResult[]
  payment_transactions: PaymentTransaction[]
  validation_errors: ValidationError[]
  status_history: ApplicationStatusHistory[]
  insurance_company?: InsuranceCompany
  agent?: Agent
}

export interface DashboardStats {
  total_applications: number
  active_policies: number
  pending_applications: number
  total_monthly_premium: number
  applications_by_status: Record<ApplicationStatus, number>
}

export interface UserProfile extends User {
  roles: Role[]
  applications_count: number
  active_policies_count: number
}

// ============================================
// TIPOS PARA FORMULARIOS
// ============================================

export interface EnrollmentFormData {
  // Personal Information
  firstName: string
  middleInitial: string
  lastName: string
  gender: string
  dateOfBirth: string
  ssn: string
  relationship: string
  email: string
  phone: string
  alternatePhone: string

  // Health Information
  weight: number | string
  heightFeet: number | string
  heightInches: number | string
  smoker: boolean
  dateLastSmoked: string
  hasPriorCoverage: boolean

  // Medicare info
  hasMedicare: boolean
  medicarePartAEffectiveDate: string
  medicarePartBEffectiveDate: string
  medicareId: string
  isPreMACRAEligible: boolean

  // Address
  address1: string
  address2: string
  city: string
  state: string
  zipCode: string
  zipCodePlus4: string

  // Additional Applicants
  additionalApplicants: Applicant[]

  // Coverage
  selectedPlans: any[]
  effectiveDate: string
  paymentFrequency: string
  isEFulfillment: boolean
  isAutomaticLoanProvisionOptedIn: boolean

  // Beneficiaries
  beneficiaries: Beneficiary[]

  // Health Questions
  questionResponses: any[]
  medications: any[]

  // Payment
  paymentMethod: 'credit_card' | 'bank_account'
  accountHolderFirstName: string
  accountHolderLastName: string
  creditCardNumber: string
  expirationMonth: string
  expirationYear: string
  cvv: string
  cardBrand: string
  routingNumber: string
  accountNumber: string
  bankName: string
  accountType: 'checking' | 'savings' | ''
  desiredDraftDate: number | string
  submitWithoutPayment: boolean

  // Attestation
  agreeToTerms: boolean
  signature: string
  signatureDate: string
}

// ============================================
// TIPOS PARA APIs EXTERNAS
// ============================================

export interface AllstateApiResponse {
  links?: Record<string, { rel: string; href: string; method: string }>
  memberId?: string
  submissionResults?: Array<{
    planType: number
    submissionReceived: boolean
    submissionErrors: string[]
    policyNo: string
    totalRate: number
    effectiveDate: string
    applicationID: number
    partnerApplicationId: number
  }>
  validationErrors?: Array<{
    errorCode: string
    errorDetail: string
  }>
  memberPortalUrl?: string
  pendingAttestationCeremonies?: Array<{
    attestationCeremonyToken: string
    signee: string
  }>
  attestationStatus?: string
}

// ============================================
// TIPOS PARA CONFIGURACIÓN
// ============================================

export interface PaymentConfig {
  id: string
  company_id: string
  payment_processor: string
  payment_api_endpoint: string
  tokenization_endpoint?: string
  supports_credit_card: boolean
  supports_debit_card: boolean
  supports_ach: boolean
  credit_card_config?: {
    brands: string[]
    requires_cvv: boolean
    min_cvv_length: number
  }
  ach_config?: {
    account_types: string[]
    requires_routing: boolean
    routing_length: number
  }
  supported_payment_frequencies?: PaymentFrequency[]
  requires_tokenization: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface FieldConfig {
  id: string
  company_id: string
  field_name: string
  field_category: string
  is_required: boolean
  is_enabled: boolean
  field_type: string
  validation_rules?: any
  error_message?: string
  api_field_name?: string
  api_section?: string
  transformation_rule?: any
  display_label?: string
  display_placeholder?: string
  help_text?: string
  display_order: number
  created_at: string
  updated_at: string
}

// ============================================
// UTILIDADES DE TIPO
// ============================================

export type ApplicationStatusDisplay = {
  [K in ApplicationStatus]: {
    label: string
    color: string
    description: string
  }
}

export const APPLICATION_STATUS_DISPLAY: ApplicationStatusDisplay = {
  draft: {
    label: 'Borrador',
    color: 'gray',
    description: 'Aplicación en proceso de creación'
  },
  submitted: {
    label: 'Enviada',
    color: 'blue',
    description: 'Aplicación enviada a la aseguradora'
  },
  pending_approval: {
    label: 'Pendiente',
    color: 'yellow',
    description: 'Esperando aprobación de la aseguradora'
  },
  approved: {
    label: 'Aprobada',
    color: 'green',
    description: 'Aplicación aprobada por la aseguradora'
  },
  rejected: {
    label: 'Rechazada',
    color: 'red',
    description: 'Aplicación rechazada por la aseguradora'
  },
  active: {
    label: 'Activa',
    color: 'green',
    description: 'Póliza activa y vigente'
  },
  cancelled: {
    label: 'Cancelada',
    color: 'red',
    description: 'Aplicación cancelada'
  },
  submission_failed: {
    label: 'Error de Envío',
    color: 'red',
    description: 'Error al enviar la aplicación'
  }
}

// ============================================
// TIPOS PARA HOOKS DE REACT
// ============================================

export interface UseApplicationsReturn {
  applications: ApplicationWithDetails[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export interface UseApplicationReturn {
  application: ApplicationWithDetails | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export interface UseUserProfileReturn {
  profile: UserProfile | null
  loading: boolean
  error: string | null
  updateProfile: (data: Partial<User>) => Promise<void>
}

export interface UseDashboardStatsReturn {
  stats: DashboardStats | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}
