import type { DocDocumentTypeRow } from '~/types/archival-catalog'

export interface DocumentProducerOrgUnitOption {
  id: number
  name: string
  code: string
  is_document_producer?: boolean
}

export interface TrdDocumentTypeOption extends DocDocumentTypeRow {
  label: string
  series_code?: string
  subseries_code?: string
}

export function useRadicacionTrd() {
  const trdApi = useTrdApi()

  const producerUnits = ref<DocumentProducerOrgUnitOption[]>([])
  const trdTypeOptions = ref<TrdDocumentTypeOption[]>([])
  const trdRequired = ref(false)
  const loadingUnits = ref(false)
  const loadingTypes = ref(false)

  async function loadProducerUnits(): Promise<void> {
    const { $api } = useNuxtApp()
    loadingUnits.value = true
    try {
      const res = await $api<{ data: DocumentProducerOrgUnitOption[] }>(
        '/organizational-structure/org-units',
        { query: { per_page: 200, is_active: true } },
      )
      producerUnits.value = (res.data ?? [])
        .filter(u => u.is_document_producer)
        .map(u => ({ id: u.id, name: u.name, code: u.code, is_document_producer: true }))
    } catch {
      producerUnits.value = []
    } finally {
      loadingUnits.value = false
    }
  }

  async function loadTrdTypesForUnit(orgUnitId: number | null): Promise<void> {
    trdTypeOptions.value = []
    trdRequired.value = false
    if (orgUnitId == null || orgUnitId < 1) {
      return
    }
    loadingTypes.value = true
    try {
      const res = await trdApi.fetchActiveVersion(orgUnitId)
      if (!res.data?.version?.document_types?.length) {
        trdRequired.value = false
        return
      }
      trdRequired.value = true
      const types = res.data.version.document_types ?? []
      trdTypeOptions.value = types.map((t) => {
        const sub = (t as DocDocumentTypeRow & { subseries?: { code: string, series?: { code: string } } }).subseries
        const seriesCode = sub?.series?.code
        const subCode = sub?.code
        const prefix = [seriesCode, subCode].filter(Boolean).join(' / ')

        return {
          id: t.id,
          code: t.code,
          name: t.name,
          doc_subseries_id: t.doc_subseries_id,
          label: prefix ? `${prefix} — ${t.code} — ${t.name}` : `${t.code} — ${t.name}`,
          series_code: seriesCode,
          subseries_code: subCode,
        }
      })
    } catch {
      trdRequired.value = false
      trdTypeOptions.value = []
    } finally {
      loadingTypes.value = false
    }
  }

  return {
    producerUnits,
    trdTypeOptions,
    trdRequired,
    loadingUnits,
    loadingTypes,
    loadProducerUnits,
    loadTrdTypesForUnit,
  }
}
