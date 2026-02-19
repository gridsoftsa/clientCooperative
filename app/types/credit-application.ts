export interface ApplicantForm {
  document_type: string
  document_number: string
  expedition_date?: string
  expedition_place?: string
  first_name: string
  second_name?: string
  first_last_name: string
  second_last_name?: string
  birth_date?: string
  gender?: string
  marital_status?: string
  dependents?: number
  mobile_phone?: string
  landline?: string
  email?: string
  residence_address?: string
  residence_city_id?: number
  residence_type?: string
  time_in_residence?: string
  occupation?: string
  company_name?: string
  position?: string
  contract_type?: string
  time_in_job?: string
  financial_info?: Record<string, unknown>
  references?: Array<{ name?: string; phone?: string; relationship?: string }>
}

export interface CreditApplicationForm {
  debtor: ApplicantForm
  amount_requested: number
  term_months: number
  destination?: string
  agency_id: number
  status: 'Draft' | 'Submitted'
  co_debtors: ApplicantForm[]
}

export const emptyApplicant = (): ApplicantForm => ({
  document_type: 'CC',
  document_number: '',
  first_name: '',
  first_last_name: '',
  dependents: 0,
})
