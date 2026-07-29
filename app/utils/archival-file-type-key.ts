/**
 * Sugiere clave técnica de tipo de expediente (misma convención que el API al crear).
 */
export function suggestArchivalFileTypeKey(name: string): string {
  let base = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

  if (!base) {
    base = 'file_type'
  }

  if (!base.endsWith('_file')) {
    base = `${base}_file`
  }

  return base.slice(0, 64).replace(/_+$/, '') || 'file_type'
}
