import type { ImprimirVariableRow } from '~/constants/analisis-score-imprimir'

function parsePuntajeCell(s: string): number {
  const t = s.trim().replace(',', '.')
  if (t === '') {
    return 0
  }
  const n = Number(t)

  return Number.isFinite(n) ? n : 0
}

function isVariablesHeaderRow(row: ImprimirVariableRow): boolean {
  return row.variable === 'VARIABLES' && row.caracteristica === 'CARACTERÍSTICA'
}

function isSectionKeyword(row: ImprimirVariableRow): boolean {
  const v = row.variable.trim()

  return ['CUALITATIVAS', 'CUANTITATIVAS', 'VARIABLES'].includes(v)
}

/**
 * Suma puntajes de filas de datos entre CUALITATIVAS y CUANTITATIVAS, y desde CUANTITATIVAS hasta el final
 * (misma estructura que IMPRIMIR_*_VARIABLES).
 */
export function sumImprimirPuntajesPorSeccion(rows: ImprimirVariableRow[]): {
  cualitativo: number
  cuantitativo: number
  total: number
} {
  let mode: 'idle' | 'cual' | 'cuan' = 'idle'
  let cualitativo = 0
  let cuantitativo = 0

  for (const row of rows) {
    const varLabel = row.variable.trim()

    if (varLabel === 'CUALITATIVAS') {
      mode = 'cual'
      continue
    }
    if (varLabel === 'CUANTITATIVAS') {
      mode = 'cuan'
      continue
    }

    if (mode === 'cual') {
      if (isVariablesHeaderRow(row) || isSectionKeyword(row)) {
        continue
      }
      cualitativo += parsePuntajeCell(row.puntaje)
      continue
    }

    if (mode === 'cuan') {
      if (isVariablesHeaderRow(row) || isSectionKeyword(row)) {
        continue
      }
      cuantitativo += parsePuntajeCell(row.puntaje)
    }
  }

  return {
    cualitativo,
    cuantitativo,
    total: cualitativo + cuantitativo,
  }
}

/**
 * Equivalente a Excel: IFS(total<400;"Bajo"; total<=700;"Medio"; total>=701;"Alto")
 */
export function classifyPuntajeTotalIFS(total: number): 'Bajo' | 'Medio' | 'Alto' {
  if (total < 400) {
    return 'Bajo'
  }
  if (total <= 700) {
    return 'Medio'
  }

  return 'Alto'
}

export function nivelIFSTailwindClasses(nivel: 'Bajo' | 'Medio' | 'Alto'): string {
  switch (nivel) {
    case 'Bajo':
      return 'border-red-300/80 bg-red-500/10 text-red-950 dark:border-red-500/40 dark:bg-red-950/30 dark:text-red-100'
    case 'Medio':
      return 'border-amber-300/80 bg-amber-500/10 text-amber-950 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-100'
    case 'Alto':
      return 'border-emerald-300/80 bg-emerald-500/10 text-emerald-950 dark:border-emerald-500/40 dark:bg-emerald-950/30 dark:text-emerald-100'
  }
}

/** Resalte de fila en la tabla (misma categoría IFS que el resumen). */
export function nivelIFSRowHighlightClass(nivel: 'Bajo' | 'Medio' | 'Alto'): string {
  switch (nivel) {
    case 'Bajo':
      return 'bg-red-500/15 ring-1 ring-inset ring-red-400/45 dark:bg-red-950/25'
    case 'Medio':
      return 'bg-amber-500/15 ring-1 ring-inset ring-amber-400/45 dark:bg-amber-950/25'
    case 'Alto':
      return 'bg-emerald-500/15 ring-1 ring-inset ring-emerald-400/45 dark:bg-emerald-950/25'
  }
}
