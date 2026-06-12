<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { WorkflowBoardData, WorkflowFilingContext, WorkflowTaskCard } from '~/types/workflow'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'workflow_ver',
})

const router = useRouter()
const { hasPermission } = usePermissions()
const workflowApi = useWorkflowApi()

const loading = ref(true)
const board = ref<WorkflowBoardData>({ definition: null, columns: [] })
const definitions = ref<Array<{ id: number, key: string, name: string }>>([])
const ALL_DEFINITIONS = 'all'
const definitionId = ref<string>(ALL_DEFINITIONS)
const { scope, canViewTeam, canViewAllTasks } = useWorkflowInboxScope()
const statusFilter = ref<'open' | 'overdue' | 'due_soon'>('open')
const functionalTypeKey = ref<string>('')

const users = ref<Array<{ id: number, name: string }>>([])
const actionsOpen = ref(false)
const selectedTask = ref<WorkflowTaskCard | null>(null)
const taskContext = ref<WorkflowFilingContext | null>(null)

const canManage = computed(() => hasPermission('workflow_gestionar'))
const { ensureLoaded } = useVentanillaFunctionalTypeLabels()

async function loadDefinitions() {
  try {
    definitions.value = await workflowApi.fetchActiveDefinitions()
  }
  catch {
    definitions.value = []
  }
}

async function loadBoard() {
  loading.value = true

  try {
    const query: Record<string, string> = {
      scope: scope.value,
      status: statusFilter.value,
    }

    if (functionalTypeKey.value)
      query.functional_type_key = functionalTypeKey.value

    if (definitionId.value && definitionId.value !== ALL_DEFINITIONS) {
      query.workflow_definition_id = definitionId.value
    }

    board.value = await workflowApi.fetchBoard(query)
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

async function openManage(task: WorkflowTaskCard) {
  selectedTask.value = task

  if (task.subject?.id) {
    taskContext.value = await workflowApi.fetchFilingContext(task.subject.id)
  }
  else {
    taskContext.value = null
  }

  if (users.value.length === 0) {
    users.value = await workflowApi.fetchAssignableUsers()
  }

  actionsOpen.value = true
}

watch([scope, statusFilter, functionalTypeKey, definitionId], () => {
  loadBoard()
})

onMounted(async () => {
  await Promise.all([ensureLoaded(), loadDefinitions()])
  await loadBoard()
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">
          Workflow y tareas
        </h1>
        <p class="text-sm text-muted-foreground">
          Tablero por etapas
          <span v-if="board.definition"> · {{ board.definition.name }}</span>
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

    <Card>
      <CardHeader class="pb-3">
        <div class="flex flex-wrap gap-3">
          <Tabs v-model="scope" default-value="mine" class="w-auto">
            <TabsList>
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
            <SelectTrigger class="w-[180px]">
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

          <Select v-if="definitions.length" v-model="definitionId">
            <SelectTrigger class="w-[220px]">
              <SelectValue placeholder="Flujo de trabajo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem :value="ALL_DEFINITIONS">
                Todos los flujos
              </SelectItem>
              <SelectItem
                v-for="def in definitions"
                :key="def.id"
                :value="String(def.id)"
              >
                {{ def.name }}
              </SelectItem>
            </SelectContent>
          </Select>

          <Input
            v-model="functionalTypeKey"
            class="w-[200px]"
            placeholder="Tipo funcional (clave)"
          />
        </div>
      </CardHeader>
      <CardContent>
        <WorkflowBoard
          :columns="board.columns"
          :loading="loading"
          :can-manage="canManage"
          @refresh="loadBoard"
          @open-task="openTask"
          @manage="openManage"
        />
      </CardContent>
    </Card>

    <WorkflowTaskActionsSheet
      v-if="actionsOpen && selectedTask"
      v-model:open="actionsOpen"
      :task="selectedTask"
      :context="taskContext"
      :users="users"
      @changed="loadBoard"
    />
  </div>
</template>
