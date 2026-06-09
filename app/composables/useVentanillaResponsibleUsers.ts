import type { VentanillaResponsibleUserRow } from '~/types/ventanilla'

export function useVentanillaResponsibleUsers() {
  const ventanillaApi = useVentanillaApi()
  const responsibleUsers = ref<VentanillaResponsibleUserRow[]>([])
  const loadingResponsibleUsers = ref(false)

  async function loadResponsibleUsers(
    orgUnitId: number | null | undefined,
    includeUserId?: number | null,
  ): Promise<void> {
    if (!orgUnitId) {
      responsibleUsers.value = []
      return
    }

    loadingResponsibleUsers.value = true
    try {
      responsibleUsers.value = await ventanillaApi.fetchResponsibleUsers(orgUnitId, includeUserId ?? undefined)
    } catch {
      responsibleUsers.value = []
    } finally {
      loadingResponsibleUsers.value = false
    }
  }

  function clearAssignedUserIfMissing(
    assignedUserId: Ref<number | null>,
  ): void {
    if (
      assignedUserId.value !== null
      && !responsibleUsers.value.some((user) => user.id === assignedUserId.value)
    ) {
      assignedUserId.value = null
    }
  }

  return {
    responsibleUsers,
    loadingResponsibleUsers,
    loadResponsibleUsers,
    clearAssignedUserIfMissing,
  }
}
