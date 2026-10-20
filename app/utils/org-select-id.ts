/**
 * Vueform Multiselect sometimes emits the option object even with `object={false}`.
 * PHP `(int) array` becomes 1, so nested query params would filter the wrong area.
 */
export function orgSelectId(value: unknown): number | null {
  if (value == null || value === '') {
    return null
  }

  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (/^\d+$/.test(trimmed)) {
      const parsed = Number(trimmed)
      return parsed > 0 ? parsed : null
    }
    return null
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    if ('value' in record) {
      return orgSelectId(record.value)
    }
    if ('id' in record) {
      return orgSelectId(record.id)
    }
  }

  return null
}
