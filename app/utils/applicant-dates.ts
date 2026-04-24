/** Normaliza fecha ISO o similar a yyyy-MM-dd para input type="date". */
export function toDateInputFormat(val: string | null | undefined): string | undefined {
  if (val == null || val === '') return undefined
  const str = String(val).trim()
  if (!str) return undefined
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (match) return `${match[1]}-${match[2]}-${match[3]}`
  const d = new Date(str)
  if (Number.isNaN(d.getTime())) return undefined
  return d.toISOString().slice(0, 10)
}
