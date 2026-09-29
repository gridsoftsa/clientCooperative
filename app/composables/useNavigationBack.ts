import {
  isAuthPath,
  isHomePath,
  moduleFallbackFromPath,
  previousHistoryPath,
} from '~/utils/navigation-context'

/**
 * Volver a la vista previa en el historial (misma app), sin saltar al dashboard.
 * Si no hay historial usable, usa el fallback del módulo.
 */
export function useNavigationBack(explicitFallback?: MaybeRefOrGetter<string | undefined>) {
  const router = useRouter()
  const route = useRoute()

  function fallbackPath(): string {
    const explicit = toValue(explicitFallback)?.trim()
    if (explicit) {
      return explicit
    }
    return moduleFallbackFromPath(route.path)
  }

  function goBack(): void {
    const prev = previousHistoryPath()
    const fb = fallbackPath()
    if (prev) {
      const prevPath = prev.split(/[?#]/, 1)[0] ?? prev
      if (isAuthPath(prevPath) || isHomePath(prevPath)) {
        void router.push(fb)
        return
      }
      if (prevPath.startsWith('/')) {
        router.back()
        return
      }
    }
    void router.push(fb)
  }

  return { goBack }
}
