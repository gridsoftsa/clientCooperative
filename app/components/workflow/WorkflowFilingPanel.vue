<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { WorkflowFilingContext } from '~/types/workflow'

const props = defineProps<{
  filingId: number
}>()

const emit = defineEmits<{
  changed: []
}>()

const { hasPermission } = usePermissions()
const { user: authUser } = useAuth()
const workflowApi = useWorkflowApi()

const loading = ref(false)
const context = ref<WorkflowFilingContext | null>(null)
const users = ref<Array<{ id: number, name: string }>>([])
const actionsOpen = ref(false)

const canView = computed(() => hasPermission('workflow_ver'))
const canManage = computed(() => hasPermission('workflow_gestionar'))
const isMyOpenTask = computed(() =>
  context.value?.open_task?.assignee?.id != null
  && context.value.open_task.assignee.id === authUser.value?.id,
)
const canActOnOpenTask = computed(() => canManage.value && isMyOpenTask.value)

const openTaskCard = computed(() => {
  if (!context.value?.open_task)
    return null

  const task = context.value.open_task

  return {
    id: task.id,
    status: task.status,
    traffic_light_status: task.traffic_light_status,
    started_at: task.started_at,
    due_at: task.due_at,
    days_overdue: task.days_overdue,
    stage: task.stage,
    assignee: task.assignee,
    instance: context.value.instance ? { id: context.value.instance.id, status: context.value.instance.status } : null,
    subject: null,
    workflow: context.value.workflow,
  }
})

const slaAlertMessage = computed(() => context.value?.sla_alerts?.[0]?.message ?? null)

async function load() {
  if (!canView.value)
    return

  loading.value = true

  try {
    const [ctx, userList] = await Promise.all([
      workflowApi.fetchFilingContext(props.filingId),
      workflowApi.fetchAssignableUsers(),
    ])
    context.value = ctx
    users.value = userList
  }
  catch {
    context.value = null
  }
  finally {
    loading.value = false
  }
}

function eventLabel(type: string) {
  const labels: Record<string, string> = {
    instance_started: 'Inicio del proceso',
    task_created: 'Tarea creada',
    advanced: 'Avance de etapa',
    returned: 'Devolución',
    reassigned: 'Reasignación',
    comment: 'Comentario',
    completed: 'Proceso cerrado',
    cancelled: 'Proceso cancelado',
    escalated: 'Escalamiento SLA etapa',
  }

  return labels[type] ?? type
}

function trafficClass(status: string | null | undefined) {
  if (status === 'red')
    return 'bg-destructive'
  if (status === 'orange')
    return 'bg-amber-500'
  if (status === 'green')
    return 'bg-emerald-500'

  return 'bg-muted-foreground/40'
}

watch(() => props.filingId, () => load(), { immediate: true })

defineExpose({ reload: load })
</script>

