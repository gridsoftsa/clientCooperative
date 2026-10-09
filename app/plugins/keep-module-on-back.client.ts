import { isDeepModulePath, isHomePath, moduleFallbackFromPath } from '~/utils/navigation-context'

/**
 * Si Atrás del navegador cae en el dashboard (`/`) desde una subvista (detalle, SCORE, etc.),
 * reemplaza ese destino por la raíz del módulo para no perder el contexto.
 */
export default defineNuxtPlugin(() => {
  const router = useRouter()

  router.beforeEach((to, from) => {
    if (!from.path || from.path === to.path) {
      return
    }
    if (!isHomePath(to.path) || !isDeepModulePath(from.path)) {
      return
    }
    const state = window.history.state as { current?: string } | null
    const stateCurrent = typeof state?.current === 'string' ? state.current : ''
    const looksLikePop = stateCurrent === to.fullPath || stateCurrent === to.path || stateCurrent === '/'
    if (!looksLikePop) {
      return
    }
    const fallback = moduleFallbackFromPath(from.path)
    if (!fallback || fallback === to.path) {
      return
    }
    return navigateTo(fallback, { replace: true })
  })
})
