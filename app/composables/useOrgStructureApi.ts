import type { OrgInstitutionalProcess, OrgOffice, OrgStaffListItem } from '~/types/org-structure'

export interface OrgUnitRow {
  id: number
  tenant_id: number
  org_office_id: number
  parent_id: number | null
  name: string
  code: string
  unit_type?: string | null
  is_document_producer: boolean
  manager_staff_id?: number | null
  valid_from?: string | null
  valid_to?: string | null
  is_active: boolean
  org_office?: { id: number; name: string; code: string }
  parent?: { id: number; name: string; code: string } | null
  manager_staff?: { id: number; first_name: string; first_last_name: string } | null
  institutional_processes?: OrgInstitutionalProcess[]
}

export interface OrgPositionRow {
  id: number
  tenant_id: number
  org_unit_id: number
  name: string
  code: string
  hierarchy_level: number
  has_subordinates: boolean
  reports_to_position_id: number | null
  valid_from?: string | null
  valid_to?: string | null
  is_active: boolean
  org_unit?: { id: number; name: string; code: string }
  reports_to_position?: { id: number; name: string; code: string } | null
}

/**
 * Llamadas reutilizables al módulo de estructura organizacional (catálogos para formularios y listados).
 */
export function useOrgStructureApi() {
  const { $api } = useNuxtApp()

  async function fetchOffices(opts?: { activeOnly?: boolean }): Promise<OrgOffice[]> {
    const activeOnly = opts?.activeOnly ?? false
    const res = await $api<{ data: OrgOffice[] }>('/organizational-structure/org-offices', {
      query: { per_page: 500, ...(activeOnly ? { active_only: true } : {}) },
    })
    return res.data
  }

  async function fetchUnits(opts?: { activeOnly?: boolean; orgOfficeId?: number }): Promise<OrgUnitRow[]> {
    const q: Record<string, string | number | boolean> = { per_page: 500 }
    if (opts?.activeOnly)
      q.active_only = true
    if (opts?.orgOfficeId)
      q.org_office_id = opts.orgOfficeId
    const res = await $api<{ data: OrgUnitRow[] }>('/organizational-structure/org-units', { query: q })
    return res.data
  }

  async function fetchPositions(opts?: { activeOnly?: boolean; orgUnitId?: number }): Promise<OrgPositionRow[]> {
    const q: Record<string, string | number | boolean> = { per_page: 500 }
    if (opts?.activeOnly)
      q.active_only = true
    if (opts?.orgUnitId)
      q.org_unit_id = opts.orgUnitId
    const res = await $api<{ data: OrgPositionRow[] }>('/organizational-structure/org-positions', { query: q })
    return res.data
  }

  async function fetchStaff(opts?: { activeOnly?: boolean; q?: string }): Promise<OrgStaffListItem[]> {
    const q: Record<string, string | number | boolean> = { per_page: 500 }
    if (opts?.activeOnly)
      q.active_only = true
    if (opts?.q)
      q.q = opts.q
    const res = await $api<{ data: OrgStaffListItem[] }>('/organizational-structure/org-staff', { query: q })
    return res.data
  }

  async function fetchInstitutionalProcesses(): Promise<OrgInstitutionalProcess[]> {
    const res = await $api<{ data: OrgInstitutionalProcess[] }>(
      '/organizational-structure/meta/institutional-processes',
    )
    return res.data
  }

  return {
    fetchOffices,
    fetchUnits,
    fetchPositions,
    fetchStaff,
    fetchInstitutionalProcesses,
  }
}
