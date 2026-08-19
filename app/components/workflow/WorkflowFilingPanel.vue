<script setup lang="ts">
import { toast } from 'vue-sonner'
import ArchivalFileWorkflowUploadPanel from '~/components/workflow/ArchivalFileWorkflowUploadPanel.vue'
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
const loadError = ref<string | null>(null)

const canView = computed(() => hasPermission('workflow_ver'))
const canManage = computed(() => hasPermission('workflow_gestionar'))
const isMyOpenTask = computed(() =>
  context.value?.open_task?.assignee?.id != null
  && context.value.open_task.assignee.id === authUser.value?.id,
)
const canActOnOpenTask = computed(() => canManage.value && isMyOpenTask.value)

const slaAlertMessage = computed(() => context.value?.sla_alerts?.[0]?.message ?? null)

const displayStageName = computed(() => {
  const ctx = context.value
  if (!ctx) {
    return '—'
  }

  if (ctx.open_task?.stage?.name) {
    return ctx.open_task.stage.name
  }

  if (ctx.current_stage?.name) {
    return ctx.current_stage.name
  }

  if (!ctx.is_active) {
    return 'Proceso cerrado'
  }

  return 'Sin etapa asignada'
})

const stageSpotlightActive = computed(() => context.value?.is_active === true)

async function load() {
  if (!canView.value) {
    return
  }

  loading.value = true
  loadError.value = null

  try {
    context.value = await workflowApi.fetchFilingContext(props.filingId)
  }
  catch {
    context.value = null
    loadError.value = 'No se pudo cargar el estado del workflow.'
  }
  finally {
    loading.value = false
  }
}

