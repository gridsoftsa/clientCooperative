/**
 * Normaliza valores de API/formulario a boolean estricto para checkboxes.
 * Cubre true/false, 1/0 y strings comunes sin tratar arrays u objetos como true.
 */
export function coerceBoolean(value: unknown): boolean {
  if (value === true || value === 1) {
    return true
  }

  if (value === false || value === 0 || value === null || value === undefined) {
    return false
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()

    return normalized === '1' || normalized === 'true' || normalized === 'yes'
  }

  return false
}
