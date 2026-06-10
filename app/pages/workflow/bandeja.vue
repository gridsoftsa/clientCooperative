<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { WorkflowFilingContext, WorkflowTaskCard } from '~/types/workflow'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'workflow_ver',
})

const router = useRouter()
const { hasPermission } = usePermissions()
const workflowApi = useWorkflowApi()

const loading = ref(true)
const tasks = ref<WorkflowTaskCard[]>([])
const meta = ref({ current_page: 1, last_page: 1, per_page: 20, total: 0 })
const scope = ref<'mine' | 'area'>('mine')
const statusFilter = ref<'open' | 'overdue' | 'due_soon' | 'completed'>('open')
const definitions = ref<Array<{ id: number, key: string, name: string }>>([])
const definitionId = ref<string>('')

const users = ref<Array<{ id: number, name: string }>>([])
const actionsOpen = ref(false)
const selectedTask = ref<WorkflowTaskCard | null>(null)
const taskContext = ref<WorkflowFilingContext | null>(null)

const canManage = computed(() => hasPermission('workflow_gestionar'))
const canViewTeam = computed(() => hasPermission('workflow_equipo_ver'))

async function loadDefinitions() {
  try {
    definitions.value = await workflowApi.fetchActiveDefinitions()
  }
  catch {
    definitions.value = []
  }
}

async function loadTasks(page = 1) {
  loading.value = true

  try {
    const query: Record<string, string | number> = {
      scope: scope.value,
      status: statusFilter.value,
      page,
      per_page: meta.value.per_page,
    }

    if (definitionId.value)
      query.workflow_definition_id = Number(definitionId.value)

    const result = await workflowApi.fetchTasks(query)
    tasks.value = result.data
    meta.value = result.meta
  }
  catch {
    toast.error('No se pudo cargar la bandeja.')
  }
  finally {
    loading.value = false
  }
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

function openFiling(task: WorkflowTaskCard) {
  if (task.subject?.id)
    router.push(`/ventanilla/${task.subject.id}`)
}

function trafficClass(status: WorkflowTaskCard['traffic_light_status']) {
  if (status === 'red')
    return 'text-destructive'
  if (status === 'orange')
    return 'text-amber-600'

  return 'text-emerald-600'
}

watch([scope, statusFilter, definitionId], () => loadTasks(1))

onMounted(async () => {
  await loadDefinitions()
  await loadTasks()
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">
          Bandeja de tareas
        </h1>
        <p class="text-sm text-muted-foreground">
          Vista en lista — {{ meta.total }} tarea(s)
        </p>
      </div>
      <div class="flex gap-2">
        <NuxtLink to="/workflow">
          <Button variant="outline" size="sm">
            Tablero
          </Button>
        </NuxtLink>
        <Button variant="outline" size="sm" @click="loadTasks(meta.current_page)">
          Actualizar
        </Button>
      </div>
    </div>

    <Card>
      <CardHeader class="pb-3">
        <div class="flex flex-wrap gap-3">
          <Tabs v-model="scope" default-value="mine">
            <TabsList>
              <TabsTrigger value="mine">
                Mis tareas
              </TabsTrigger>
              <TabsTrigger v-if="canViewTeam" value="area">
                Mi equipo
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Select v-model="statusFilter">
            <SelectTrigger class="w-[180px]">
              <SelectValue />
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
              <SelectItem value="completed">
                Completadas
              </SelectItem>
            </SelectContent>
          </Select>

          <Select v-if="definitions.length" v-model="definitionId">
            <SelectTrigger class="w-[220px]">
              <SelectValue placeholder="Todos los flujos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">
                Todos los flujos
              </SelectItem>
              <SelectItem v-for="def in definitions" :key="def.id" :value="String(def.id)">
                {{ def.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div v-if="loading" class="space-y-2">
          <Skeleton v-for="i in 5" :key="i" class="h-14 w-full" />
        </div>

        <div v-else-if="tasks.length === 0" class="py-10 text-center text-muted-foreground">
          No hay tareas con estos filtros.
        </div>

        <div v-else class="divide-y rounded-lg border">
          <div
            v-for="task in tasks"
            :key="task.id"
            class="flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-accent/30"
          >
            <div class="min-w-0 flex-1 cursor-pointer" @click="openFiling(task)">
              <div class="flex items-center gap-2 text-sm">
                <Icon name="lucide:circle" class="size-3" :class="trafficClass(task.traffic_light_status)" />
                <span class="font-medium">{{ task.subject?.filing_number ?? `Tarea #${task.id}` }}</span>
                <Badge variant="outline">
                  {{ task.stage?.name }}
                </Badge>
              </div>
              <p class="truncate text-sm text-muted-foreground">
                {{ task.subject?.subject ?? '—' }}
              </p>
              <p class="text-xs text-muted-foreground">
                {{ task.assignee?.name ?? 'Sin responsable' }}
                <span v-if="task.due_at"> · vence {{ new Date(task.due_at).toLocaleDateString('es-CO') }}</span>
                <span v-if="task.days_overdue" class="text-destructive"> · {{ task.days_overdue }}d vencido</span>
              </p>
            </div>
            <div class="flex gap-2">
              <Button v-if="canManage" size="sm" variant="outline" @click="openManage(task)">
                Gestionar
              </Button>
              <Button size="sm" variant="ghost" @click="openFiling(task)">
                Abrir
              </Button>
            </div>
          </div>
        </div>

        <div v-if="meta.last_page > 1" class="mt-4 flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            :disabled="meta.current_page <= 1"
            @click="loadTasks(meta.current_page - 1)"
          >
            Anterior
          </Button>
          <span class="flex items-center text-sm text-muted-foreground">
            {{ meta.current_page }} / {{ meta.last_page }}
          </span>
          <Button
            variant="outline"
            size="sm"
            :disabled="meta.current_page >= meta.last_page"
            @click="loadTasks(meta.current_page + 1)"
          >
            Siguiente
          </Button>
        </div>
      </CardContent>
    </Card>

    <WorkflowTaskActionsSheet
      v-model:open="actionsOpen"
      :task="selectedTask"
      :context="taskContext"
      :users="users"
      @changed="loadTasks(meta.current_page)"
    />
  </div>
</template>
