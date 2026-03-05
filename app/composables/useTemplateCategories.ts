/**
 * Categorías de plantillas (cultivo permanente, ciclo corto) desde la API.
 * Usado en FinancialActivityForm para las opciones de producto.
 */
interface TemplateCategory {
  id: number
  template_key: string
  name: string
  code: string
  sort_order: number
}

interface CategoryOptions {
  value: string
  label: string
}

export function useTemplateCategories() {
  const { $api } = useNuxtApp()

  const cultivoPermanenteOptions = ref<CategoryOptions[]>([])
  const cultivoCicloCortoOptions = ref<CategoryOptions[]>([])
  const loading = ref(false)

  async function fetchCategories() {
    loading.value = true
    try {
      const res = await $api<{ data: Record<string, TemplateCategory[]> }>('/catalogs/template-categories')
      const permanentes = res.data['cultivo-permanente'] ?? []
      const cicloCorto = res.data['cultivo-ciclo-corto'] ?? []
      cultivoPermanenteOptions.value = permanentes.map((c) => ({ value: c.code, label: c.name }))
      cultivoCicloCortoOptions.value = cicloCorto.map((c) => ({ value: c.code, label: c.name }))
    } catch {
      cultivoPermanenteOptions.value = []
      cultivoCicloCortoOptions.value = []
    } finally {
      loading.value = false
    }
  }

  return {
    cultivoPermanenteOptions,
    cultivoCicloCortoOptions,
    loading,
    fetchCategories,
  }
}
