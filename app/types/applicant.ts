export interface Applicant {
  id: number
  document_type: string
  document_number: string
  expedition_date?: string | null
  expedition_place?: string | null
  first_name: string
  second_name?: string | null
  first_last_name: string
  second_last_name?: string | null
  full_name: string
  birth_date?: string | null
  gender?: string | null
  marital_status?: string | null
  dependents?: number
  mobile_phone?: string | null
  landline?: string | null
  email?: string | null
  residence_address?: string | null
  residence_city_name?: string | null
  residence_city_id?: number | null
  residence_city?: { id: number; name: string; department?: string } | null
  residence_type?: string | null
  time_in_residence?: string | null
  occupation?: string | null
  company_name?: string | null
  position?: string | null
  contract_type?: string | null
  time_in_job?: string | null
  /**
   * Fragmento del último `financial_info` en radicación (p. ej. activity_type).
   * No incluye ingresos/gastos completos.
   */
  financial_info?: { activity_type?: string | null } | null
  created_at: string
  updated_at: string
  /** Tipo de última participación: 'deudor' | 'codeudor' | null */
  last_participation_type?: 'deudor' | 'codeudor' | null
  /** Fecha de la última solicitud (como deudor o codeudor) */
  last_application_date?: string | null
}

export interface PaginatedApplicants {
  data: Applicant[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}
