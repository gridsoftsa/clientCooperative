/** Categorías de adjuntos en el expediente (alineadas con API `CreditApplicationDocumentationVault`). */
export const DOCUMENTATION_VAULT_CATEGORY_KEYS = [
  'generated',
  'auxiliary',
  'fng',
  'insurability',
  'approver_entity',
  'lifecycle',
] as const

export type DocumentationVaultCategoryKey = typeof DOCUMENTATION_VAULT_CATEGORY_KEYS[number]

export const DOCUMENTATION_VAULT_CATEGORY_FILTER_OPTIONS: Array<{ value: 'all' | DocumentationVaultCategoryKey, label: string }> = [
  { value: 'all', label: 'Todas las categorías' },
  { value: 'generated', label: 'PDFs generados' },
  { value: 'auxiliary', label: 'Actividad económica (auxiliar)' },
  { value: 'fng', label: 'FNG' },
  { value: 'insurability', label: 'Asegurabilidad' },
  { value: 'approver_entity', label: 'Ente aprobador' },
  { value: 'lifecycle', label: 'Ciclo de vida' },
]

export interface DocumentationVaultListRow {
  id: number
  code: string | null
  status: string
  numero_radicado_externo: string | null
  created_at: string | null
  credito_garantia_fng: boolean
  documentation_insurability_required: boolean | null
  documents_count: number
  debtor_summary?: {
    applicant_id?: number
    full_name?: string | null
    document_type?: string
    document_number?: string
  } | null
  adviser?: { id: number, name: string } | null
  sucursal?: { id: number, name: string, code?: string } | null
}

export interface DocumentationVaultFileItem {
  id: number | null
  kind?: 'stored_file' | 'generated_pdf'
  generated_key?: string | null
  available?: boolean
  description?: string | null
  api_path?: string | null
  applicant_id: number | null
  participant_role: 'debtor' | 'co_debtor'
  category: DocumentationVaultCategoryKey
  checklist_key: string | null
  checklist_label: string | null
  title: string | null
  original_name: string | null
  mime_type: string | null
  is_reviewed: boolean
  review_comment: string | null
  reviewed_at: string | null
  created_at: string | null
  download_url: string
}

export interface DocumentationVaultGeneratedDoc {
  key: string
  label: string
  description: string
  mime_type: string
  available: boolean
  download_permission: string
  suggested_filename: string
  api_path?: string
  download_url?: string
}

export interface DocumentationVaultCategoryBlock {
  key: DocumentationVaultCategoryKey
  label: string
  description: string
  items: DocumentationVaultFileItem[]
}

export interface DocumentationVaultPayload {
  credit_application_id: number
  code: string | null
  status: string
  numero_radicado_externo: string | null
  credito_garantia_fng: boolean
  documentation_insurability_required: boolean | null
  created_at: string | null
  debtor_summary: DocumentationVaultListRow['debtor_summary']
  generated_documents: DocumentationVaultGeneratedDoc[]
  categories: Record<string, DocumentationVaultCategoryBlock>
  totals: Record<string, number>
}

export const DOCUMENTATION_VAULT_CATEGORY_ORDER: DocumentationVaultCategoryKey[] = [
  'generated',
  'auxiliary',
  'fng',
  'insurability',
  'approver_entity',
  'lifecycle',
]
