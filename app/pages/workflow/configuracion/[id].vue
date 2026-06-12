<script setup lang="ts">
import { toast } from 'vue-sonner'
import {
  labelForWorkflowAssigneeType,
  labelForWorkflowStageType,
  labelForWorkflowVentanillaRole,
} from '~/constants/workflow'
import type { OrgPositionRow, OrgUnitRow } from '~/composables/useOrgStructureApi'
import type { WorkflowDefinition, WorkflowStage } from '~/types/workflow'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'workflow_definir',
})

const route = useRoute()
const router = useRouter()
const workflowApi = useWorkflowApi()
const orgApi = useOrgStructureApi()

const definitionId = computed(() => Number(route.params.id))
const loading = ref(true)
const savingGeneral = ref(false)
const definition = ref<WorkflowDefinition | null>(null)
const activeTab = ref('stages')

const users = ref<Array<{ id: number, name: string }>>([])
const orgUnits = ref<OrgUnitRow[]>([])
const positions = ref<OrgPositionRow[]>([])
const functionalTypes = ref<Array<{ key: string, label: string }>>([])
const bindingSavingKey = ref<string | null>(null)

const stageDialogOpen = ref(false)
const editingStage = ref<WorkflowStage | null>(null)

const generalForm = reactive({
  name: '',
  description: '',
  is_active: true,
})

const isLocked = computed(() => {
  if (!definition.value)
    return false

  return definition.value.is_locked || (definition.value.instances_count ?? 0) > 0
})

const stages = computed(() => {
  const list = definition.value?.stages ?? []
  return [...list].sort((a, b) => a.sort_order - b.sort_order)
})

const nextSortOrder = computed(() => {
  if (stages.value.length === 0)
    return 1

  return Math.max(...stages.value.map(s => s.sort_order)) + 1
})

const bindingsForDefinition = computed(() => {
  const bindings = definition.value?.functional_bindings ?? definition.value?.functionalBindings ?? []
  return bindings.filter(b => b.is_active)
})

function assigneeDetail(stage: WorkflowStage) {
  if (stage.assignee_user)
    return stage.assignee_user.name
  if (stage.assignee_org_unit)
    return stage.assignee_org_unit.name
  if (stage.assignee_position)
    return stage.assignee_position.name

  return labelForWorkflowAssigneeType(stage.assignee_type)
}

async function loadCatalogs() {
  const [types, units, posList, userList] = await Promise.all([
    workflowApi.fetchFunctionalTypes(),
    orgApi.fetchUnits({ activeOnly: true }),
    orgApi.fetchPositions({ activeOnly: true }),
    workflowApi.fetchAssignableUsers(),
  ])

  functionalTypes.value = types
  orgUnits.value = units
  positions.value = posList
  users.value = userList
}

async function loadDefinition() {
  loading.value = true

  try {
    definition.value = await workflowApi.fetchDefinition(definitionId.value)
    generalForm.name = definition.value.name
    generalForm.description = definition.value.description ?? ''
    generalForm.is_active = definition.value.is_active
  }
  catch {
    toast.error('No se pudo cargar el flujo.')
    router.push('/workflow/configuracion')
  }
  finally {
    loading.value = false
  }
}

async function saveGeneral() {
  if (!definition.value || isLocked.value)
    return

  savingGeneral.value = true

  try {
    definition.value = await workflowApi.updateDefinition(definition.value.id, {
      name: generalForm.name.trim(),
      description: generalForm.description.trim() || null,
      is_active: generalForm.is_active,
    })
    toast.success('Flujo actualizado.')
  }
  catch {
    toast.error('No se pudo actualizar el flujo.')
  }
  finally {
    savingGeneral.value = false
  }
}

function openCreateStage() {
  editingStage.value = null
  stageDialogOpen.value = true
}

function openEditStage(stage: WorkflowStage) {
  editingStage.value = stage
  stageDialogOpen.value = true
}

async function deleteStage(stage: WorkflowStage) {
  if (isLocked.value)
    return

  if (!confirm(`¿Eliminar la etapa «${stage.name}»?`))
    return

  try {
    await workflowApi.deleteStage(stage.id)
    toast.success('Etapa eliminada.')
    await loadDefinition()
  }
  catch {
    toast.error('No se pudo eliminar la etapa.')
  }
}

async function bindFunctionalType(key: string) {
  if (!definition.value)
    return

  bindingSavingKey.value = key

  try {
    await workflowApi.upsertBinding(definition.value.id, key, true)
    toast.success('Tipo funcional asociado.')
    await loadDefinition()
  }
  catch {
    toast.error('No se pudo asociar el tipo funcional.')
  }
  finally {
    bindingSavingKey.value = null
  }
}

function isTypeBoundToThis(key: string) {
  return bindingsForDefinition.value.some(b => b.functional_type_key === key)
}

