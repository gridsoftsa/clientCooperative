import type { ScoreMatrixLine } from '~/constants/analisis-score-matrix'

/**
 * Asegura el esquema esperado por la UI y por el agrupador: `k` solo `s`|`r`, campos string.
 * Corrige respuestas API con `k` en mayúsculas u objetos sin `k` reconocible (p. ej. sección solo con label/peso/max).
 */
export function normalizeScoreMatrixLine(line: unknown): ScoreMatrixLine {
  if (line === null || line === undefined || typeof line !== 'object') {
    return { k: 'r', v: '', p: '', d: '', h: '', pt: '' }
  }
  const o = line as Record<string, unknown>
  let k = String(o.k ?? '')
    .trim()
    .toLowerCase()
  if (k !== 's' && k !== 'r') {
    k = 'label' in o && !('pt' in o) ? 's' : 'r'
  }
  if (k === 's') {
    return {
      k: 's',
      label: String(o.label ?? ''),
      peso: String(o.peso ?? ''),
      max: String(o.max ?? ''),
    }
  }
  return {
    k: 'r',
    v: String(o.v ?? ''),
    p: String(o.p ?? ''),
    d: String(o.d ?? ''),
    h: String(o.h ?? ''),
    pt: String(o.pt ?? ''),
  }
}

/** Normaliza un arreglo de líneas; si no es arreglo devuelve []. */
export function normalizeScoreMatrixLines(lines: unknown): ScoreMatrixLine[] {
  if (!Array.isArray(lines)) {
    return []
  }
  return lines.map(normalizeScoreMatrixLine)
}

/**
 * True si el JSON guardado parece una matriz SCORE completa (evita sustituir la UI por datos vacíos o corruptos en BD).
 */
export function isScoreMatrixLinesRenderable(lines: ScoreMatrixLine[]): boolean {
  if (lines.length < 15) {
    return false
  }
  const sectionsWithLabel = lines.filter((l) => l.k === 's' && String(l.label ?? '').trim().length > 0)
  if (sectionsWithLabel.length < 1) {
    return false
  }
  let filledRows = 0
  for (const l of lines) {
    if (l.k !== 'r') {
      continue
    }
    if (
      String(l.v ?? '').trim()
      || String(l.d ?? '').trim()
      || String(l.h ?? '').trim()
      || String(l.pt ?? '').trim()
    ) {
      filledRows++
    }
  }
  return filledRows >= 8
}

/** Convierte peso almacenado en decimal 0–1 (p. ej. 0.2) al número mostrado en el input de porcentaje (20). */
export function weightDecimalToPercentInput(decimalStr: string | undefined | null): string {
  const t = String(decimalStr ?? '').trim()
  if (t === '') {
    return ''
  }
  const n = Number(t.replace(',', '.'))
  if (Number.isNaN(n)) {
    return t === '' ? '' : String(decimalStr ?? '')
  }
  if (n >= 0 && n <= 1) {
    const pct = Math.round(n * 10000) / 100
    if (pct === Math.floor(pct)) {
      return String(Math.floor(pct))
    }
    return String(pct)
  }
  return t === '' ? '' : String(decimalStr ?? '')
}

/** Convierte lo que el usuario escribe como porcentaje (0–100) al decimal 0–1 guardado en la matriz. */
export function percentInputToWeightDecimal(percentStr: string): string {
  const t = percentStr.trim().replace(/\s/g, '').replace(',', '.')
  if (t === '') {
    return ''
  }
  const n = Number(t)
  if (Number.isNaN(n)) {
    return percentStr
  }
  const dec = Math.round((n / 100) * 10000) / 10000
  return String(dec)
}

const SUM_EPS = 0.0001

/**
 * Verifica que, dentro de cada bloque CUALITATIVAS / CUANTITATIVAS, la suma de pesos (p) de cada variable
 * no supere el 100% (1.0 en decimal). Solo se suman filas `r` con `p` no vacío (primera fila de cada variable).
 */
