/**
 * Código de campo de metadatos (snake_case, debe iniciar en letra — regla del API).
 */
export function suggestArchivalMetadataFieldCode(name: string): string {
  let base = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

  base = base.replace(/^[0-9_]+/, '')

  if (!base || !/^[a-z]/.test(base)) {
    base = base ? `campo_${base}` : 'campo'
  }

  base = base.replace(/_+/g, '_').replace(/^_+|_+$/g, '')

  return (base.slice(0, 64).replace(/_+$/, '') || 'campo')
}

/**
 * Sugiere un código único dentro del esquema (evita colisiones con sufijo _2, _3…).
 */
export function resolveUniqueArchivalMetadataFieldCode(
  name: string,
  existingCodes: string[],
  excludeCode?: string | null,
): string {
  const taken = new Set(
    existingCodes
      .filter(code => code !== excludeCode)
      .map(code => code.toLowerCase()),
  )

  const base = suggestArchivalMetadataFieldCode(name)
  if (!taken.has(base)) {
    return base
  }

  for (let suffix = 2; suffix < 1000; suffix++) {
    const tail = `_${suffix}`
    const candidate = `${base.slice(0, Math.max(1, 64 - tail.length))}${tail}`
    if (!taken.has(candidate)) {
      return candidate
    }
  }

  const fallbackTail = `_${Date.now().toString(36).slice(-6)}`

  return `${base.slice(0, Math.max(1, 64 - fallbackTail.length))}${fallbackTail}`
}

export function isValidArchivalMetadataFieldCode(code: string): boolean {
  return /^[a-z][a-z0-9_]*$/.test(code.trim())
}
