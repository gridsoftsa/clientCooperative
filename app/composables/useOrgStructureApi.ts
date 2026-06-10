import type { OrgInstitutionalProcess, OrgOffice, OrgStaffListItem } from '~/types/org-structure'

export interface OrgUnitRow {
  id: number
  org_office_id: number
  parent_id: number | null
  name: string
  code: string
  unit_type?: string | null
  is_document_producer: boolean
  manager_staff_id?: number | null
  /** Nombre del cargo de referencia para jefe de área (p. ej. sincronizado al crear un cargo «a cargo del área»). */
  manager_position_name?: string | null
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
  org_unit_id: number
  name: string
  code: string
  hierarchy_level: number
  has_subordinates: boolean
  reports_to_position_id: number | null
  valid_from?: string | null
  valid_to?: string | null
  is_active: boolean
  org_unit?: { id: number; name: string; code: string; manager_position_name?: string | null }
  reports_to_position?: { id: number; name: string; code: string; org_unit_id?: number } | null
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

  async function fetchPositions(opts?: {
    activeOnly?: boolean
    orgUnitId?: number
    managerOfOrgUnitOnly?: boolean
  }): Promise<OrgPositionRow[]> {
    const q: Record<string, string | number | boolean> = { per_page: 500 }
    if (opts?.activeOnly)
      q.active_only = true
    if (opts?.orgUnitId)
      q.org_unit_id = opts.orgUnitId
    if (opts?.managerOfOrgUnitOnly)
      q.manager_of_org_unit_only = true
    const res = await $api<{ data: OrgPositionRow[] }>('/organizational-structure/org-positions', { query: q })
    return res.data
  }

  async function fetchStaff(opts?: { activeOnly?: boolean; q?: string; orgUnitIds?: number[]; orgPositionIds?: number[] }): Promise<OrgStaffListItem[]> {
    const qs = new URLSearchParams()
    qs.set('per_page', '500')
    if (opts?.activeOnly) {
      qs.set('active_only', 'true')
    }
    if (opts?.q) {
      qs.set('q', opts.q)
    }
    if (opts?.orgUnitIds?.length) {
      for (const id of opts.orgUnitIds) {
        qs.append('org_unit_ids[]', String(id))
      }
    }
    if (opts?.orgPositionIds?.length) {
      for (const id of opts.orgPositionIds) {
        qs.append('org_position_ids[]', String(id))
      }
    }
    const query = qs.toString()
    const res = await $api<{ data: OrgStaffListItem[] }>(
      `/organizational-structure/org-staff${query ? `?${query}` : ''}`,
    )
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
