/**
 * Convierte la lista de roles del API o del multiselect (strings, `{ name }`, u opciones `{ value, label }` de @vueform/multiselect) a nombres de rol.
 */
export function normalizeRoleNames(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return []
  }
  return raw
    .map((item) => {
      if (typeof item === 'string') {
        return item.trim()
      }
      if (item && typeof item === 'object') {
        if ('value' in item) {
          const v = (item as { value: unknown }).value
          if (typeof v === 'string') {
            return v.trim()
          }
        }
        if ('name' in item) {
          const n = (item as { name: unknown }).name
          return typeof n === 'string' ? n.trim() : ''
        }
      }
      return ''
    })
    .filter((s): s is string => s.length > 0)
}
