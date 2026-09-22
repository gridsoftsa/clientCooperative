<script setup lang="ts">
import type { WorkflowBoardColumn, WorkflowTaskCard } from '~/types/workflow'

const props = defineProps<{
  columns: WorkflowBoardColumn[]
  loading?: boolean
  canManage?: boolean
  hideStageFilter?: boolean
}>()

const emit = defineEmits<{
  refresh: []
  openTask: [task: WorkflowTaskCard]
  manage: [task: WorkflowTaskCard]
}>()

const { ensureLoaded, labelFor } = useVentanillaFunctionalTypeLabels()

const focusedStageId = ref<number | 'all'>('all')

const visibleColumns = computed(() => {
  if (focusedStageId.value === 'all') {
    return props.columns
  }

  return props.columns.filter(column => column.id === focusedStageId.value)
})

const isSingleStage = computed(() => focusedStageId.value !== 'all')

watch(
  () => props.columns.map(column => column.id).join(','),
  () => {
    if (focusedStageId.value === 'all') {
      return
    }

    if (!props.columns.some(column => column.id === focusedStageId.value)) {
      focusedStageId.value = 'all'
    }
  },
)

onMounted(() => {
  ensureLoaded()
})

function trafficLightClass(status: WorkflowTaskCard['traffic_light_status']) {
  if (status === 'red') {
    return 'bg-destructive'
  }
  if (status === 'orange') {
    return 'bg-amber-500'
  }
  if (status === 'green') {
    return 'bg-emerald-500'
  }

  return 'bg-muted-foreground/40'
}

function formatDueDate(value: string | null) {
  if (!value) {
    return 'Sin SLA'
  }

  return new Date(value).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function taskTitle(task: WorkflowTaskCard) {
  return task.subject?.subject ?? `Tarea #${task.id}`
}

function taskReference(task: WorkflowTaskCard) {
  return task.subject?.filing_number ?? `WF-${task.id}`
}

function functionalTypeLabel(task: WorkflowTaskCard) {
  return labelFor(
    task.subject?.functional_type_key,
    task.subject?.functional_type_label,
  )
}
</script>

<template>
  <div class="min-w-0 space-y-4">
    <div v-if="!loading && columns.length > 0 && !hideStageFilter" class="flex min-w-0 flex-wrap gap-2">
      <Button
        type="button"
        size="sm"
        :variant="focusedStageId === 'all' ? 'default' : 'outline'"
        class="h-8"
        @click="focusedStageId = 'all'"
      >
        Todas las etapas
        <Badge variant="secondary" class="ml-1.5 h-5 min-w-5 px-1 font-mono tabular-nums">
          {{ columns.reduce((sum, column) => sum + column.tasks.length, 0) }}
        </Badge>
      </Button>
      <Button
        v-for="col in columns"
        :key="col.id"
        type="button"
        size="sm"
        :variant="focusedStageId === col.id ? 'default' : 'outline'"
        class="h-8 max-w-full"
        @click="focusedStageId = col.id"
      >
        <span class="truncate">{{ col.title }}</span>
        <Badge variant="secondary" class="ml-1.5 h-5 min-w-5 shrink-0 px-1 font-mono tabular-nums">
          {{ col.tasks.length }}
        </Badge>
      </Button>
    </div>

    <div v-if="loading" class="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <Card v-for="i in 3" :key="i" class="min-w-0">
        <CardHeader class="px-3">
          <Skeleton class="h-5 w-32" />
        </CardHeader>
        <CardContent class="space-y-3 px-3">
          <Skeleton class="h-24 w-full" />
          <Skeleton class="h-24 w-full" />
        </CardContent>
      </Card>
    </div>

    <div
      v-else
      class="grid min-w-0 gap-4"
      :class="isSingleStage ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'"
    >
      <Card
        v-for="col in visibleColumns"
        :key="col.id"
        class="min-w-0 gap-3 self-start py-2"
      >
        <CardHeader class="flex flex-row items-center justify-between gap-2 px-3 py-2">
          <CardTitle class="flex min-w-0 items-center gap-2 text-base font-semibold">
            <span class="truncate">{{ col.title }}</span>
            <Badge variant="secondary" class="h-5 min-w-5 shrink-0 px-1 font-mono tabular-nums">
              {{ col.tasks.length }}
            </Badge>
          </CardTitle>
        </CardHeader>

        <CardContent
          class="space-y-3 overflow-y-auto px-3"
          :class="isSingleStage ? 'max-h-[min(70vh,40rem)]' : 'max-h-[min(28rem,50vh)]'"
        >
          <div
            v-if="col.tasks.length === 0"
            class="rounded-lg border border-dashed px-3 py-8 text-center text-sm text-muted-foreground"
          >
            Sin tareas
          </div>

          <div
            class="grid gap-3"
            :class="isSingleStage ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1'"
          >
            <div
              v-for="task in col.tasks"
              :key="task.id"
              class="min-w-0 rounded-xl border bg-card px-3 py-2 shadow-sm"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                  <span
                    class="inline-block size-2.5 shrink-0 rounded-full"
                    :class="trafficLightClass(task.traffic_light_status)"
                    :title="task.traffic_light_status ?? 'sin semáforo'"
                  />
                  <span class="truncate">{{ taskReference(task) }}</span>
                </div>
                <DropdownMenu v-if="canManage" @click.stop>
                  <DropdownMenuTrigger as-child>
                    <Button size="icon-sm" variant="ghost" class="size-7 shrink-0 text-muted-foreground">
                      <Icon name="lucide:ellipsis-vertical" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" class="min-w-[10rem]">
                    <DropdownMenuItem @click="emit('openTask', task)">
                      <Icon name="lucide:external-link" class="size-4" />
                      Ventanilla
                    </DropdownMenuItem>
                    <DropdownMenuItem @click="emit('manage', task)">
                      <Icon name="lucide:settings-2" class="size-4" />
                      Gestionar tarea
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <p class="mt-1 line-clamp-2 text-sm font-medium leading-5">
                {{ taskTitle(task) }}
              </p>

              <div class="mt-2 flex min-w-0 flex-wrap gap-1">
                <Badge v-if="functionalTypeLabel(task)" variant="outline" class="max-w-full truncate text-[10px] font-normal">
                  {{ functionalTypeLabel(task) }}
                </Badge>
                <Badge
                  v-if="task.days_overdue"
                  variant="destructive"
                  class="text-[10px]"
                >
                  {{ task.days_overdue }} d vencido
                </Badge>
              </div>

              <div class="mt-3 flex min-w-0 items-center justify-between gap-2 text-xs text-muted-foreground">
                <div class="flex min-w-0 items-center gap-1">
                  <Icon name="lucide:clock" class="size-3.5 shrink-0" />
                  <span class="truncate">{{ formatDueDate(task.due_at) }}</span>
                </div>
                <div v-if="task.assignee" class="flex min-w-0 items-center gap-1.5">
                  <Avatar class="size-5 shrink-0">
                    <AvatarFallback class="text-[9px]">
                      {{ task.assignee.name.slice(0, 2).toUpperCase() }}
                    </AvatarFallback>
                  </Avatar>
                  <span class="max-w-[7rem] truncate">{{ task.assignee.name }}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
