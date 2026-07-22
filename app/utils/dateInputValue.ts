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

/** Colombia no usa DST; offset fijo para `datetime-local` sin zona. */
const BOGOTA_OFFSET = '-05:00'

/**
 * Interpreta un valor de `datetime-local` (`YYYY-MM-DDTHH:mm`) como America/Bogota
 * y lo convierte a ISO-8601 (UTC) para el API.
 */
export function bogotaDatetimeLocalToIso(value: string | null | undefined): string | null {
  if (value == null || value.trim() === '') {
    return null
  }

  const match = value.trim().match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::(\d{2}))?/)
  if (!match) {
    return null
  }

  const seconds = match[3] ?? '00'
  const withOffset = `${match[1]}T${match[2]}:${seconds}${BOGOTA_OFFSET}`
  const date = new Date(withOffset)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date.toISOString()
}
