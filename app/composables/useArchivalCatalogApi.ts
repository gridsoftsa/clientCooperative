import type {
  ArchivalCatalogListResponse,
  DocDocumentTypeRow,
  DocSeriesRow,
  DocSubseriesRow,
} from '~/types/archival-catalog'

export function useArchivalCatalogApi() {
  const { $api } = useNuxtApp()

  async function fetchSeries(perPage = 200, orgUnitId?: number): Promise<DocSeriesRow[]> {
    const res = await $api<ArchivalCatalogListResponse<DocSeriesRow>>('/archival/catalog/series', {
      query: {
        per_page: perPage,
        ...(orgUnitId != null ? { org_unit_id: orgUnitId } : {}),
      },
    })

    return res.data
  }

  async function fetchSeriesById(id: number): Promise<DocSeriesRow> {
    const res = await $api<{ data: DocSeriesRow }>(`/archival/catalog/series/${id}`)

    return res.data
  }

  async function fetchSubseries(docSeriesId: number, perPage = 200): Promise<DocSubseriesRow[]> {
    const res = await $api<ArchivalCatalogListResponse<DocSubseriesRow>>('/archival/catalog/subseries', {
      query: { doc_series_id: docSeriesId, per_page: perPage },
    })

    return res.data
  }

  async function fetchSubseriesById(id: number): Promise<DocSubseriesRow> {
    const res = await $api<{ data: DocSubseriesRow }>(`/archival/catalog/subseries/${id}`)

    return res.data
  }

  async function fetchDocumentTypes(docSubseriesId: number, perPage = 200): Promise<DocDocumentTypeRow[]> {
    const res = await $api<ArchivalCatalogListResponse<DocDocumentTypeRow>>('/archival/catalog/document-types', {
      query: { doc_subseries_id: docSubseriesId, per_page: perPage },
    })

    return res.data
  }

  function subseriesListPath(seriesId: number): string {
    return `/settings/archival/catalog/series/${seriesId}/subseries`
  }

  function subseriesCreatePath(seriesId: number): string {
    return `/settings/archival/catalog/series/${seriesId}/subseries/create`
  }

  function documentTypesListPath(seriesId: number, subseriesId: number): string {
    return `/settings/archival/catalog/series/${seriesId}/subseries/${subseriesId}/document-types`
  }

  function documentTypesCreatePath(seriesId: number, subseriesId: number): string {
    return `/settings/archival/catalog/series/${seriesId}/subseries/${subseriesId}/document-types/create`
  }

  return {
    fetchSeries,
    fetchSeriesById,
    fetchSubseries,
    fetchSubseriesById,
    fetchDocumentTypes,
    subseriesListPath,
    subseriesCreatePath,
    documentTypesListPath,
    documentTypesCreatePath,
  }
}
