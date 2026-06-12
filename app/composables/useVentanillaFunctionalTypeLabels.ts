import type { VentanillaFunctionalTypeRow } from '~/types/ventanilla'

export function useVentanillaFunctionalTypeLabels() {
  const labelsByKey = useState<Record<string, string>>('ventanilla-functional-type-labels', () => ({}))
  const loading = useState('ventanilla-functional-type-labels-loading', () => false)
  const loaded = useState('ventanilla-functional-type-labels-loaded', () => false)

  async function ensureLoaded(): Promise<void> {
    if (loaded.value || loading.value) {
      return
    }

    loading.value = true

    try {
      const ventanillaApi = useVentanillaApi()
      const catalog = await ventanillaApi.fetchCatalog()
      const map: Record<string, string> = {}

      for (const row of catalog.functional_types ?? []) {
        map[row.key] = row.label
      }

      labelsByKey.value = map
      loaded.value = true
    }
    catch {
      labelsByKey.value = {}
    }
    finally {
      loading.value = false
    }
  }

  function labelFor(
    key: string | null | undefined,
    apiLabel?: string | null,
  ): string {
    if (!key) {
      return apiLabel?.trim() ?? ''
    }

    if (apiLabel?.trim()) {
      return apiLabel.trim()
    }

    return labelsByKey.value[key] ?? key
  }

  function registerTypes(rows: VentanillaFunctionalTypeRow[]): void {
    if (rows.length === 0) {
      return
    }

    const map = { ...labelsByKey.value }

    for (const row of rows) {
      map[row.key] = row.label
    }

    labelsByKey.value = map
    loaded.value = true
  }

  return {
    labelsByKey,
    ensureLoaded,
    labelFor,
    registerTypes,
  }
}
