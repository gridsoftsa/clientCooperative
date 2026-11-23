<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { OrgPositionRow, OrgUnitRow } from '~/composables/useOrgStructureApi'
import type { WorkflowDefinition, WorkflowFunctionalTypeOption } from '~/types/workflow'

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
const loading = ref(true)
const definition = ref<WorkflowDefinition | null>(null)
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

const nextSortOrder = computed(() => {
  if (stages.value.length === 0)
    return 1

  return Math.max(...stages.value.map(stage => stage.sort_order)) + 1
})

const boundFunctionalType = computed(() => {
  const bindings = (definition.value?.functional_bindings ?? definition.value?.functionalBindings ?? [])
    .filter(binding => binding.is_active)

  return functionalTypes.value.find(type => type.key === bindings[0]?.functional_type_key) ?? null
})

const slaConsumed = computed(() =>
  stages.value.reduce((sum, stage) => sum + (stage.sla_business_days ?? 0), 0),
)

const slaBudget = computed(() => boundFunctionalType.value?.sla_business_days ?? null)

const slaMode = computed<'unbound' | 'none' | 'limited'>(() => {
  if (!boundFunctionalType.value)
    return 'unbound'

  return slaBudget.value == null ? 'none' : 'limited'
})

const maxSlaDays = computed(() => {
  if (slaMode.value !== 'limited' || slaBudget.value == null)
    return null

  return Math.max(0, slaBudget.value - slaConsumed.value)
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
  }
  catch {
    toast.error('No se pudo cargar el flujo.')
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
        Nueva etapa
      </h1>
      <p class="text-sm text-muted-foreground">
        {{ definition?.name ?? 'Flujo de trabajo' }}
      </p>
    </div>

    <div v-if="loading" class="space-y-3">
      <Skeleton class="h-10 w-full" />
      <Skeleton class="h-72 w-full" />
    </div>

    <WorkflowStageForm
      v-else-if="definition"
      :definition-id="definition.id"
      :next-sort-order="nextSortOrder"
      :locked="isStructureLocked"
      :users="users"
      :org-units="orgUnits"
      :positions="positions"
      :sla-mode="slaMode"
      :functional-type-label="boundFunctionalType?.label ?? null"
      :sla-budget="slaBudget"
      :max-sla-days="maxSlaDays"
      :consumed-by-other-stages="slaConsumed"
      @cancel="goBack"
      @saved="goBack"
    />
  </div>
</template>
