/**
 * Validación de sumatorias de porcentajes en configuración de plantillas (settings).
 * No debe superarse 100% en grupos de discriminación de costos.
 */
import { CICLO_CORTO_COST_BREAKDOWN_KEY } from '~/constants/cultivo-ciclo-corto-cost-breakdown'

const EPS = 0.01

function num(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

export function cicloCortoBreakdownPctSum(data: Record<string, unknown>): number {
  const arr = data[CICLO_CORTO_COST_BREAKDOWN_KEY]
  if (!Array.isArray(arr)) return 0
  return arr.reduce((acc: number, r: { pct?: unknown }) => acc + num((r as { pct?: unknown }).pct), 0)
}

/**
 * Grupos de claves cuya suma en config_data no debe ser mayor a 100.
 * (Se excluye % costo estándar cuando es un rubro aparte del desglose interno.)
 */
const PCT_SUM_GROUPS: Record<string, string[][]> = {
  'cerdos-cria': [[
    'pct_sostenimiento_madre',
    'pct_alimentacion_lechon',
    'pct_medicamento_complementos',
    'pct_mano_obra_cerdos',
    'pct_mantenimiento_infraestructura',
  ]],
  'cerdos-ceba': [[
    'pct_lechon_destetado',
    'pct_alimentacion_ceba',
    'pct_medicamento_complementos_ceba',
    'pct_mano_obra_ceba',
  ]],
  'ganado-doble-proposito': [[
    'pct_alimentacion',
    'pct_mano_obra',
    'pct_mantenimiento_pasturas',
    'pct_mantenimiento_infraestructura',
    'pct_insumos_veterinarios',
  ]],
  'peces-tilapia': [[
    'pct_mano_obra_tilapia',
    'pct_preparacion_estanque',
    'pct_compra_especies',
    'pct_tratamientos_tilapia',
    'pct_sacrificio_tilapia',
    'pct_alimentacion_tilapia',
  ]],
}

export type PctSumValidation = { ok: true } | { ok: false; message: string }

export function validateTemplateConfigPctSums(
  templateKey: string,
  data: Record<string, unknown>,
): PctSumValidation {
  if (templateKey === 'cultivo-ciclo-corto') {
    const s = cicloCortoBreakdownPctSum(data)
    if (s > 100 + EPS) {
      return {
        ok: false,
        message: `La discriminación de costos suma ${s.toFixed(2)}%. La suma no puede superar 100%.`,
      }
    }
  }

  const groups = PCT_SUM_GROUPS[templateKey]
  if (groups) {
    for (const keys of groups) {
      const s = keys.reduce((acc, k) => acc + num(data[k]), 0)
      if (s > 100 + EPS) {
        return {
          ok: false,
          message: `La suma de porcentajes de discriminación (${s.toFixed(2)}%) no puede superar 100%.`,
        }
      }
    }
  }

  return { ok: true }
}
