export default defineNuxtRouteMiddleware(async (to) => {
  const publicPages = new Set(['/login', '/forgot-password', '/reset-password', '/register', '/unauthorized'])
  const guestOnly = new Set(['/login', '/forgot-password', '/reset-password', '/register'])

  // En el servidor, solo permitir páginas públicas
  if (import.meta.server) {
    if (!publicPages.has(to.path)) {
      // En SSR, no podemos redirigir, pero el cliente lo hará inmediatamente
      return
    }
    return
  }

  // En el cliente, verificar autenticación inmediatamente
  const { user, fetchUser } = useAuth()

  // Si ya estamos en una página pública, verificar si debemos redirigir
  if (publicPages.has(to.path)) {
    // Si estamos en login y ya estamos logueados, redirigir al dashboard
    const checked = useState<boolean>('auth.checked', () => false)
    if (!checked.value) {
      try {
        await fetchUser()
      } catch {
        user.value = null
      } finally {
        checked.value = true
      }
    }
    
    if (user.value && guestOnly.has(to.path)) {
      return navigateTo('/')
    }
    return
  }

  // Para rutas protegidas, verificar autenticación inmediatamente
  const checked = useState<boolean>('auth.checked', () => false)
  
  if (!checked.value) {
    try {
      await fetchUser()
    } catch {
      // Si falla, el usuario no está autenticado - redirigir inmediatamente
      user.value = null
      checked.value = true
      return navigateTo('/login')
    } finally {
      checked.value = true
    }
  }

  // Verificar estado de autenticación
  const isLoggedIn = Boolean(user.value)

  // Si no está logueado después de verificar, redirigir inmediatamente
  if (!isLoggedIn) {
    if (to.path !== '/login') {
      return navigateTo('/login')
    }
    return
  }

  // Si está logueado y está en una página de invitados, redirigir al dashboard
  if (isLoggedIn && guestOnly.has(to.path)) {
    return navigateTo('/')
  }
})
