import type {
  ArchivalCatalogListResponse,
  CatalogConfidentialityPayload,
  ClassificationAccessGrantRow,
  DocDocumentTypeRow,
  DocSeriesRow,
  DocSubseriesRow,
  DocumentClassificationOptions,
  DocumentConfidentialityLevel,
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
    const res = await $api<ArchivalCatalogListResponse<DocDocumentTypeRow> | DocDocumentTypeRow[]>(
      '/archival/catalog/document-types',
      {
        query: { doc_subseries_id: docSubseriesId, per_page: perPage },
      },
    )

    if (Array.isArray(res)) {
      return res
    }

    return Array.isArray(res.data) ? res.data : []
  }

  async function fetchDocumentTypeById(id: number): Promise<DocDocumentTypeRow> {
    const res = await $api<{ data: DocDocumentTypeRow }>(`/archival/catalog/document-types/${id}`)

    return res.data
  }

  async function fetchClassificationOptions(): Promise<DocumentClassificationOptions> {
    const res = await $api<{ data: DocumentClassificationOptions }>('/archival/catalog/classification/options')

    return res.data
  }

  async function saveClassification(payload: {
    subject_type: 'series' | 'subseries' | 'document_type'
    subject_id: number
    inherited?: boolean
    confidentiality_level?: DocumentConfidentialityLevel
    grants?: ClassificationAccessGrantRow[]
  }): Promise<CatalogConfidentialityPayload> {
    const res = await $api<{
      data: { confidentiality: CatalogConfidentialityPayload }
      message: string
    }>('/archival/catalog/classification', {
      method: 'PUT',
      body: payload,
    })

    return res.data.confidentiality
  }

  async function persistClassification(
    fields: {
      validate: () => string | null
      toPayload: () => {
        inherited: boolean
        confidentiality_level?: DocumentConfidentialityLevel
        grants?: ClassificationAccessGrantRow[]
      }
    } | null,
    subjectType: 'series' | 'subseries' | 'document_type',
    subjectId: number,
  ): Promise<void> {
    const error = fields?.validate() ?? null
    if (error) {
      throw new Error(error)
    }
    if (!fields) {
      return
    }

    const payload = fields.toPayload()
    await saveClassification({
      subject_type: subjectType,
      subject_id: subjectId,
      inherited: payload.inherited,
      confidentiality_level: payload.confidentiality_level,
      grants: payload.grants,
    })
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
    fetchClassificationOptions,
    saveClassification,
    persistClassification,
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
