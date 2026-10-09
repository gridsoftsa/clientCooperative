/**
 * Sincroniza el paso de un asistente con `?paso=` para que Atrás/Adelante
 * recuperen la pestaña previa en lugar de salir al inicio.
 */
export function useRouteSyncedStep(
  currentStep: Ref<number>,
  maxStep: MaybeRefOrGetter<number>,
  queryKey = 'paso',
): void {
  const route = useRoute()
  const router = useRouter()
  const applyingFromRoute = ref(false)

  function clamp(n: number): number {
    const max = Math.max(1, Number(toValue(maxStep)) || 1)
    if (!Number.isFinite(n) || n < 1) {
      return 1
    }
    return Math.min(Math.floor(n), max)
  }

  function stepFromQuery(raw: unknown): number {
    const v = Array.isArray(raw) ? raw[0] : raw
    return clamp(Number(v))
  }

  if (import.meta.client && route.query[queryKey] != null) {
    currentStep.value = stepFromQuery(route.query[queryKey])
  }

  watch(
    () => route.query[queryKey],
    (raw) => {
      const next = raw == null || raw === '' ? 1 : stepFromQuery(raw)
      if (next === currentStep.value) {
        return
      }
      applyingFromRoute.value = true
      currentStep.value = next
      nextTick(() => {
        applyingFromRoute.value = false
      })
    },
  )

  watch(currentStep, (step) => {
    if (applyingFromRoute.value || !import.meta.client) {
      return
    }
    const next = clamp(step)
    if (next !== step) {
      currentStep.value = next
      return
    }
    const currentRaw = route.query[queryKey]
    const currentParsed = currentRaw == null || currentRaw === '' ? 1 : stepFromQuery(currentRaw)
    if (currentParsed === next) {
      return
    }
    const query = { ...route.query }
    if (next <= 1) {
      delete query[queryKey]
    }
    else {
      query[queryKey] = String(next)
    }
    void router.push({ path: route.path, query, hash: route.hash })
  })
}
