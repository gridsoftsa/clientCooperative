/** Plantilla de actividad económica (agro) guardada en financial_info */
export interface ActivityTemplateData {
  sector: string
  template: string
  product?: string | null
  data: Record<string, unknown>
}

/** Datos financieros según entrevista deudor/codeudor (ingresos, gastos, activos, solvencia) */
export interface FinancialInfoForm {
  /** Plantillas de actividad económica agropecuaria (puede haber varias) */
  activity_templates?: ActivityTemplateData[]
  /** Cantidad de plantillas (se guarda explícitamente en radicación) */
  activity_templates_count?: number
  activity_type?: string
  concept?: string
  income?: {
    salary?: number
    pension?: number
    crops?: number
    business?: number
    rental?: number
    other?: number
    total?: number
    description?: string
  }
  expenses?: {
    personal?: number
    food?: number
    services?: number
    rent?: number
    health?: number
    pension?: number
    arl?: number
    other?: number
    total?: number
    description?: string
  }
  /** Activos reportados por el deudor (nombre, valor, matrícula inmobiliaria, garantía) */
  assets?: Array<{
    name?: string
    value?: number
    matricula_inmobiliaria?: string
    /** Si es garantía, su valor suma en Bien raíz */
    garantia?: boolean
  }>
  solvency?: {
    /** (Pasivos + monto solicitado) ÷ Activos × 100 — se calcula en resumen */
    solvency?: number
    /** (Pasivos + monto solicitado) ÷ Bien raíz × 100 — se calcula en resumen */
    endeudamiento?: number
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
  /** Municipio/ciudad de residencia (texto, igual que expedition_place) */
  residence_city_name?: string
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
  /**
   * Plantillas agropecuarias descritas en el paso “Datos de la solicitud”, solo informativas.
   * No se sincronizan con ingresos del deudor (eso queda en paso 2).
   */
  destination_activity_templates?: ActivityTemplateData[]
  agency_id: number
  status: 'Draft' | 'Submitted'
  co_debtors: ApplicantForm[]
  /** Número de radicado externo (sistema externo, ej. Finagro) - obligatorio */
  numero_radicado_externo: string
}

/** Normaliza lista de plantillas desde API (JSON string o arreglo). */
export function parseActivityTemplateList(val: unknown): ActivityTemplateData[] {
  let raw: unknown = val
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw)
    } catch {
      return []
    }
  }
  if (!Array.isArray(raw)) {
    return []
  }
  return raw.filter(
    (t): t is ActivityTemplateData =>
      Boolean(t && typeof t === 'object' && 'sector' in t && 'template' in t && 'data' in t),
  )
}

export const emptyApplicant = (): ApplicantForm => ({
  document_type: 'CC',
  document_number: '',
  first_name: '',
  first_last_name: '',
  dependents: 0,
})
