/**
 * Middleware para proteger rutas basadas en permisos
 * 
 * Uso en definePageMeta:
 * definePageMeta({
 *   middleware: 'permission',
 *   permissions: 'users.view'
 * })
 * 
 * O múltiples permisos (cualquiera):
 * definePageMeta({
 *   middleware: 'permission',
 *   permissions: ['users.view', 'users.edit']
 * })
 * 
 * O usando string con separador |:
 * definePageMeta({
 *   middleware: 'permission',
 *   permissions: 'users.view|users.edit'
 * })
 */
export default defineNuxtRouteMiddleware(async (to, from) => {
  // Skip on server
  if (import.meta.server) {
    return
  }

  const { user, fetchUser } = useAuth()
  const { hasPermission, hasAnyPermission, isAdmin } = usePermissions()

  // Asegurarse de que el usuario esté cargado antes de verificar permisos
  // El middleware auth.global debería haberlo cargado, pero por si acaso
  if (!user.value) {
    try {
      await fetchUser()
    } catch {
      // Si falla, el usuario no está autenticado
    }
  }

  // Si no hay usuario autenticado después de intentar cargarlo, redirigir a login
  if (!user.value) {
    // Evitar ciclo infinito: no redirigir si ya estamos en login
    if (to.path !== '/login') {
      return navigateTo('/login')
    }
    return
  }

  // Los administradores siempre tienen acceso
  if (isAdmin.value) {
    return
  }

  // Obtener permisos requeridos del meta
  const requiredPermissions = to.meta.permissions as string | string[] | undefined

  if (!requiredPermissions) {
    // Si no hay permisos requeridos, permitir acceso
    return
  }

  // Convertir a array si es string (puede venir como 'perm1|perm2' o como array)
  let permissions: string[]
  if (typeof requiredPermissions === 'string') {
    permissions = requiredPermissions.includes('|')
      ? requiredPermissions.split('|').map(p => p.trim())
      : [requiredPermissions]
  } else {
    permissions = requiredPermissions
  }

  // Verificar si tiene alguno de los permisos requeridos
  if (!hasAnyPermission(permissions)) {
    // Evitar ciclo infinito
    if (to.path === '/unauthorized') {
      return
    }
    return navigateTo('/unauthorized')
  }
})
