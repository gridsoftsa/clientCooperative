<script setup lang="ts">
import type { WorkflowBoardColumn, WorkflowTaskCard } from '~/types/workflow'

const props = defineProps<{
  columns: WorkflowBoardColumn[]
  loading?: boolean
  canManage?: boolean
}>()

const emit = defineEmits<{
  refresh: []
  openTask: [task: WorkflowTaskCard]
  manage: [task: WorkflowTaskCard]
}>()

const { ensureLoaded, labelFor } = useVentanillaFunctionalTypeLabels()

onMounted(() => {
  ensureLoaded()
})

function trafficLightClass(status: WorkflowTaskCard['traffic_light_status']) {
  if (status === 'red')
    return 'bg-destructive'
  if (status === 'orange')
    return 'bg-amber-500'
  if (status === 'green')
    return 'bg-emerald-500'

  return 'bg-muted-foreground/40'
}

function formatDueDate(value: string | null) {
  if (!value)
    return 'Sin SLA'

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
  <div v-if="loading" class="flex gap-4 overflow-x-auto pb-4">
    <Card v-for="i in 3" :key="i" class="w-[300px] shrink-0">
      <CardHeader class="px-3">
        <Skeleton class="h-5 w-32" />
      </CardHeader>
      <CardContent class="space-y-3 px-3">
        <Skeleton class="h-24 w-full" />
        <Skeleton class="h-24 w-full" />
      </CardContent>
    </Card>
  </div>

  <div v-else class="flex gap-4 overflow-x-auto overflow-y-hidden pb-4">
    <Card
      v-for="col in columns"
      :key="col.id"
      class="w-[300px] shrink-0 gap-3 self-start py-2"
    >
      <CardHeader class="flex flex-row items-center justify-between gap-2 px-3 py-2">
        <CardTitle class="flex items-center gap-2 text-base font-semibold">
          <span>{{ col.title }}</span>
          <Badge variant="secondary" class="h-5 min-w-5 px-1 font-mono tabular-nums">
            {{ col.tasks.length }}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent class="max-h-[calc(100vh-16rem)] space-y-3 overflow-y-auto px-3">
        <div
          v-if="col.tasks.length === 0"
          class="rounded-lg border border-dashed px-3 py-8 text-center text-sm text-muted-foreground"
        >
          Sin tareas
        </div>

        <div
          v-for="task in col.tasks"
          :key="task.id"
          class="cursor-pointer rounded-xl border bg-card px-3 py-2 shadow-sm transition-colors hover:bg-accent/50"
          @click="emit('openTask', task)"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-2 text-xs text-muted-foreground">
              <span
                class="inline-block size-2.5 rounded-full"
                :class="trafficLightClass(task.traffic_light_status)"
                :title="task.traffic_light_status ?? 'sin semáforo'"
              />
              <span>{{ taskReference(task) }}</span>
            </div>
            <DropdownMenu v-if="canManage" @click.stop>
              <DropdownMenuTrigger as-child>
                <Button size="icon-sm" variant="ghost" class="size-7 text-muted-foreground">
                  <Icon name="lucide:ellipsis-vertical" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" class="min-w-[10rem]">
                <DropdownMenuItem @click="emit('openTask', task)">
                  <Icon name="lucide:external-link" class="size-4" />
                  Abrir radicado
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

          <div class="mt-2 flex flex-wrap gap-1">
            <Badge v-if="functionalTypeLabel(task)" variant="outline" class="text-[10px] font-normal">
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

          <div class="mt-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <div class="flex items-center gap-1">
              <Icon name="lucide:clock" class="size-3.5" />
              <span>{{ formatDueDate(task.due_at) }}</span>
            </div>
            <div v-if="task.assignee" class="flex items-center gap-1.5">
              <Avatar class="size-5">
                <AvatarFallback class="text-[9px]">
                  {{ task.assignee.name.slice(0, 2).toUpperCase() }}
                </AvatarFallback>
              </Avatar>
              <span class="max-w-[90px] truncate">{{ task.assignee.name }}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
