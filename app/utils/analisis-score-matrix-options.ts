import type { ScoreMatrixLine } from '~/constants/analisis-score-matrix'

export type ScoreMatrixOption = {
  label: string
  pt: string
}

function optionLabelFromRow(line: Extract<ScoreMatrixLine, { k: 'r' }>): string {
  const d = (line.d ?? '').trim()
  const h = (line.h ?? '').trim()
  if (!h) {
    return d || '—'
  }
  if (!d) {
    return h || '—'
  }
  return `${d} — ${h}`
}

/**
 * Agrupa filas `r` de la matriz (mismo criterio que la tabla en parametrización / plantilla Score)
 * y devuelve opciones por nombre de variable (`v` en la primera fila del grupo).
 */
export function buildVariableOptionsFromMatrix(lines: ScoreMatrixLine[]): Map<string, ScoreMatrixOption[]> {
  const map = new Map<string, ScoreMatrixOption[]>()
  let currentKey: string | null = null

  for (const line of lines) {
    if (line.k === 's') {
      currentKey = null
      continue
    }
    if (line.k !== 'r') {
      continue
    }
    if (line.v.trim()) {
      currentKey = line.v.trim()
      if (!map.has(currentKey)) {
        map.set(currentKey, [])
      }
    }
    if (!currentKey) {
      continue
    }
    const label = optionLabelFromRow(line)
    map.get(currentKey)!.push({ label, pt: line.pt })
  }

  return map
}

/**
 * Características posibles (columna Cualitativas) de la variable «Garantía»,
 * en el mismo orden que en parametrización → Plantilla Score.
 */
export function caracteristicasGarantiaDesdeMatrix(lines: ScoreMatrixLine[]): string[] {
  const map = buildVariableOptionsFromMatrix(lines)
  const opts = map.get('Garantía') ?? []
  return opts
    .map(o => o.label.trim())
    .filter(s => s.length > 0 && s !== '—')
}

/** Etiqueta de fila en IMPRIMIR → clave `v` en la matriz cuando no coincide literalmente. */
export const INDEPENDIENTE_IMPRIMIR_MATRIX_ALIASES: Record<string, string> = {
  'Antigüedad como asociado en meses': 'Antigüedad como asociado',
  'Solvencia del deudor (total pasivos / total activos)': 'Solvencia del deudor (activo / pasivo)',
}

export const EMPLEADO_IMPRIMIR_MATRIX_ALIASES: Record<string, string> = {
  'Antigüedad laboral en meses': 'Antigüedad laboral',
  'Solvencia del deudor (total pasivos / total activos)': 'Solvencia del deudor (activo / pasivo)',
}

export function resolveMatrixVariableKey(
  imprimirVariable: string,
  optionsMap: Map<string, ScoreMatrixOption[]>,
  aliases: Record<string, string>,
): string | null {
  const t = imprimirVariable.trim()
  if (aliases[t]) {
    const k = aliases[t]
    return optionsMap.has(k) ? k : null
  }
  if (optionsMap.has(t)) {
    return t
  }
  const noMeses = t.replace(/\s+en\s+meses$/i, '').trim()
  if (optionsMap.has(noMeses)) {
    return noMeses
  }
  return null
}
