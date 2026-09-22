<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { WorkflowBoardData, WorkflowBoardFlow, WorkflowTaskCard } from '~/types/workflow'
import WorkflowFlowWorkspace from '~/components/workflow/WorkflowFlowWorkspace.vue'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'workflow_ver',
})

const router = useRouter()
const { hasPermission } = usePermissions()
const workflowApi = useWorkflowApi()

const loading = ref(true)
const board = ref<WorkflowBoardData>({ definition: null, columns: [], flows: [] })
const ALL_DEFINITIONS = 'all'
const definitionId = ref<string>(ALL_DEFINITIONS)
const { scope, canViewTeam, canViewAllTasks } = useWorkflowInboxScope()
const statusFilter = ref<'open' | 'overdue' | 'due_soon'>('open')

const canManage = computed(() => hasPermission('workflow_gestionar'))
const { ensureLoaded } = useVentanillaFunctionalTypeLabels()
const showingAllTypes = computed(() => definitionId.value === ALL_DEFINITIONS)
const typeFlows = computed<WorkflowBoardFlow[]>(() => board.value.flows ?? [])
const selectedFlow = computed(() =>
  typeFlows.value.find(flow => String(flow.id) === definitionId.value) ?? null,
)
const visibleColumns = computed(() => {
  if (showingAllTypes.value) {
    return []
  }

  return board.value.columns
    .filter(column => String(column.definition_id) === definitionId.value)
    .map((column) => {
      const stageName = selectedFlow.value?.stages.find(stage => stage.id === column.id)?.name

      return {
        ...column,
        title: stageName || column.title,
      }
    })
})

async function loadBoard() {
  loading.value = true

  try {
    board.value = await workflowApi.fetchBoard({
      scope: scope.value,
      status: statusFilter.value,
    })

    if (
      definitionId.value === ALL_DEFINITIONS
      || !typeFlows.value.some(flow => String(flow.id) === definitionId.value)
    ) {
      const preferred = typeFlows.value.find(flow => flow.task_count > 0) ?? typeFlows.value[0]
      definitionId.value = preferred ? String(preferred.id) : ALL_DEFINITIONS
    }
  }
  catch {
    toast.error('No se pudo cargar el tablero de tareas.')
  }
  finally {
    loading.value = false
  }
}

function openTask(task: WorkflowTaskCard) {
  if (task.subject?.id)
    router.push(`/ventanilla/${task.subject.id}`)
}

function openManage(task: WorkflowTaskCard) {
  router.push({
    path: `/workflow/tareas/${task.id}`,
    query: { from: 'board' },
  })
}

watch([scope, statusFilter], () => {
  void loadBoard()
})

onMounted(async () => {
  await ensureLoaded()
  await loadBoard()
})
</script>

<template>
  <div class="min-w-0 space-y-6">
    <div class="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div class="min-w-0">
        <h1 class="text-2xl font-semibold tracking-tight">
          Workflow y tareas
        </h1>
        <p class="text-sm text-muted-foreground">
          Tipos a la izquierda, recorrido del flujo a la derecha.
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <NuxtLink to="/workflow/bandeja">
          <Button variant="outline" size="sm">
            <Icon name="lucide:list" class="mr-1 size-4" />
            Bandeja lista
          </Button>
        </NuxtLink>
        <Button variant="outline" size="sm" @click="loadBoard">
          <Icon name="lucide:refresh-cw" class="mr-1 size-4" />
          Actualizar
        </Button>
        <NuxtLink v-if="hasPermission('workflow_definir')" to="/workflow/configuracion">
          <Button variant="outline" size="sm">
            <Icon name="lucide:settings-2" class="mr-1 size-4" />
            Configurar flujos
          </Button>
        </NuxtLink>
      </div>
    </div>

    <Card class="min-w-0 overflow-hidden">
      <CardHeader class="pb-3">
        <div class="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Tabs v-model="scope" default-value="mine" class="min-w-0 sm:col-span-2 xl:col-span-1">
            <TabsList class="flex h-auto w-full flex-wrap justify-start">
              <TabsTrigger value="mine">
                Mis tareas
              </TabsTrigger>
              <TabsTrigger v-if="canViewTeam" value="area">
                Mi equipo
              </TabsTrigger>
              <TabsTrigger v-if="canViewAllTasks" value="all">
                Todas
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Select v-model="statusFilter">
            <SelectTrigger class="w-full min-w-0">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">
                Activas
              </SelectItem>
              <SelectItem value="overdue">
                Vencidas
              </SelectItem>
              <SelectItem value="due_soon">
                Por vencer
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent class="p-0 sm:p-0">
        <WorkflowFlowWorkspace
          :flows="typeFlows"
          :selected-id="definitionId"
          :columns="visibleColumns"
          :loading="loading"
          :can-manage="canManage"
          @select="definitionId = $event"
          @refresh="loadBoard"
          @open-task="openTask"
          @manage="openManage"
        />
      </CardContent>
    </Card>
  </div>
</template>
