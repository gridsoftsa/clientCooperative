/**
 * Estructura del desglose de costos SIPSA para aves ponedoras.
 * Compartido entre radicación (AvesCostBreakdown) y configuración de plantillas.
 */
export interface AvesCostItem {
  key: string
  label: string
  pct: number
  meta?: string
}

export interface AvesCostGroup {
  section: string
  headerClass: string
  items: AvesCostItem[]
}

export const AVES_COST_BREAKDOWN: AvesCostGroup[] = [
  {
    section: 'Pollita de 1 día',
    headerClass: 'bg-emerald-100 dark:bg-emerald-900/30',
    items: [{ key: 'cost_pct_pollita', label: 'Pollita de 1 día', pct: 2.8 }],
  },
  {
    section: 'Instalación e infraestructura',
    headerClass: 'bg-slate-200 dark:bg-slate-700',
    items: [
      { key: 'cost_pct_desinfeccion', label: 'Desinfección de galpones', pct: 0.2 },
      { key: 'cost_pct_materiales_cama', label: 'Materiales Cama', meta: 'Viruta, tamos, cascarilla', pct: 0.4 },
      { key: 'cost_pct_calefaccion', label: 'Calefacción Galpones', pct: 0.2 },
    ],
  },
  {
    section: 'Fase de Levante',
    headerClass: 'bg-slate-200 dark:bg-slate-700',
    items: [
      { key: 'cost_pct_levante_nutricion', label: 'Nutrición', pct: 9.38 },
      { key: 'cost_pct_levante_sanidad', label: 'Sanidad', pct: 1.7 },
      { key: 'cost_pct_levante_vacunas', label: 'Vacunas', pct: 0.4 },
      { key: 'cost_pct_levante_medicamento', label: 'Medicamento', pct: 0.02 },
      { key: 'cost_pct_levante_otros', label: 'Otros Insumos', pct: 1.0 },
    ],
  },
  {
    section: 'Fase de Producción',
    headerClass: 'bg-orange-100 dark:bg-orange-900/30',
    items: [
      { key: 'cost_pct_prod_nutricion', label: 'Nutrición', pct: 70.73 },
      { key: 'cost_pct_prod_sanidad', label: 'Sanidad', pct: 0.3 },
      { key: 'cost_pct_prod_vacunas', label: 'Vacunas', pct: 0.1 },
      { key: 'cost_pct_prod_medicamento', label: 'Medicamento', pct: 0.07 },
      { key: 'cost_pct_prod_otros', label: 'Otros Insumos', pct: 0.2 },
    ],
  },
  {
    section: 'Mano de Obra',
    headerClass: 'bg-blue-100 dark:bg-blue-900/30',
    items: [
      { key: 'cost_pct_mano_directa', label: 'Directa', pct: 4.7 },
      { key: 'cost_pct_mano_ocasional', label: 'Ocasional (Jornales)', pct: 0.3 },
    ],
  },
  {
    section: 'Costos Indirectos',
    headerClass: 'bg-yellow-100 dark:bg-yellow-900/30',
    items: [
      { key: 'cost_pct_ind_asistencia', label: 'Asistencia Técnica', pct: 0.3 },
      { key: 'cost_pct_ind_cartones', label: 'Cartones para huevo', pct: 1.3 },
      { key: 'cost_pct_ind_otros', label: 'Otros Costos', pct: 0.1 },
      { key: 'cost_pct_ind_transporte', label: 'Transporte', pct: 2.3 },
      { key: 'cost_pct_ind_imprevistos', label: 'Imprevistos', pct: 2.5 },
    ],
  },
]

export const AVES_MORTALITY_KEY = 'cost_pct_ajuste_mortalidad'
export const AVES_MORTALITY_PCT = 1.0

/** Todas las claves de porcentaje del desglose (para getConfigFieldKeys) */
export function getAvesCostBreakdownFieldKeys(): string[] {
  const keys = AVES_COST_BREAKDOWN.flatMap(g => g.items.map(i => i.key))
  keys.push(AVES_MORTALITY_KEY)
  return keys
}
