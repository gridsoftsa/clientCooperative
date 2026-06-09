<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { WorkflowBoardData, WorkflowTaskCard } from '~/types/workflow'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'workflow_ver',
})

const router = useRouter()
const { hasPermission } = usePermissions()
const { fetchBoard, advanceTask } = useWorkflowApi()

const loading = ref(true)
const board = ref<WorkflowBoardData>({ definition: null, columns: [] })
const scope = ref<'mine' | 'area'>('mine')
const statusFilter = ref<'open' | 'overdue' | 'due_soon'>('open')
const functionalTypeKey = ref<string>('')

const canManage = computed(() => hasPermission('workflow_gestionar'))
const canViewTeam = computed(() => hasPermission('workflow_equipo_ver'))

async function loadBoard() {
  loading.value = true

  try {
    const query: Record<string, string> = {
      scope: scope.value,
      status: statusFilter.value,
    }

    if (functionalTypeKey.value)
      query.functional_type_key = functionalTypeKey.value

    board.value = await fetchBoard(query)
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

async function handleAdvance(task: WorkflowTaskCard) {
  try {
    await advanceTask(task.id)
    toast.success('Tarea avanzada.')
    await loadBoard()
  }
  catch {
    toast.error('No se pudo avanzar la tarea.')
  }
}

watch([scope, statusFilter, functionalTypeKey], () => {
  loadBoard()
})

onMounted(() => {
  loadBoard()
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
          Tablero por etapas — estilo bandeja de trabajo
          <span v-if="board.definition"> · {{ board.definition.name }}</span>
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
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
                Mi área
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
          @advance="handleAdvance"
        />
      </CardContent>
    </Card>
  </div>
</template>
