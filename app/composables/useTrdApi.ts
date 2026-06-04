import { normalizeTrdVersionShowResponse } from '~/utils/archival-trd-version'
import type {
  CatalogTreeSeries,
  TrdRetentionRuleRow,
  TrdTableRow,
  TrdVersionRow,
  TrdActiveVersionConsultData,
  TrdVersionShowResponse,
} from '~/types/archival-trd'

export function useTrdApi() {
  const { $api } = useNuxtApp()

  async function fetchTables(perPage = 100): Promise<TrdTableRow[]> {
    const res = await $api<{ data: TrdTableRow[] }>('/archival/trd-tables', { query: { per_page: perPage } })

    return res.data
  }

  async function fetchTable(id: number): Promise<TrdTableRow> {
    const res = await $api<{ data: TrdTableRow }>(`/archival/trd-tables/${id}`)

    return res.data
  }

  async function fetchVersions(tableId: number): Promise<TrdVersionRow[]> {
    const res = await $api<{ data: TrdVersionRow[] }>(`/archival/trd-tables/${tableId}/versions`)

    return res.data
  }

  async function fetchVersion(tableId: number, versionId: number): Promise<TrdVersionShowResponse> {
    const res = await $api<TrdVersionShowResponse>(`/archival/trd-tables/${tableId}/versions/${versionId}`)

    return normalizeTrdVersionShowResponse(res)
  }

  async function fetchCatalogTree(orgUnitId: number, activeOnly = true): Promise<CatalogTreeSeries[]> {
    const res = await $api<{ data: CatalogTreeSeries[] }>('/archival/catalog/tree', {
      query: {
        org_unit_id: orgUnitId,
        active_only: activeOnly ? 1 : 0,
      },
    })

    return res.data
  }

  async function fetchActiveVersion(orgUnitId: number) {
    return await $api<{
      data: TrdActiveVersionConsultData | null
      message?: string
    }>('/archival/trd-tables/active-version', { query: { org_unit_id: orgUnitId } })
  }

  function tablePath(tableId: number): string {
    return `/settings/archival/trd/${tableId}`
  }

  function versionPath(tableId: number, versionId: number): string {
    return `/settings/archival/trd/${tableId}/versions/${versionId}`
  }

  function versionCreatePath(tableId: number): string {
    return `/settings/archival/trd/${tableId}/versions/create`
  }

  return {
    fetchTables,
    fetchTable,
    fetchVersions,
    fetchVersion,
    fetchCatalogTree,
    fetchActiveVersion,
    tablePath,
    versionPath,
    versionCreatePath,
  }
}

export type { TrdRetentionRuleRow }
