/** Datos financieros según entrevista deudor/codeudor (ingresos, gastos, activos, solvencia) */
export interface FinancialInfoForm {
  activity_type?: string
  concept?: string
  income?: {
    salary?: number
    pension?: number
    crops?: number
    business?: number
    total?: number
    description?: string
  }
  expenses?: {
    personal?: number
    food?: number
    services?: number
    rent?: number
    total?: number
    description?: string
  }
  assets?: Array<{ description?: string; value?: number }>
  solvency?: {
    assets?: number
    liabilities?: number
    real_estate?: number
    debt_ratio?: number
  }
}

/** Documento adjunto en formulario (antes de subir) */
export interface ApplicantDocumentForm {
  title: string
  file?: File
}

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
  financial_info?: FinancialInfoForm | Record<string, unknown>
  references?: Array<{ name?: string; phone?: string; relationship?: string }>
  /** Documentos del deudor (título + archivo para subir) */
  documents?: ApplicantDocumentForm[]
}

export interface CreditApplicationForm {
  debtor: ApplicantForm
  amount_requested: number
  term_months: number
  destination?: string
  destination_description?: string
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
