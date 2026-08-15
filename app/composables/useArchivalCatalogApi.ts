import type {
  ArchivalCatalogListResponse,
  DocDocumentTypeRow,
  DocSeriesRow,
  DocSubseriesRow,
} from '~/types/archival-catalog'
import { isTrdVersionReturnPath } from '~/utils/archival-trd-navigation'
import type { RouteLocationNormalizedLoaded } from 'vue-router'

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

  async function fetchDocumentTypeById(id: number): Promise<DocDocumentTypeRow> {
    const res = await $api<{ data: DocDocumentTypeRow }>(`/archival/catalog/document-types/${id}`)

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

  function documentTypesCreatePath(seriesId: number, subseriesId: number, returnTo?: string | null): string {
    return withReturnTo(
      `/settings/archival/catalog/series/${seriesId}/subseries/${subseriesId}/document-types/create`,
      returnTo,
    )
  }

  function subseriesEditPath(seriesId: number, subseriesId: number, returnTo?: string | null): string {
    return withReturnTo(
      `/settings/archival/catalog/series/${seriesId}/subseries/${subseriesId}/edit`,
      returnTo,
    )
  }

  function documentTypeEditPath(
    seriesId: number,
    subseriesId: number,
    typeId: number,
    returnTo?: string | null,
  ): string {
    return withReturnTo(
      `/settings/archival/catalog/series/${seriesId}/subseries/${subseriesId}/document-types/${typeId}/edit`,
      returnTo,
    )
  }

  function withReturnTo(path: string, returnTo?: string | null): string {
    if (!returnTo) {
      return path
    }

    return `${path}?return_to=${encodeURIComponent(returnTo)}`
  }

  function returnToPath(route: RouteLocationNormalizedLoaded): string | null {
    const raw = route.query.return_to

    return typeof raw === 'string' && raw.startsWith('/') ? raw : null
  }

  async function navigateAfterCatalogSave(
    router: ReturnType<typeof useRouter>,
    route: RouteLocationNormalizedLoaded,
    defaultPath: string,
  ): Promise<void> {
    const returnTo = returnToPath(route)

    if (returnTo && isTrdVersionReturnPath(returnTo)) {
      await router.push(returnTo)

      return
    }

    await router.push(defaultPath)
  }

  return {
    fetchSeries,
    fetchSeriesById,
    fetchSubseries,
    fetchSubseriesById,
    fetchDocumentTypes,
    fetchDocumentTypeById,
    subseriesListPath,
    subseriesCreatePath,
    documentTypesListPath,
    documentTypesCreatePath,
    subseriesEditPath,
    documentTypeEditPath,
    returnToPath,
    navigateAfterCatalogSave,
  }
}
