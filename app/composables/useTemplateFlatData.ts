/**
 * Obtiene los datos planos de una plantilla desde el catálogo.
 * Usado en formularios de actividad económica para pre-rellenar valores estándar.
 */
export function useTemplateFlatData() {
  const { $api } = useNuxtApp()

  async function fetchFlatData(templateKey: string, productKey?: string | null): Promise<Record<string, unknown>> {
    try {
      const url = productKey
        ? `/catalogs/template-flat-data/${templateKey}?product_key=${encodeURIComponent(productKey)}`
        : `/catalogs/template-flat-data/${templateKey}`
      const res = await $api<{ data: Record<string, unknown> | { config_data?: Record<string, unknown> } }>(url)
      const raw = res?.data
      if (!raw || typeof raw !== 'object') return {}
      // Soporta ambos formatos: { data: config } o { data: { config_data: config } }
      const config = raw && 'config_data' in raw && typeof (raw as { config_data?: unknown }).config_data === 'object'
        ? (raw as { config_data: Record<string, unknown> }).config_data
        : (raw as Record<string, unknown>)
      if (import.meta.dev && Object.keys(config).length > 0) {
        console.log('[useTemplateFlatData] Cargados', Object.keys(config).length, 'valores para', templateKey)
      }
      return config ?? {}
    } catch (err) {
      if (import.meta.dev) {
        console.warn('[useTemplateFlatData] No se pudieron cargar valores. ¿Autenticado?', err)
      }
      try {
        const { toast } = await import('vue-sonner')
        toast.error('No se cargaron los valores por defecto. Verifica que estés autenticado.')
      } catch {
        // vue-sonner puede no estar disponible
      }
      return {}
    }
  }

  return { fetchFlatData }
}
