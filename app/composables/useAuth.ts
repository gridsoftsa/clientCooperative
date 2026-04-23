import type { AuthUser } from '~/types/auth'

type LoginPayload = {
  email: string
  password: string
  remember?: boolean
}

type ResetPasswordPayload = {
  email: string
  token: string
  password: string
  password_confirmation: string
}

export function useAuth() {
  const { $api, $csrf } = useNuxtApp()

  const user = useState<AuthUser | null>('auth.user', () => null)
  const loading = useState<boolean>('auth.loading', () => false)

  async function fetchUser() {
    try {
      const res = await $api<{ user: AuthUser | null }>('/auth/user')
      user.value = res.user
      return user.value
    } catch (err: any) {
      // 401 = not logged in
      if (err?.status === 401) {
        user.value = null
        return null
      }
      // Any other error: don't keep stale user in UI
      user.value = null
      throw err
    }
  }

  /**
   * Vuelve a cargar roles y permisos desde el servidor (GET /api/auth/user).
   * Tras mutaciones en Configuración que afecten permisos en sesión, para `usePermissions`, PermissionGate, menú, etc.
   * No relanza error; devuelve el usuario o null.
   *
   * Llamado desde: `settings/roles/[id]/edit`, `settings/roles/index` (eliminar rol),
   * `settings/users/[id]/edit` (si editas tu propio usuario), `settings/users/index` (eliminarse a sí mismo).
   */
  async function refetchUserSilently() {
    try {
      const res = await $api<{ user: AuthUser | null }>('/auth/user')
      user.value = res.user
      return user.value
    } catch (err: any) {
      if (err?.status === 401) {
        user.value = null
      }
      return null
    }
  }

  async function login(payload: LoginPayload) {
    loading.value = true
    try {
      await $csrf()
      const res = await $api<{ user: AuthUser }>('/auth/login', {
        method: 'POST',
        body: payload
      })
      user.value = res.user
      // Reset checked state so middleware re-evaluates on next navigation
      const checked = useState<boolean>('auth.checked', () => false)
      checked.value = false
      return user.value
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    loading.value = true
    try {
      await $csrf()
      await $api('/auth/logout', { method: 'POST' })
      user.value = null
      // Reset checked state
      const checked = useState<boolean>('auth.checked', () => false)
      checked.value = false
    } finally {
      loading.value = false
    }
  }

  async function forgotPassword(email: string) {
    loading.value = true
    try {
      await $csrf()
      await $api('/auth/forgot-password', {
        method: 'POST',
        body: { email }
      })
      return true
    } finally {
      loading.value = false
    }
  }

  async function resetPassword(payload: ResetPasswordPayload) {
    loading.value = true
    try {
      await $csrf()
      const res = await $api<{ ok: boolean; user: AuthUser | null }>('/auth/reset-password', {
        method: 'POST',
        body: payload
      })
      user.value = res.user
      // Reset checked state
      const checked = useState<boolean>('auth.checked', () => false)
      checked.value = false
      return res
    } finally {
      loading.value = false
    }
  }

  return {
    user,
    loading,
    fetchUser,
    refetchUserSilently,
    login,
    logout,
    forgotPassword,
    resetPassword
  }
}
