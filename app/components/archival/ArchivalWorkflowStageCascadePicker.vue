<script setup lang="ts">
export interface ArchivalWorkflowDefinitionOption {
  id: number
  key: string
  name: string
  stages: Array<{ key: string, name: string }>
}

const WORKFLOW_GENERAL = '__general__'

const props = withDefaults(
  defineProps<{
    workflowDefinitions: ArchivalWorkflowDefinitionOption[]
    disabled?: boolean
    inline?: boolean
  }>(),
  {
    disabled: false,
    inline: false,
  },
)

const workflowStageKey = defineModel<string>({ default: '' })

const pickerId = useId()
const fieldIds = {
  workflow: `archival-workflow-${pickerId}`,
  stage: `archival-workflow-stage-${pickerId}`,
}

const selectedWorkflow = ref<string | number>(WORKFLOW_GENERAL)
const selectedStageKey = ref<string | null>(null)

const placeholders = computed(() => {
  if (props.inline) {
    return {
      workflow: 'Workflow',
      stage: 'Etapa',
    }
  }

  return {
    workflow: 'Seleccione workflow',
    stage: 'Seleccione etapa',
  }
})

const workflowOptions = computed(() => [
  { value: WORKFLOW_GENERAL, label: 'Cierre / general' },
  ...props.workflowDefinitions.map(definition => ({
    value: definition.id,
    label: definition.name,
  })),
])

const stageOptions = computed(() => {
  if (selectedWorkflow.value === WORKFLOW_GENERAL) {
    return []
  }

  const workflowId = Number(selectedWorkflow.value)
  const definition = props.workflowDefinitions.find(item => item.id === workflowId)

  return (definition?.stages ?? []).map(stage => ({
    value: stage.key,
    label: stage.name,
  }))
})

function syncFromWorkflowStageKey(key: string) {
  if (!key) {
    selectedWorkflow.value = WORKFLOW_GENERAL
    selectedStageKey.value = null

    return
  }

  for (const definition of props.workflowDefinitions) {
    const stage = definition.stages.find(item => item.key === key)
    if (stage) {
      selectedWorkflow.value = definition.id
      selectedStageKey.value = stage.key

      return
    }
  }
}

watch(selectedWorkflow, (value) => {
  if (value === WORKFLOW_GENERAL) {
    selectedStageKey.value = null
    workflowStageKey.value = ''

    return
  }

  selectedStageKey.value = null
  workflowStageKey.value = ''
})

watch(selectedStageKey, (value) => {
  if (selectedWorkflow.value === WORKFLOW_GENERAL) {
    workflowStageKey.value = ''

    return
  }

  workflowStageKey.value = value ?? ''
})

watch(
  () => props.workflowDefinitions,
  () => syncFromWorkflowStageKey(workflowStageKey.value),
  { immediate: true },
)

watch(workflowStageKey, (value) => {
  if (value !== (selectedStageKey.value ?? '')) {
    syncFromWorkflowStageKey(value)
  }
})
</script>

<template>
  <div
    class="min-w-0"
    :class="inline ? 'grid grid-cols-2 gap-2' : 'grid grid-cols-1 gap-3 md:grid-cols-2 md:max-w-2xl'"
  >
    <div class="min-w-0" :class="inline ? '' : 'space-y-2'">
      <Label v-if="!inline">Workflow</Label>
      <ArchivalSingleMultiselect
        :id="fieldIds.workflow"
        v-model="selectedWorkflow"
        :options="workflowOptions"
        :can-clear="false"
        :disabled="disabled"
        :placeholder="placeholders.workflow"
        no-options-text="Sin workflows"
        no-results-text="Sin coincidencias"
      />
    </div>
    <div class="min-w-0" :class="inline ? '' : 'space-y-2'">
      <Label v-if="!inline">Etapa</Label>
      <ArchivalSingleMultiselect
        :id="fieldIds.stage"
        v-model="selectedStageKey"
        :options="stageOptions"
        :disabled="disabled || selectedWorkflow === WORKFLOW_GENERAL"
        :placeholder="placeholders.stage"
        no-options-text="Seleccione un workflow"
        no-results-text="Sin coincidencias"
      />
    </div>
  </div>
</template>

<style scoped>
.archival-single-multiselect :deep(.multiselect-single-label-text) {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
