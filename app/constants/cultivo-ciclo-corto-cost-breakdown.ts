/**
 * Estructura dinámica de discriminación de costos para cultivos de ciclo corto.
 * Dos ejes principales: MANO DE OBRA e INSUMOS.
 * Cada fila es configurable: puede haber desglose o una sola fila por eje.
 * Guardado en config_data.ciclo_corto_cost_breakdown (activity_template_flat_data).
 */
export type CicloCortoCostSection = 'MANO DE OBRA' | 'INSUMOS'

export interface CicloCortoCostRow {
  section: CicloCortoCostSection
  label: string
  pct: number
}

/** Estructura mínima por defecto (sin desglose en mano de obra) */
export const CICLO_CORTO_COST_BREAKDOWN_DEFAULT: CicloCortoCostRow[] = [
  { section: 'MANO DE OBRA', label: 'Mano de obra', pct: 65 },
  { section: 'INSUMOS', label: 'Insumos', pct: 35 },
]

/** Estructura con desglose (referencia maíz) - para migrar datos existentes */
export const CICLO_CORTO_COST_BREAKDOWN_WITH_ITEMS: CicloCortoCostRow[] = [
  { section: 'MANO DE OBRA', label: 'Instalación', pct: 40 },
  { section: 'MANO DE OBRA', label: 'Control de arvenses', pct: 3.45 },
  { section: 'MANO DE OBRA', label: 'Control fitosanitario', pct: 2.09 },
  { section: 'MANO DE OBRA', label: 'Fertilización', pct: 3.45 },
  { section: 'MANO DE OBRA', label: 'Cosecha', pct: 13.11 },
  { section: 'MANO DE OBRA', label: 'Otros (desgranado y otros)', pct: 6.9 },
  { section: 'INSUMOS', label: 'Insumos', pct: 35 },
]

/** Clave en config_data donde se guarda el array */
export const CICLO_CORTO_COST_BREAKDOWN_KEY = 'ciclo_corto_cost_breakdown'

/** Claves para getConfigFieldKeys */
export function getCicloCortoCostBreakdownFieldKeys(): string[] {
  return [CICLO_CORTO_COST_BREAKDOWN_KEY]
}
