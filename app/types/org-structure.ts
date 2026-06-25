/** Tipos API: estructura organizacional. */

export type OrgOfficeType = 'main' | 'branch' | 'headquarters'

export interface OrgOffice {
  id: number
  sucursal_id?: number | null
  name: string
  code: string
  office_type: OrgOfficeType
  city?: string | null
  address?: string | null
  phone?: string | null
  state?: string | null
  responsible_staff_id?: number | null
  valid_from?: string | null
  valid_to?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  responsible_staff?: { id: number; first_name: string; first_last_name: string } | null
}

export interface OrgInstitutionalProcess {
  id: number
  code: string
  label: string
  sort_order: number
}

export interface OrgStructureValidation {
  ok: boolean
  critical: Array<{ code: string; message: string }>
  warnings: Array<{ code: string; message: string }>
}

export interface OrgStaffListItem {
  id: number
  first_name: string
  second_name?: string | null
  first_last_name: string
  second_last_name?: string | null
  full_name?: string
  email?: string | null
  phone?: string | null
  extension?: string | null
  document_type?: string | null
  document_number?: string | null
  user_id?: number | null
  is_active: boolean
  created_at?: string
  updated_at?: string
  user?: { id: number; name: string; email: string } | null
  current_assignment?: {
    effective_from?: string | null
    effective_to?: string | null
    org_office?: { id: number; name: string; code: string } | null
    org_unit?: { id: number; name: string; code: string } | null
    org_position?: { id: number; name: string; code: string } | null
    immediate_supervisor_staff?: { id: number; first_name: string; first_last_name: string } | null
  } | null
}
