/** Fecha local de hoy en `YYYY-MM-DD` (para valores por defecto en formularios). */
export function todayIsoDateString(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')

  return `${y}-${m}-${day}`
}

/** Primer día del mes actual en zona local (`YYYY-MM-DD`). */
export function startOfCurrentMonthIsoDateString(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')

  return `${y}-${m}-01`
}

/** Rango por defecto: inicio del mes actual hasta hoy. */
export function defaultCurrentMonthDateRange(): { from: string, to: string } {
  return {
    from: startOfCurrentMonthIsoDateString(),
    to: todayIsoDateString(),
  }
}

/** Normaliza fechas ISO de la API a `YYYY-MM-DD` para inputs `type="date"`. */
export function toDateInputValue(iso: string | null | undefined): string {
  if (iso == null || iso === '') {
    return ''
  }

  return String(iso).slice(0, 10)
}
