export type WorkflowInboxScope = 'mine' | 'area' | 'all'

export function useWorkflowInboxScope() {
  const { hasPermission } = usePermissions()

  const canViewTeam = computed(() => hasPermission('workflow_equipo_ver'))
  const canViewAllTasks = computed(() => hasPermission('workflow_ver_todas'))

  function resolveDefaultScope(): WorkflowInboxScope {
    if (canViewAllTasks.value) {
      return 'all'
    }

    return 'mine'
  }

  const scope = ref<WorkflowInboxScope>(resolveDefaultScope())

  return {
    scope,
    canViewTeam,
    canViewAllTasks,
    resolveDefaultScope,
  }
}
