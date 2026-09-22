<script setup lang="ts">
import type { WorkflowBoardFlow } from '~/types/workflow'
import { workflowFlowAccent, workflowFlowIcon } from '~/utils/workflow-flow-icon'

withDefaults(defineProps<{
  flows: WorkflowBoardFlow[]
  selectedId?: string
}>(), {
  selectedId: 'all',
})

const emit = defineEmits<{
  select: [id: string]
}>()

const ALL_DEFINITIONS = 'all'
</script>

<template>
  <div class="flex min-w-0 flex-wrap gap-2">
    <button
      type="button"
      class="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors"
      :class="selectedId === ALL_DEFINITIONS
        ? 'border-primary bg-primary/10 text-foreground'
        : 'bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'"
      @click="emit('select', ALL_DEFINITIONS)"
    >
      Todos
    </button>
    <button
      v-for="flow in flows"
      :key="flow.id"
      type="button"
      class="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors"
      :class="selectedId === String(flow.id)
        ? `${workflowFlowAccent(flow.key).selected} border-transparent text-foreground`
        : 'bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'"
      @click="emit('select', String(flow.id))"
    >
      <span
        class="flex size-6 items-center justify-center rounded-full"
        :class="workflowFlowAccent(flow.key).iconBox"
      >
        <Icon
          :name="workflowFlowIcon(flow.key)"
          class="size-3.5"
          :class="workflowFlowAccent(flow.key).icon"
        />
      </span>
      <span class="max-w-[10rem] truncate">{{ flow.name }}</span>
      <span v-if="flow.task_count > 0" class="font-mono text-[11px] tabular-nums">
        {{ flow.task_count }}
      </span>
    </button>
  </div>
</template>
