const SEPARATOR = '-'

export function catalogCodePrefix(prefix: string): string {
  return prefix.trim()
}

/** Código completo persistido: `{prefijo}-{sufijo}` (p. ej. área + número de serie). */
export function buildCatalogCode(prefix: string, suffixOrFull: string): string {
  const p = catalogCodePrefix(prefix)
  const value = suffixOrFull.trim()

  if (!p) {
    return value
  }
  if (!value) {
    return p
  }
  const withSep = `${p}${SEPARATOR}`
  if (value.startsWith(withSep) || value === p) {
    return value
  }
  return `${p}${SEPARATOR}${value}`
}

export function catalogCodeSuffix(prefix: string, fullCode: string): string {
  const p = catalogCodePrefix(prefix)
  const full = fullCode.trim()

  if (!p || !full) {
    return full
  }
  const withSep = `${p}${SEPARATOR}`
  if (full.startsWith(withSep)) {
    return full.slice(withSep.length)
  }
  if (full === p) {
    return ''
  }
  return full
}
