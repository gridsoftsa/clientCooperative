/**
 * Fechas de solicitante (solo `YYYY-MM-DD`, calendario local) — mayoría de edad, etc.
 */

const YMD = /^(\d{4})-(\d{2})-(\d{2})$/

export const MIN_APPLICANT_AGE_YEARS = 18

export function parseYmdToLocalDate(ymd: string): Date | null {
  const t = ymd.trim()
  const m = YMD.exec(t)
  if (!m) {
    return null
  }
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  const dt = new Date(y, mo - 1, d)
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) {
    return null
  }
  return dt
}

export function ymdFromLocalDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function ymdLocalToday(): string {
  return ymdFromLocalDate(new Date())
}

/** Normaliza ISO u otros strings de fecha a `yyyy-MM-dd` para `input type="date"`. */
export function toDateInputFormat(val: unknown): string | undefined {
  if (val == null || val === '') {
    return undefined
  }
  const str = String(val).trim()
  if (!str) {
    return undefined
  }
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`
  }
  const d = new Date(str)
  if (Number.isNaN(d.getTime())) {
    return undefined
  }
  return d.toISOString().slice(0, 10)
}

/** Años cumplidos en `refYmd` (referencia en YYYY-MM-DD). */
export function completedAgeYears(birthYmd: string, refYmd: string): number | null {
  const b = parseYmdToLocalDate(birthYmd)
  const r = parseYmdToLocalDate(refYmd)
  if (!b || !r) {
    return null
  }
  let age = r.getFullYear() - b.getFullYear()
  const beforeBirthday
    = r.getMonth() < b.getMonth()
    || (r.getMonth() === b.getMonth() && r.getDate() < b.getDate())
  if (beforeBirthday) {
    age--
  }
  return age
}

export function isAtLeastAgeYears(
  birthYmd: string,
  minYears: number,
  refYmd: string,
): boolean {
  const age = completedAgeYears(birthYmd, refYmd)
  if (age === null) {
    return false
  }
  return age >= minYears
}

/** Máxima fecha de nacimiento para cumplir `minYears` años a `refYmd` (inclusive). */
export function maxBirthYmdForMinAge(minYears: number, refYmd: string): string | null {
  const r = parseYmdToLocalDate(refYmd)
  if (!r) {
    return null
  }
  const t = new Date(r)
  t.setFullYear(t.getFullYear() - minYears)
  return ymdFromLocalDate(t)
}

export function compareYmd(a: string, b: string): number | null {
  const da = parseYmdToLocalDate(a)
  const db = parseYmdToLocalDate(b)
  if (!da || !db) {
    return null
  }
  return da.getTime() - db.getTime()
}

/** Fecha del cumpleaños N años después (ej. día en que cumple 18). */
export function ymdAddCalendarYears(ymd: string, years: number): string | null {
  const d = parseYmdToLocalDate(ymd)
  if (!d) {
    return null
  }
  const t = new Date(d)
  t.setFullYear(t.getFullYear() + years)
  return ymdFromLocalDate(t)
}

/** La expedición es anterior al día en que cumplió 18 años (documento no puede ser de menor). */
export function expeditionBeforeEighteenthBirthday(expeditionYmd: string, birthYmd: string): boolean {
  const minExp = ymdAddCalendarYears(birthYmd, MIN_APPLICANT_AGE_YEARS)
  if (!minExp) {
    return false
  }
  const c = compareYmd(expeditionYmd, minExp)
  return c !== null && c < 0
}
