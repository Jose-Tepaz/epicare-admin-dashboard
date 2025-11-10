/**
 * Tipos compartidos para los componentes de detalles de request
 */

export interface ApplicationData {
  id: string
  user_id: string
  status: string
  created_at: string
  updated_at: string
  insurance_company_id?: string
  users?: UserData
  insurance_companies?: InsuranceCompanyData
  applicants?: ApplicantData[]
  coverages?: CoverageData[]
  beneficiaries?: BeneficiaryData[]
  application_submission_results?: SubmissionResultData[]
  [key: string]: any
}

export interface UserData {
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
}

export interface InsuranceCompanyData {
  id: string
  name: string
  slug: string
}

export interface ApplicantData {
  id: string
  applicant_id: string
  first_name: string
  middle_initial?: string
  last_name: string
  date_of_birth: string
  gender: string
  ssn: string
  relationship: string
  smoker: boolean
  date_last_smoked?: string
  weight?: number
  height_feet?: number
  height_inches?: number
  phone_numbers?: any
}

export interface CoverageData {
  id: string
  plan_key: string
  carrier_name?: string
  effective_date: string
  monthly_premium: number
  payment_frequency: string
}

export interface BeneficiaryData {
  id: string
  first_name: string
  middle_name?: string
  last_name: string
  relationship: string
  date_of_birth: string
  allocation_percentage: number
}

export interface SubmissionResultData {
  id: string
  plan_key?: string
  submission_received: boolean
  policy_no?: string
  total_rate?: number
  effective_date?: string
  submission_errors?: any[]
  created_at: string
}

export interface AdminPermissions {
  canViewSensitiveData: boolean
  canEditApplications: boolean
  canDeleteApplications: boolean
  canViewApplications?: boolean
  canViewUsers?: boolean
  canEditUsers?: boolean
  canDeleteUsers?: boolean
  canManageRoles?: boolean
  [key: string]: boolean | undefined
}

