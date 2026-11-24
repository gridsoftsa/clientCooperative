export type WorkflowInboxScope = 'mine' | 'following' | 'area' | 'all'

export function useWorkflowInboxScope() {
  const { hasPermission } = usePermissions()

  const canViewTeam = computed(() => hasPermission('workflow_equipo_ver'))
  const canViewAllTasks = computed(() => hasPermission('workflow_ver_todas'))

  function resolveDefaultScope(): WorkflowInboxScope {
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