onMounted(async () => {
  await Promise.all([loadCatalogs(), loadDefinition()])
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <div class="mb-1 flex items-center gap-2">
          <Button variant="ghost" size="sm" class="-ml-2" @click="router.push('/workflow/configuracion')">
            <Icon name="lucide:arrow-left" class="mr-1 size-4" />
            Volver
          </Button>
        </div>
        <h1 class="text-2xl font-semibold tracking-tight">
          {{ definition?.name ?? 'Flujo de trabajo' }}
        </h1>
        <p class="text-sm text-muted-foreground">
          <code v-if="definition">{{ definition.key }}</code>
          <Badge v-if="isLocked" variant="outline" class="ml-2 text-amber-700 border-amber-300">
            En uso — solo lectura
          </Badge>
          <span v-else-if="definition" class="ml-2 text-emerald-600">Editable</span>
        </p>
      </div>
      <NuxtLink to="/workflow">
        <Button variant="outline" size="sm">
          <Icon name="lucide:layout-dashboard" class="mr-1 size-4" />
          Ver tablero
        </Button>
      </NuxtLink>
    </div>

    <Alert v-if="isLocked">
      <Icon name="lucide:lock" class="size-4" />
      <AlertTitle>Flujo bloqueado</AlertTitle>
      <AlertDescription>
        Este flujo ya tiene radicados en ejecución. Para cambiar etapas, cree un flujo nuevo y reasocie los tipos funcionales.
      </AlertDescription>
    </Alert>

    <div v-if="loading" class="space-y-3">
      <Skeleton class="h-10 w-full" />
      <Skeleton class="h-64 w-full" />
    </div>

    <Tabs v-else v-model="activeTab" default-value="stages">
      <TabsList>
        <TabsTrigger value="general">
          General
        </TabsTrigger>
        <TabsTrigger value="stages">
          Etapas
        </TabsTrigger>
        <TabsTrigger value="bindings">
          Tipos funcionales
        </TabsTrigger>
      </TabsList>

      <TabsContent value="general" class="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Datos del flujo</CardTitle>
          </CardHeader>
          <CardContent class="grid max-w-xl gap-4">
            <div class="grid gap-2">
              <Label>Nombre</Label>
              <Input v-model="generalForm.name" :disabled="isLocked" />
            </div>
            <div class="grid gap-2">
              <Label>Descripción</Label>
              <Textarea v-model="generalForm.description" rows="3" :disabled="isLocked" />
            </div>
            <label class="flex items-center gap-2 text-sm">
              <Checkbox v-model="generalForm.is_active" :disabled="isLocked" />
              Flujo activo
            </label>
            <Button
              v-if="!isLocked"
              :disabled="savingGeneral"
              class="w-fit"
              @click="saveGeneral"
            >
              Guardar cambios
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="stages" class="mt-4 space-y-4">
        <div class="flex items-center justify-between">
          <p class="text-sm text-muted-foreground">
            {{ stages.length }} etapa(s) — el orden define las columnas del tablero
          </p>
          <Button v-if="!isLocked" size="sm" @click="openCreateStage">
            <Icon name="lucide:plus" class="mr-1 size-4" />
            Nueva etapa
          </Button>
        </div>

        <div class="grid gap-3">
          <Card v-for="stage in stages" :key="stage.id">
            <CardContent class="flex flex-wrap items-start justify-between gap-4 p-4">
              <div class="space-y-2">
                <div class="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" class="font-mono">
                    {{ stage.sort_order }}
                  </Badge>
                  <span class="font-medium">{{ stage.name }}</span>
                  <code class="text-xs text-muted-foreground">{{ stage.key }}</code>
                  <Badge v-if="stage.is_terminal" variant="secondary">
                    Cierre
                  </Badge>
                </div>
                <div class="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span>{{ labelForWorkflowStageType(stage.stage_type) }}</span>
                  <span>{{ labelForWorkflowAssigneeType(stage.assignee_type) }}</span>
                  <span v-if="assigneeDetail(stage) !== labelForWorkflowAssigneeType(stage.assignee_type)">
                    → {{ assigneeDetail(stage) }}
                  </span>
                  <span v-if="stage.sla_business_days">{{ stage.sla_business_days }} días SLA</span>
                  <span v-if="stage.ventanilla_role">
                    {{ labelForWorkflowVentanillaRole(stage.ventanilla_role) }}
                  </span>
                </div>
                <div class="flex flex-wrap gap-2">
                  <Badge v-if="stage.allows_advance" variant="outline" class="text-xs">
                    Avanzar
                  </Badge>
                  <Badge v-if="stage.allows_return" variant="outline" class="text-xs">
                    Devolver
                  </Badge>
                  <Badge v-if="stage.allows_reassign" variant="outline" class="text-xs">
                    Reasignar
                  </Badge>
                </div>
              </div>
              <div v-if="!isLocked" class="flex gap-2">
                <Button variant="outline" size="sm" @click="openEditStage(stage)">
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  class="text-destructive"
                  :disabled="stages.length <= 1"
                  @click="deleteStage(stage)"
                >
                  Eliminar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="bindings" class="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Asociar a tipos funcionales</CardTitle>
            <CardDescription>
              Cada tipo funcional de ventanilla puede tener un flujo activo. Al radicar, se usa el flujo asociado.
            </CardDescription>
          </CardHeader>
          <CardContent class="divide-y">
            <div
              v-for="ft in functionalTypes"
              :key="ft.key"
              class="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div>
                <p class="font-medium">
                  {{ ft.label }}
                </p>
                <p class="text-xs text-muted-foreground">
                  {{ ft.key }}
                </p>
              </div>
              <div class="flex items-center gap-2">
                <Badge v-if="isTypeBoundToThis(ft.key)" variant="default">
                  Asociado a este flujo
                </Badge>
                <Button
                  size="sm"
                  :variant="isTypeBoundToThis(ft.key) ? 'outline' : 'default'"
                  :disabled="bindingSavingKey === ft.key"
                  @click="bindFunctionalType(ft.key)"
                >
                  {{ isTypeBoundToThis(ft.key) ? 'Reconfirmar' : 'Asociar aquí' }}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>

    <WorkflowStageFormDialog
      v-if="definition"
      v-model:open="stageDialogOpen"
      :definition-id="definition.id"
      :stage="editingStage"
      :next-sort-order="nextSortOrder"
      :locked="isLocked"
      :users="users"
      :org-units="orgUnits"
      :positions="positions"
      @saved="loadDefinition"
    />
  </div>
</template>
