export default defineNuxtRouteMiddleware(async () => {
  if (import.meta.server) {
    return
  }

  const { user, fetchUser } = useAuth()
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

  if (!user.value) {
    return navigateTo('/login')
  }

  if (!user.value.must_change_password) {
    const { hasPermission } = usePermissions()
    const target = hasPermission('dashboard_ver') ? '/' : '/radicacion'
    return navigateTo(target)
  }
})