<template>
  <Card
    v-if="canView && (loading || context)"
    :class="isMyOpenTask ? 'border-primary ring-1 ring-primary/30' : undefined"
  >
    <CardHeader>
      <CardTitle class="text-base flex flex-wrap items-center gap-2">
        Workflow
        <Badge v-if="isMyOpenTask" variant="default">
          Su tarea
        </Badge>
      </CardTitle>
      <CardDescription v-if="context?.workflow">
        {{ context.workflow.name }}
      </CardDescription>
    </CardHeader>
    <CardContent class="space-y-4">
      <div v-if="loading" class="space-y-2">
        <Skeleton class="h-4 w-3/4" />
        <Skeleton class="h-16 w-full" />
      </div>

      <template v-else-if="context">
        <Alert
          v-for="warning in context.warnings ?? []"
          :key="warning.code"
          variant="destructive"
          class="border-amber-500/50 bg-amber-50 text-amber-950 dark:bg-amber-950/30 dark:text-amber-100"
        >
          <Icon name="i-lucide-triangle-alert" class="size-4" />
          <AlertTitle>Atención</AlertTitle>
          <AlertDescription>
            {{ warning.message }}
          </AlertDescription>
        </Alert>

        <div class="flex flex-wrap items-center gap-2">
          <Badge variant="outline">
            {{ context.is_active ? 'En curso' : context.instance.status }}
          </Badge>
          <Badge v-if="context.current_stage" variant="secondary">
            {{ context.current_stage.name }}
          </Badge>
        </div>

        <p v-if="isMyOpenTask" class="text-sm text-primary">
          Tiene la tarea activa de este radicado. Puede gestionarla aquí o desde la bandeja.
        </p>
        <NuxtLink v-if="hasPermission('workflow_ver')" to="/workflow/bandeja" class="inline-block text-sm text-muted-foreground underline-offset-4 hover:underline">
          Ir a bandeja de tareas
        </NuxtLink>

        <Alert
          v-if="context.task_escalation"
          variant="destructive"
        >
          <Icon name="i-lucide-arrow-up-right" class="size-4" />
          <AlertTitle>Escalamiento de etapa</AlertTitle>
          <AlertDescription class="space-y-1">
            <p>{{ context.task_escalation.message }}</p>
            <p class="text-xs opacity-90">
              {{ context.task_escalation.business_days_overdue }} día{{ context.task_escalation.business_days_overdue === 1 ? '' : 's' }} hábil{{ context.task_escalation.business_days_overdue === 1 ? '' : 'es' }} vencido{{ context.task_escalation.business_days_overdue === 1 ? '' : 's' }}
              <span v-if="context.task_escalation.escalated_at">
                · {{ new Date(context.task_escalation.escalated_at).toLocaleString('es-CO') }}
              </span>
            </p>
          </AlertDescription>
        </Alert>

        <Alert
          v-else-if="slaAlertMessage"
          variant="destructive"
          class="border-amber-500/50 bg-amber-50 text-amber-950 dark:bg-amber-950/30 dark:text-amber-100"
        >
          <Icon name="i-lucide-clock" class="size-4" />
          <AlertTitle>SLA de etapa</AlertTitle>
          <AlertDescription>
            {{ slaAlertMessage }}
          </AlertDescription>
        </Alert>

        <div v-if="context.open_task" class="rounded-lg border p-3 space-y-2">
          <div class="flex flex-wrap items-center gap-2 text-sm">
            <span class="inline-block size-2.5 rounded-full" :class="trafficClass(context.open_task.traffic_light_status)" />
            <span class="font-medium">Tarea activa</span>
            <VentanillaTrafficLightBadge
              v-if="context.open_task.traffic_light_status"
              :status="context.open_task.traffic_light_status"
              scope-label="SLA etapa"
            />
          </div>
          <p class="text-sm text-muted-foreground">
            Responsable: {{ context.open_task.assignee?.name ?? 'Sin asignar' }}
          </p>
          <p v-if="context.open_task.due_at" class="text-sm text-muted-foreground">
            Vence etapa: {{ new Date(context.open_task.due_at).toLocaleString('es-CO') }}
            <span
              v-if="context.open_task.days_overdue"
              class="text-destructive"
            >
              ({{ context.open_task.days_overdue }} día{{ context.open_task.days_overdue === 1 ? '' : 's' }} de retraso)
            </span>
          </p>
          <Button
            v-if="canActOnOpenTask && context.open_task"
            size="sm"
            variant="outline"
            @click="actionsOpen = true"
          >
            Gestionar tarea
          </Button>
          <p
            v-else-if="canManage && context.open_task && !isMyOpenTask"
            class="text-xs text-muted-foreground"
          >
            Solo el responsable asignado puede ejecutar acciones sobre esta tarea.
          </p>
        </div>

        <div v-if="context.events.length" class="space-y-2">
          <p class="text-sm font-medium">
            Historial
          </p>
          <div class="max-h-48 space-y-2 overflow-y-auto">
            <div
              v-for="event in context.events.slice(0, 8)"
              :key="event.id"
              class="rounded border px-2 py-1.5 text-xs"
            >
              <div class="flex justify-between gap-2">
                <span class="font-medium">{{ eventLabel(event.event_type) }}</span>
                <span class="text-muted-foreground shrink-0">
                  {{ event.created_at ? new Date(event.created_at).toLocaleDateString('es-CO') : '' }}
                </span>
              </div>
              <p v-if="event.description" class="text-muted-foreground">
                {{ event.description }}
              </p>
            </div>
          </div>
        </div>
      </template>
    </CardContent>

    <WorkflowTaskActionsSheet
      v-if="openTaskCard"
      v-model:open="actionsOpen"
      :task="openTaskCard"
      :context="context"
      :users="users"
      @changed="load(); emit('changed')"
    />
  </Card>
</template>
