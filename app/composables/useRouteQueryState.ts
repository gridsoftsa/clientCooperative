/**
 * Estado de pestaña ligado a un query param, con entradas de historial.
 */
export function useRouteQueryState(
  queryKey: string,
  defaultValue: string,
  allowed?: readonly string[],
): WritableComputedRef<string> {
  const route = useRoute()
  const router = useRouter()

  function normalize(raw: unknown): string {
    const v = String(Array.isArray(raw) ? raw[0] : raw ?? '').trim()
    if (allowed && allowed.length > 0) {
      if (v && allowed.includes(v)) {
        return v
      }
      return defaultValue
    }
    return v || defaultValue
  }

  return computed({
    get() {
      if (route.query[queryKey] == null || route.query[queryKey] === '') {
        return defaultValue
      }
      return normalize(route.query[queryKey])
    },
    set(value: string) {
      const next = normalize(value)
      const raw = route.query[queryKey]
      const current = raw == null || raw === '' ? defaultValue : normalize(raw)
      if (next === current) {
        return
      }
      const query = { ...route.query }
      if (next === defaultValue) {
        delete query[queryKey]
      }
      else {
        query[queryKey] = next
      }
      void router.push({ path: route.path, query, hash: route.hash })
    },
  })
}
