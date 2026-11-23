<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { OrgPositionRow, OrgUnitRow } from '~/composables/useOrgStructureApi'
import type { WorkflowDefinition, WorkflowFunctionalTypeOption, WorkflowStage } from '~/types/workflow'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'workflow_definir',
})

const route = useRoute()
const router = useRouter()
const workflowApi = useWorkflowApi()
const orgApi = useOrgStructureApi()

const definitionId = computed(() => Number(route.params.definitionId))
const stageId = computed(() => Number(route.params.stageId))
const loading = ref(true)
const definition = ref<WorkflowDefinition | null>(null)
const stage = ref<WorkflowStage | null>(null)
const users = ref<Array<{ id: number, name: string }>>([])
const orgUnits = ref<OrgUnitRow[]>([])
const positions = ref<OrgPositionRow[]>([])
const functionalTypes = ref<WorkflowFunctionalTypeOption[]>([])

const backTo = computed(() => `/workflow/configuracion/${definitionId.value}`)

const isStructureLocked = computed(() => (definition.value?.active_instances_count ?? 0) > 0)

const stages = computed(() => {
  const list = definition.value?.stages ?? []

  return [...list].sort((a, b) => a.sort_order - b.sort_order)
})

const boundFunctionalType = computed(() => {
  const bindings = (definition.value?.functional_bindings ?? definition.value?.functionalBindings ?? [])
    .filter(binding => binding.is_active)

  return functionalTypes.value.find(type => type.key === bindings[0]?.functional_type_key) ?? null
})

const slaConsumed = computed(() =>
  stages.value.reduce((sum, item) => sum + (item.sla_business_days ?? 0), 0),
)

const slaBudget = computed(() => boundFunctionalType.value?.sla_business_days ?? null)

const slaMode = computed<'unbound' | 'none' | 'limited'>(() => {
  if (!boundFunctionalType.value)
    return 'unbound'

  return slaBudget.value == null ? 'none' : 'limited'
})

const consumedByOtherStages = computed(() =>
  Math.max(0, slaConsumed.value - (stage.value?.sla_business_days ?? 0)),
)

const maxSlaDays = computed(() => {
  if (slaMode.value !== 'limited' || slaBudget.value == null)
    return null

  return Math.max(0, slaBudget.value - consumedByOtherStages.value)
})

async function load() {
  loading.value = true

  try {
    const [def, types, units, posList, userList] = await Promise.all([
      workflowApi.fetchDefinition(definitionId.value),
      workflowApi.fetchFunctionalTypes(),
      orgApi.fetchUnits({ activeOnly: true }),
      orgApi.fetchPositions({ activeOnly: true }),
      workflowApi.fetchAssignableUsers(),
    ])

    definition.value = def
    functionalTypes.value = types
    orgUnits.value = units
    positions.value = posList
    users.value = userList
    stage.value = (def.stages ?? []).find(item => item.id === stageId.value) ?? null

    if (!stage.value) {
      toast.error('No se encontró la etapa.')
      await router.push(backTo.value)
    }
  }
  catch {
    toast.error('No se pudo cargar la etapa.')
    await router.push('/workflow/configuracion')
  }
  finally {
    loading.value = false
  }
}

function goBack() {
  void router.push(backTo.value)
}

onMounted(() => {
  void load()
})
</script>

<template>
  <div class="mx-auto max-w-4xl space-y-6">
    <div>
      <PageBackButton :to="backTo">
        Volver al flujo
      </PageBackButton>
      <h1 class="mt-2 text-2xl font-semibold tracking-tight">
        Editar etapa
      </h1>
      <p class="text-sm text-muted-foreground">
        {{ definition?.name ?? 'Flujo de trabajo' }}
        <span v-if="stage"> · {{ stage.name }}</span>
      </p>
    </div>

    <div v-if="loading" class="space-y-3">
      <Skeleton class="h-10 w-full" />
      <Skeleton class="h-72 w-full" />
    </div>

    <WorkflowStageForm
      v-else-if="definition && stage"
      :definition-id="definition.id"
      :stage="stage"
      :next-sort-order="stage.sort_order"
      :locked="isStructureLocked"
      :users="users"
      :org-units="orgUnits"
      :positions="positions"
      :sla-mode="slaMode"
      :functional-type-label="boundFunctionalType?.label ?? null"
      :sla-budget="slaBudget"
      :max-sla-days="maxSlaDays"
      :consumed-by-other-stages="consumedByOtherStages"
      @cancel="goBack"
      @saved="goBack"
    />
  </div>
</template>
