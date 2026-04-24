export interface FlatCatalogOption {
  value: string
  label: string
}

/**
 * Opciones parametrizadas vía `GET /catalogs/template-flat-data/{templateKey}` (auth:sanctum).
 * El controlador `catalog` devuelve `{ data: { options: [...] } }` (config plano).
 * No usar `GET /template-flat-data/...` (método `show`): ahí las opciones van en `data.config_data.options`.
 */
export function useTemplateFlatCatalogOptions(
  templateKey: string,
  fallbacks: FlatCatalogOption[],
) {
  const { $api } = useNuxtApp()
  const options = ref<FlatCatalogOption[]>([])
  const loading = ref(false)

  async function fetchOptions() {
    loading.value = true
    try {
      const res = await $api<{ data: { options?: FlatCatalogOption[] } }>(
        `/catalogs/template-flat-data/${templateKey}`,
      )
      const raw = res.data?.options
      const list = Array.isArray(raw)
        ? raw.filter(
          (o): o is FlatCatalogOption =>
            Boolean(o) && typeof o.value === 'string' && typeof o.label === 'string',
        )
        : []
      options.value = list.length > 0 ? list : [...fallbacks]
    } catch {
      options.value = [...fallbacks]
    } finally {
      loading.value = false
    }
  }

  function labelForValue(value: string | null | undefined): string {
    if (value == null || value === '') {
      return '-'
    }
    const o = options.value.find(x => x.value === value)
    return o?.label ?? value
  }

  return { options, loading, fetchOptions, labelForValue, fallbacks }
}