export function validateSectionVariableWeightsNotOver100(lines: ScoreMatrixLine[]): string | null {
  let sum = 0
  let sectionLabel = ''
  for (const line of lines) {
    if (line.k === 's') {
      if (sectionLabel !== '' && sum > 1 + SUM_EPS) {
        return `En «${sectionLabel}» la suma de pesos de las variables (${(sum * 100).toFixed(2)} %) supera el 100 %.`
      }
      sectionLabel = String(line.label ?? '')
      sum = 0
      continue
    }
    if (line.k === 'r' && String(line.p ?? '').trim() !== '') {
      const n = Number(String(line.p).replace(',', '.'))
      if (!Number.isNaN(n)) {
        sum += n
      }
    }
  }
  if (sectionLabel !== '' && sum > 1 + SUM_EPS) {
    return `En «${sectionLabel}» la suma de pesos de las variables (${(sum * 100).toFixed(2)} %) supera el 100 %.`
  }
  return null
}

const PEAK_PT_EPS = 0.01

function parseScoreMatrixPt(value: string | undefined | null): number {
  const t = String(value ?? '').trim().replace(/\s/g, '').replace(',', '.')
  if (t === '') {
    return 0
  }
  const n = Number(t)
  return Number.isNaN(n) ? 0 : n
}

function parseScoreMatrixSectionMax(value: string | undefined | null): number | null {
  const t = String(value ?? '').trim().replace(/\s/g, '').replace(',', '.')
  if (t === '') {
    return null
  }
  const n = Number(t)
  if (Number.isNaN(n) || n < 0) {
    return null
  }
  return n
}

/**
 * Por cada sección (cabecera `s` con tope `max`, p. ej. 300 / 700 sobre 1000 puntos),
 * la suma de los puntajes máximos alcanzables por variable (el mayor `pt` en cada bloque de filas `r`)
 * no puede superar ese tope. El agrupamiento de filas coincide con `AnalisisScoreMatrixTable` (continuación: `v` y `p` vacíos).
 */
export function validateSectionPeakPointsSumVsCap(lines: ScoreMatrixLine[]): string | null {
  let sectionLabel = ''
  let sectionCap: number | null = null
  let sumPeakByVariable = 0
  let currentGroupPeak = 0

  const finishSection = (): string | null => {
    sumPeakByVariable += currentGroupPeak
    currentGroupPeak = 0
    if (sectionLabel === '' || sectionCap === null) {
      return null
    }
    if (sumPeakByVariable > sectionCap + PEAK_PT_EPS) {
      return `En «${sectionLabel}» la suma de los puntajes máximos por variable (${Math.round(sumPeakByVariable * 100) / 100}) supera el tope de la sección (${Math.round(sectionCap * 100) / 100} puntos). Ajuste los puntajes o el máximo de la sección.`
    }
    return null
  }

  for (const line of lines) {
    if (line.k === 's') {
      const err = finishSection()
      if (err) {
        return err
      }
      sectionLabel = String(line.label ?? '').trim()
      sectionCap = parseScoreMatrixSectionMax(line.max)
      sumPeakByVariable = 0
      currentGroupPeak = 0
      continue
    }
    if (line.k !== 'r') {
      continue
    }
    const vTrim = String(line.v ?? '').trim()
    const pTrim = String(line.p ?? '').trim()
    const isContinuation = vTrim === '' && pTrim === ''
    const ptVal = parseScoreMatrixPt(line.pt)
    if (!isContinuation) {
      sumPeakByVariable += currentGroupPeak
      currentGroupPeak = ptVal
    } else {
      currentGroupPeak = Math.max(currentGroupPeak, ptVal)
    }
  }

  sumPeakByVariable += currentGroupPeak
  currentGroupPeak = 0
  if (sectionLabel !== '' && sectionCap !== null && sumPeakByVariable > sectionCap + PEAK_PT_EPS) {
    return `En «${sectionLabel}» la suma de los puntajes máximos por variable (${Math.round(sumPeakByVariable * 100) / 100}) supera el tope de la sección (${Math.round(sectionCap * 100) / 100} puntos). Ajuste los puntajes o el máximo de la sección.`
  }

  return null
}
