import { useTemplateFlatCatalogOptions, type FlatCatalogOption } from './useTemplateFlatCatalogOptions'

const FALLBACK_BANCOS: FlatCatalogOption[] = [
  { value: 'bancolombia', label: 'Bancolombia' },
  { value: 'banco-de-bogota', label: 'Banco de Bogotá' },
  { value: 'banco-davivienda', label: 'Banco Davivienda' },
  { value: 'bbva-colombia', label: 'BBVA Colombia' },
  { value: 'banco-popular', label: 'Banco Popular' },
]

/**
 * Bancos parametrizados (`template_key` `bancos`) vía GET /catalogs/template-flat-data/bancos.
 */
export function useBancosCatalogOptions() {
  return useTemplateFlatCatalogOptions('bancos', FALLBACK_BANCOS)
}
