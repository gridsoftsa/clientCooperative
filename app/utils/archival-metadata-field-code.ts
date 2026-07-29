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

export function isValidArchivalMetadataFieldCode(code: string): boolean {
  return /^[a-z][a-z0-9_]*$/.test(code.trim())
}
