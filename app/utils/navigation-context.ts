const AUTH_PATHS = new Set([
  '/login',
  '/forgot-password',
  '/reset-password',
  '/register',
  '/unauthorized',
  '/change-password',
])

function stripTrailingSlash(path: string): string {
  if (path.length > 1 && path.endsWith('/')) {
    return path.slice(0, -1)
  }
  return path
}

function pathOnly(fullPath: string): string {
  const cut = fullPath.split(/[?#]/, 1)[0] ?? fullPath
  return stripTrailingSlash(cut || '/')
}

export function isHomePath(path: string): boolean {
  const p = pathOnly(path)
  return p === '/' || p === ''
}

export function isAuthPath(path: string): boolean {
  return AUTH_PATHS.has(pathOnly(path))
}

/** Raíz del módulo para no devolver al dashboard al salir de una subvista. */
export function moduleFallbackFromPath(path: string): string {
  const p = pathOnly(path)
  if (p === '/' || p === '') {
    return '/'
  }
  if (p.startsWith('/radicacion')) {
    return '/radicacion'
  }
  if (p.startsWith('/documentacion')) {
    return '/documentacion'
  }
  if (p.startsWith('/solicitantes')) {
    return '/solicitantes'
  }
  if (p.startsWith('/reportes')) {
    return '/reportes'
  }
  if (p.startsWith('/parametrizacion')) {
    return '/parametrizacion/plantillas'
  }
  if (p.startsWith('/settings/users')) {
    return '/settings/users'
  }
  if (p.startsWith('/settings/roles')) {
    return '/settings/roles'
  }
  if (p.startsWith('/settings/sucursales')) {
    return '/settings/sucursales'
  }
  if (p.startsWith('/settings')) {
    return '/settings'
  }
  return p
}

export function isDeepModulePath(path: string): boolean {
  const p = pathOnly(path)
  const root = moduleFallbackFromPath(p)
  return p !== root && !isHomePath(p) && !isAuthPath(p)
}

export function previousHistoryPath(): string | null {
  if (!import.meta.client) {
    return null
  }
  const back = window.history.state?.back
  if (typeof back !== 'string' || back.trim() === '') {
    return null
  }
  try {
    if (/^https?:\/\//i.test(back)) {
      const url = new URL(back)
      if (url.origin !== window.location.origin) {
        return null
      }
      return `${url.pathname}${url.search}${url.hash}`
    }
    if (!back.startsWith('/')) {
      return null
    }
    return back
  }
  catch {
    return null
  }
}
