import type { Ref } from 'vue'

/**
 * Sucursal asignada al asesor en radicación.
 * La cooperativa tiene una sola agencia; el paso 4 muestra la sucursal del usuario.
 */
export function useRadicacionAssignedSucursal(agencyId: Ref<number>) {
  const { $api, $csrf } = useNuxtApp()
  const { user: authUser, fetchUser } = useAuth()

  const defaultAgencyLoading = ref(false)
  const defaultAgencyError = ref<string | null>(null)

  const assignedSucursalId = computed(() => authUser.value?.sucursal_id ?? null)
  const assignedSucursal = computed(() => authUser.value?.sucursal ?? null)
  const hasAssignedSucursal = computed(() => (assignedSucursalId.value ?? 0) > 0)
  const isAssignedSucursalActive = computed(() => assignedSucursal.value?.is_active !== false)

  const assignedSucursalLabel = computed(() => {
    const s = assignedSucursal.value
    if (!s) {
      return '—'
    }
    const base = s.code ? `${s.name} (${s.code})` : s.name
    if (!isAssignedSucursalActive.value) {
      return `${base} — inactiva`
    }
    return base
  })

  async function ensureAuthSucursalLoaded(): Promise<void> {
    if (authUser.value?.sucursal_id && !authUser.value?.sucursal) {
      await fetchUser()
    }
  }

  async function loadDefaultAgency(): Promise<void> {
    defaultAgencyLoading.value = true
    defaultAgencyError.value = null
    try {
      await $csrf()
      const res = await $api<{ data: Array<{ id: number }> }>('/catalogs/agencies')
      const list = Array.isArray(res.data) ? res.data : []
      if (!list.length) {
        defaultAgencyError.value = 'No hay agencia activa configurada. Contacte al administrador.'
        return
      }
      const firstId = list[0]?.id ?? 0
      if (agencyId.value <= 0 || !list.some(a => a.id === agencyId.value)) {
        agencyId.value = firstId
      }
    } catch {
      defaultAgencyError.value = 'No se pudo cargar la agencia. Revise la conexión con el servidor.'
    } finally {
      defaultAgencyLoading.value = false
    }
  }

  async function initRadicacionSucursalContext(): Promise<void> {
    await ensureAuthSucursalLoaded()
    await loadDefaultAgency()
  }

  function hasValidSucursalSelection(): boolean {
    if (!hasAssignedSucursal.value || !isAssignedSucursalActive.value) {
      return false
    }
    return agencyId.value > 0
  }

  return {
    assignedSucursalId,
    assignedSucursalLabel,
    hasAssignedSucursal,
    isAssignedSucursalActive,
    hasValidSucursalSelection,
    initRadicacionSucursalContext,
    defaultAgencyLoading,
    defaultAgencyError,
  }
}
