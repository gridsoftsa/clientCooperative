import { formatPesos } from '~/composables/usePesosFormat'

/** `financial_info` de la API puede ser objeto o JSON en string. */
export function parseApplicantFinancialInfo(raw: unknown): Record<string, unknown> | null {
  if (raw == null) {
    return null
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>
  }
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const p = JSON.parse(raw) as unknown
      if (p !== null && typeof p === 'object' && !Array.isArray(p)) {
        return p as Record<string, unknown>
      }
    } catch {
      return null
    }
  }
  return null
}

function numIngreso(v: unknown): number {
  if (v == null || v === '') {
    return 0
  }
  if (typeof v === 'number' && Number.isFinite(v)) {
    return v
  }
  const t = String(v).trim()
  if (!t) {
    return 0
  }
  const parsed = Number(t.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : 0
}

/**
 * Igual que «Total ingresos» (paso 3) en `ApplicantFormFields`: salario + pensión +
 * cultivos/negocio + arriendos + otros.
 */
export function totalIngresosRadicacionNumber(fi: unknown): number {
  const f = parseApplicantFinancialInfo(fi) ?? (typeof fi === 'object' && fi !== null && !Array.isArray(fi) ? (fi as Record<string, unknown>) : null)
  if (!f) {
    return 0
  }
  const inc = f.income
  if (inc == null || typeof inc !== 'object' || Array.isArray(inc)) {
    return 0
  }
  const i = inc as Record<string, unknown>
  return (
    numIngreso(i.salary) +
    numIngreso(i.pension) +
    numIngreso(i.business) +
    numIngreso(i.rental) +
    numIngreso(i.other)
  )
}

/** Mismo estilo de dinero que el paso 3 de radicación (`formatPesos`). */
export function totalIngresosRadicacionFormatted(fi: unknown): string {
  const n = totalIngresosRadicacionNumber(fi)
  if (!Number.isFinite(n)) {
    return ''
  }
  return formatPesos(n)
}
