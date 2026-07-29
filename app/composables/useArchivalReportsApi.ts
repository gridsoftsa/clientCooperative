export interface ArchivalReportPayload {
  filters: Record<string, unknown>
  rows: Array<Record<string, unknown>>
}

/** Laravel `boolean` rule accepts 0/1 in query strings, not literal "true"/"false". */
function queryFlag(value: boolean | undefined): 0 | 1 | undefined {
  if (value === undefined) {
    return undefined
  }

  return value ? 1 : 0
}

export function useArchivalReportsApi() {
  const { $api } = useNuxtApp()
  const { downloadReportFile } = useReportExport()

  async function fetchCatalogReport(query: {
    level?: 'series' | 'subseries' | 'document_type'
    active_only?: boolean
  }): Promise<ArchivalReportPayload> {
    const { active_only, ...rest } = query
    const flag = queryFlag(active_only)
    const res = await $api<{ data: ArchivalReportPayload }>('/archival/reports/catalog', {
      query: {
        ...rest,
        ...(flag !== undefined ? { active_only: flag } : {}),
      },
    })
    return res.data
  }

  async function fetchTrdVersionsReport(query: {
    org_unit_id?: number | null
    status?: string | null
    approved_from?: string | null
    approved_to?: string | null
  }): Promise<ArchivalReportPayload> {
    const res = await $api<{ data: ArchivalReportPayload }>('/archival/reports/trd-versions', { query })
    return res.data
  }

  async function fetchCatalogUsageReport(query: {
    org_unit_id?: number | null
    version_status?: string | null
    active_catalog_only?: boolean
  }): Promise<ArchivalReportPayload> {
    const { active_catalog_only, ...rest } = query
    const flag = queryFlag(active_catalog_only)
    const res = await $api<{ data: ArchivalReportPayload }>('/archival/reports/catalog-usage', {
      query: {
        ...rest,
        ...(flag !== undefined ? { active_catalog_only: flag } : {}),
      },
    })
    return res.data
  }

  function withQueryFlags(
    query: Record<string, string | number | boolean | null | undefined>,
  ): Record<string, string | number | null | undefined> {
    const out: Record<string, string | number | null | undefined> = { ...query }
    if (typeof out.active_only === 'boolean') {
      out.active_only = queryFlag(out.active_only)
    }
    if (typeof out.active_catalog_only === 'boolean') {
      out.active_catalog_only = queryFlag(out.active_catalog_only)
    }

    return out
  }

  function exportCatalog(
    query: Record<string, string | number | boolean | null | undefined>,
    format: 'xlsx' | 'pdf',
  ): Promise<void> {
    const filename = format === 'xlsx' ? 'reporte-catalogo-documental.xlsx' : 'reporte-catalogo-documental.pdf'
    const mime = format === 'xlsx'
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'application/pdf'

    return downloadReportFile('/archival/reports/catalog/export', { ...withQueryFlags(query), format }, filename, mime)
  }

  function exportTrdVersions(
    query: Record<string, string | number | null | undefined>,
    format: 'xlsx' | 'pdf',
  ): Promise<void> {
    const filename = format === 'xlsx' ? 'reporte-versiones-trd.xlsx' : 'reporte-versiones-trd.pdf'
    const mime = format === 'xlsx'
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'application/pdf'

    return downloadReportFile('/archival/reports/trd-versions/export', { ...query, format }, filename, mime)
  }

  function exportCatalogUsage(
    query: Record<string, string | number | boolean | null | undefined>,
    format: 'xlsx' | 'pdf',
  ): Promise<void> {
    const filename = format === 'xlsx' ? 'reporte-uso-catalogo-trd.xlsx' : 'reporte-uso-catalogo-trd.pdf'
    const mime = format === 'xlsx'
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'application/pdf'

    return downloadReportFile('/archival/reports/catalog-usage/export', { ...withQueryFlags(query), format }, filename, mime)
  }

  return {
    fetchCatalogReport,
    fetchTrdVersionsReport,
    fetchCatalogUsageReport,
    exportCatalog,
    exportTrdVersions,
    exportCatalogUsage,
  }
}
