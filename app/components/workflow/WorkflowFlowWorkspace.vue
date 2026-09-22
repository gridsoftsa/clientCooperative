<script setup lang="ts">
import type { WorkflowBoardColumn, WorkflowBoardFlow, WorkflowTaskCard } from '~/types/workflow'
import { workflowFlowAccent, workflowFlowIcon } from '~/utils/workflow-flow-icon'

const props = defineProps<{
  flows: WorkflowBoardFlow[]
  selectedId: string
  columns: WorkflowBoardColumn[]
  loading?: boolean
  canManage?: boolean
}>()

const emit = defineEmits<{
  select: [id: string]
  refresh: []
  openTask: [task: WorkflowTaskCard]
  manage: [task: WorkflowTaskCard]
}>()

const selectedFlow = computed(() =>
  props.flows.find(flow => String(flow.id) === props.selectedId) ?? null,
)
const accent = computed(() => workflowFlowAccent(selectedFlow.value?.key))
const hasTasks = computed(() => props.columns.some(column => column.tasks.length > 0))

function selectFlow(id: number) {
  emit('select', String(id))
}
</script>

<template>
  <div class="min-h-[32rem] overflow-hidden">
    <div
      v-if="loading && flows.length === 0"
      class="flex min-h-[28rem] items-center justify-center text-sm text-muted-foreground"
    >
      Cargando flujos…
    </div>

    <div
      v-else-if="flows.length === 0"
      class="flex min-h-[28rem] items-center justify-center text-sm text-muted-foreground"
    >
      No hay flujos de trabajo activos para mostrar.
    </div>

    <ResizablePanelGroup
      v-else
      id="workflow-type-browser"
      direction="horizontal"
      class="min-h-[32rem]"
    >
      <ResizablePanel
        id="workflow-type-nav"
        :default-size="28"
        :min-size="22"
        :max-size="38"
        class="border-r bg-muted/20"
      >
        <div class="flex h-full flex-col">
          <div class="border-b px-4 py-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Tipos
            </p>
            <p class="mt-1 text-sm font-medium">
              Flujos de ventanilla
            </p>
          </div>

          <nav class="flex-1 space-y-1 overflow-y-auto p-2">
            <button
              v-for="flow in flows"
              :key="flow.id"
              type="button"
              class="group relative flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors"
              :class="selectedId === String(flow.id)
                ? `${workflowFlowAccent(flow.key).selected} text-foreground`
                : 'text-muted-foreground hover:bg-background/80 hover:text-foreground'"
              @click="selectFlow(flow.id)"
            >
              <span
                v-if="selectedId === String(flow.id)"
                class="absolute inset-y-2 left-0 w-1 rounded-full"
                :class="workflowFlowAccent(flow.key).rail"
              />
              <span
                class="flex size-11 shrink-0 items-center justify-center rounded-2xl"
                :class="workflowFlowAccent(flow.key).iconBox"
              >
                <Icon
                  :name="workflowFlowIcon(flow.key)"
                  class="size-5"
                  :class="workflowFlowAccent(flow.key).icon"
                />
              </span>
              <span class="min-w-0 flex-1">
                <span class="block truncate font-medium text-foreground">
                  {{ flow.name }}
                </span>
                <span class="mt-0.5 block text-xs">
                  {{ flow.stages.length }} etapas
                  <span v-if="flow.task_count > 0"> · {{ flow.task_count }} en curso</span>
                </span>
              </span>
              <span
                v-if="flow.task_count > 0"
                class="flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
                :class="`${workflowFlowAccent(flow.key).iconBox} ${workflowFlowAccent(flow.key).icon}`"
              >
                {{ flow.task_count }}
              </span>
            </button>
          </nav>
        </div>
      </ResizablePanel>

      <ResizableHandle with-handle />

      <ResizablePanel id="workflow-type-canvas" :default-size="72" :min-size="50">
        <div v-if="selectedFlow" class="flex h-full min-h-[32rem] flex-col">
          <div
            class="relative overflow-hidden border-b px-5 py-4"
          >
            <div
              class="pointer-events-none absolute inset-0 bg-gradient-to-r"
              :class="accent.glow"
            />
            <div class="relative flex items-center gap-3">
              <div
                class="flex size-12 items-center justify-center rounded-2xl"
                :class="accent.iconBox"
              >
                <Icon
                  :name="workflowFlowIcon(selectedFlow.key)"
                  class="size-6"
                  :class="accent.icon"
                />
              </div>
              <div class="min-w-0">
                <h2 class="truncate text-lg font-semibold tracking-tight">
                  {{ selectedFlow.name }}
                </h2>
                <p class="text-xs text-muted-foreground">
                  Recorrido del trámite
                </p>
              </div>
            </div>
          </div>

          <div class="border-b bg-muted/10 px-5 py-6">
            <div class="flex min-w-0 items-start justify-between gap-2 overflow-x-auto pb-1">
              <template v-for="(stage, index) in selectedFlow.stages" :key="stage.id">
                <div class="flex min-w-[7.5rem] flex-1 flex-col items-center text-center">
                  <div
                    class="flex size-11 items-center justify-center rounded-full border-2 text-sm font-semibold shadow-lg"
                    :class="stage.task_count > 0 ? accent.stepActive : accent.stepIdle"
                  >
                    {{ index + 1 }}
                  </div>
                  <p class="mt-2 max-w-[9rem] text-xs font-medium leading-4">
                    {{ stage.name }}
                  </p>
                  <p
                    class="mt-1 text-[11px] tabular-nums"
                    :class="stage.task_count > 0 ? 'font-semibold text-foreground' : 'text-muted-foreground'"
                  >
                    {{ stage.task_count > 0 ? `${stage.task_count} trámite${stage.task_count === 1 ? '' : 's'}` : 'Sin trámites' }}
                  </p>
                </div>
                <div
                  v-if="index < selectedFlow.stages.length - 1"
                  class="mt-5 h-0.5 min-w-6 flex-1 rounded-full"
                  :class="accent.connector"
                />
              </template>
            </div>
          </div>

          <div class="min-h-0 flex-1 overflow-y-auto p-4">
            <WorkflowBoard
              v-if="hasTasks || loading"
              :columns="columns"
              :loading="loading"
              :can-manage="canManage"
              hide-stage-filter
              @refresh="emit('refresh')"
              @open-task="emit('openTask', $event)"
              @manage="emit('manage', $event)"
            />
            <div
              v-else
              class="flex h-full min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/20 px-6 text-center"
            >
              <div
                class="mb-3 flex size-14 items-center justify-center rounded-2xl"
                :class="accent.iconBox"
              >
                <Icon
                  :name="workflowFlowIcon(selectedFlow.key)"
                  class="size-7"
                  :class="accent.icon"
                />
              </div>
              <p class="text-sm font-medium">
                No hay trámites en este flujo
              </p>
              <p class="mt-1 max-w-sm text-xs text-muted-foreground">
                El recorrido ya está listo. Cuando entre un radicado, aparecerá en la etapa correspondiente.
              </p>
            </div>
          </div>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  </div>
</template>