async function openTaskActions() {
  await load()
  if (!context.value?.open_task) {
    toast.error('No hay tarea activa en este proceso. Actualice la vista.')
    return
  }

  await navigateTo({
    path: `/workflow/tareas/${context.value.open_task.id}`,
    query: { from: `ventanilla/${props.filingId}` },
  })
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

watch(() => props.filingId, () => load(), { immediate: true })

defineExpose({ reload: load })
</script>

<template>
  <Card
    v-if="canView"
    :class="isMyOpenTask ? 'border-primary ring-1 ring-primary/30' : undefined"
  >
    <CardHeader class="flex flex-row items-start justify-between gap-4 space-y-0">
      <div class="min-w-0 space-y-1">
        <CardTitle class="text-base flex flex-wrap items-center gap-2">
          Workflow
          <Badge v-if="isMyOpenTask" variant="default">
            Su tarea
          </Badge>
        </CardTitle>
        <CardDescription v-if="context?.workflow">
          {{ context.workflow.name }}
        </CardDescription>
      </div>
      <NuxtLink
        v-if="hasPermission('workflow_ver')"
        to="/workflow/bandeja"
        class="shrink-0"
      >
        <Button variant="outline" size="sm" class="gap-1.5">
          <Icon name="i-lucide-inbox" class="size-4" />
          <span class="hidden sm:inline">Bandeja de tareas</span>
          <span class="sm:hidden">Bandeja</span>
        </Button>
      </NuxtLink>
    </CardHeader>
    <CardContent class="space-y-4">
      <div v-if="loading" class="space-y-2">
        <Skeleton class="h-4 w-3/4" />
        <Skeleton class="h-16 w-full" />
      </div>

      <Alert v-else-if="loadError" variant="destructive">
        <Icon name="i-lucide-circle-alert" class="size-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription class="space-y-2">
          <p>{{ loadError }}</p>
          <Button size="sm" variant="outline" @click="load">
            Reintentar
          </Button>
        </AlertDescription>
      </Alert>

      <p v-else-if="!context" class="text-sm text-muted-foreground">
        Este radicado no tiene un proceso de workflow activo o histórico.
      </p>

      <template v-else>
        <div
          class="relative overflow-hidden rounded-xl border p-4 sm:p-5"
          :class="stageSpotlightActive
            ? 'border-primary/40 bg-gradient-to-br from-primary/12 via-primary/5 to-transparent'
            : 'border-emerald-500/35 bg-gradient-to-br from-emerald-500/12 via-emerald-500/5 to-transparent'"
        >
          <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div class="flex min-w-0 items-start gap-4">
              <div
                class="flex size-12 shrink-0 items-center justify-center rounded-xl ring-1"
                :class="stageSpotlightActive
                  ? 'bg-primary/15 text-primary ring-primary/25'
                  : 'bg-emerald-500/15 text-emerald-700 ring-emerald-500/25 dark:text-emerald-300'"
              >
                <Icon
                  :name="stageSpotlightActive ? 'i-lucide-git-branch' : 'i-lucide-circle-check'"
                  class="size-6"
                />
              </div>
              <div class="min-w-0 space-y-1">
                <p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {{ stageSpotlightActive ? 'Etapa actual' : 'Estado del proceso' }}
                </p>
                <p class="text-2xl font-semibold leading-tight tracking-tight">
                  {{ displayStageName }}
                </p>
                <p v-if="context.workflow?.name" class="text-sm text-muted-foreground">
                  {{ context.workflow.name }}
                </p>
              </div>
            </div>
            <div class="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">
              <Badge :variant="stageSpotlightActive ? 'default' : 'secondary'">
                {{ stageSpotlightActive ? 'En curso' : 'Completado' }}
              </Badge>
              <VentanillaTrafficLightBadge
                v-if="context.open_task?.traffic_light_status"
                :status="context.open_task.traffic_light_status"
                scope-label="SLA etapa"
              />
            </div>
          </div>

          <dl
            v-if="context.open_task && stageSpotlightActive"
            class="mt-4 grid gap-3 border-t border-border/60 pt-4 text-sm sm:grid-cols-2"
          >
            <div>
              <dt class="text-xs text-muted-foreground">
                Responsable de la etapa
              </dt>
              <dd class="mt-0.5 font-medium">
                {{ context.open_task.assignee?.name ?? 'Sin asignar' }}
              </dd>
            </div>
            <div v-if="context.open_task.due_at">
              <dt class="text-xs text-muted-foreground">
                Vence la etapa
              </dt>
              <dd class="mt-0.5 font-medium">
                {{ new Date(context.open_task.due_at).toLocaleString('es-CO') }}
                <span
                  v-if="context.open_task.days_overdue"
                  class="text-destructive"
                >
                  ({{ context.open_task.days_overdue }} día{{ context.open_task.days_overdue === 1 ? '' : 's' }} de retraso)
                </span>
              </dd>
            </div>
          </dl>
        </div>

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

        <Alert v-if="!context.is_active" class="border-emerald-500/40 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-100">
          <Icon name="i-lucide-circle-check" class="size-4" />
          <AlertTitle>Proceso completado</AlertTitle>
          <AlertDescription>
            El workflow de este radicado ya finalizó
            <span v-if="context.instance.completed_at">
              el {{ new Date(context.instance.completed_at).toLocaleString('es-CO') }}
            </span>.
          </AlertDescription>
        </Alert>

        <Alert
          v-else-if="context.advance_guidance"
          class="border-primary/40 bg-primary/5"
        >
          <Icon name="i-lucide-info" class="size-4" />
          <AlertTitle>Etapa de cierre</AlertTitle>
          <AlertDescription>
            {{ context.advance_guidance }}
          </AlertDescription>
        </Alert>

        <div
          v-if="hasPermission('workflow_ver')"
          class="flex flex-col gap-3 rounded-lg border border-border/80 bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="flex min-w-0 items-start gap-3">
            <div class="flex size-9 shrink-0 items-center justify-center rounded-md bg-background text-muted-foreground ring-1 ring-border">
              <Icon name="i-lucide-inbox" class="size-4" />
            </div>
            <div class="min-w-0 space-y-0.5">
              <p class="text-sm font-medium leading-snug">
                Bandeja de tareas
              </p>
              <p class="text-xs text-muted-foreground leading-relaxed">
                Revise pendientes, vencidas y tareas completadas del workflow.
              </p>
            </div>
          </div>
          <NuxtLink to="/workflow/bandeja" class="shrink-0">
            <Button variant="secondary" size="sm" class="w-full gap-1.5 sm:w-auto">
              Ir a bandeja
              <Icon name="i-lucide-arrow-right" class="size-4" />
            </Button>
          </NuxtLink>
        </div>

        <div
          v-if="isMyOpenTask"
          class="flex flex-col gap-4 rounded-lg border border-primary/25 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="flex min-w-0 items-start gap-3">
            <div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Icon name="i-lucide-clipboard-check" class="size-5" />
            </div>
            <div class="min-w-0 space-y-1">
              <p class="text-sm font-medium leading-snug">
                Tiene la tarea activa de este radicado
              </p>
              <p class="text-xs text-muted-foreground leading-relaxed">
                Puede gestionarla aquí o revisar todas sus pendientes en la bandeja.
              </p>
            </div>
          </div>
          <div class="flex shrink-0 flex-wrap gap-2">
            <Button
              v-if="canActOnOpenTask && context.open_task"
              size="sm"
              class="gap-1.5"
              @click="openTaskActions"
            >
              <Icon name="i-lucide-arrow-right" class="size-4" />
              Gestionar tarea
            </Button>
          </div>
        </div>

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

        <ArchivalFileWorkflowUploadPanel
          v-if="context.archival_file && context.open_task && canActOnOpenTask"
          :archival-context="context.archival_file"
          @uploaded="load(); emit('changed')"
        />

        <div v-if="context.open_task && (canActOnOpenTask || (canManage && !isMyOpenTask))" class="rounded-lg border border-dashed p-3">
          <p
            v-if="canManage && context.open_task && !isMyOpenTask"
            class="text-xs text-muted-foreground"
          >
            Solo el responsable asignado puede ejecutar acciones sobre esta tarea.
          </p>
          <Button
            v-if="canActOnOpenTask && context.open_task"
            size="sm"
            variant="outline"
            class="mt-2 gap-1.5"
            @click="openTaskActions"
          >
            <Icon name="i-lucide-arrow-right" class="size-4" />
            Abrir gestión de tarea
          </Button>
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
  </Card>
</template>
