<script setup lang="ts">
import { toast } from 'vue-sonner'
import {
  labelForWorkflowAssigneeType,
  labelForWorkflowStageType,
  labelForWorkflowVentanillaRole,
} from '~/constants/workflow'
import type { WorkflowDefinition, WorkflowFunctionalTypeOption, WorkflowStage } from '~/types/workflow'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'workflow_definir',
})

const route = useRoute()
const router = useRouter()
const workflowApi = useWorkflowApi()
const deleteWithReason = useApiDeleteWithReason()

const deleteStageDialogOpen = ref(false)
const stagePendingDelete = ref<WorkflowStage | null>(null)
const deletingStage = ref(false)

const definitionId = computed(() => Number(route.params.id))
const loading = ref(true)
const savingGeneral = ref(false)
const definition = ref<WorkflowDefinition | null>(null)
const activeTab = ref('stages')

const functionalTypes = ref<WorkflowFunctionalTypeOption[]>([])
const otherDefinitions = ref<WorkflowDefinition[]>([])
const bindingSaving = ref(false)
const selectedFunctionalTypeKey = ref<string | null>(null)
const importDialogOpen = ref(false)
const importSourceId = ref<string>('')
const importingStages = ref(false)

const generalForm = reactive({
  name: '',
  description: '',
  is_active: true,
})

const isStructureLocked = computed(() => {
  if (!definition.value)
    return false

  return (definition.value.active_instances_count ?? 0) > 0
})

const hasActiveProcesses = computed(() => (definition.value?.active_instances_count ?? 0) > 0)

const isActiveToggleDisabled = computed(() => hasActiveProcesses.value && generalForm.is_active)

const canSaveGeneral = computed(() => {
  if (!definition.value)
    return false

  if (!isStructureLocked.value)
    return true

  return generalForm.is_active !== definition.value.is_active && !hasActiveProcesses.value
})

const stages = computed(() => {
  const list = definition.value?.stages ?? []
  return [...list].sort((a, b) => a.sort_order - b.sort_order)
})

const bindingsForDefinition = computed(() => {
  const bindings = definition.value?.functional_bindings ?? definition.value?.functionalBindings ?? []
  return bindings.filter(b => b.is_active)
})

const boundFunctionalType = computed(() =>
  functionalTypes.value.find(type => type.key === bindingsForDefinition.value[0]?.functional_type_key) ?? null,
)

const slaConsumed = computed(() =>
  stages.value.reduce((sum, stage) => sum + (stage.sla_business_days ?? 0), 0),
)

const slaBudget = computed(() => boundFunctionalType.value?.sla_business_days ?? null)

const slaRemaining = computed(() => {
  if (slaBudget.value == null)
    return null

  return slaBudget.value - slaConsumed.value
})

const slaMode = computed<'unbound' | 'none' | 'limited'>(() => {
  if (!boundFunctionalType.value)
    return 'unbound'

  return slaBudget.value == null ? 'none' : 'limited'
})

const importCandidates = computed(() =>
  otherDefinitions.value.filter(item => item.id !== definitionId.value && (item.stages?.length ?? 0) > 0),
)

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
  const [types, definitions] = await Promise.all([
    workflowApi.fetchFunctionalTypes(),
    workflowApi.fetchDefinitions(),
  ])

  functionalTypes.value = types
  otherDefinitions.value = definitions
}

async function loadDefinition() {
  loading.value = true

  try {
    definition.value = await workflowApi.fetchDefinition(definitionId.value)
    generalForm.name = definition.value.name
    generalForm.description = definition.value.description ?? ''
    generalForm.is_active = definition.value.is_active
    const activeBinding = (definition.value.functional_bindings ?? definition.value.functionalBindings ?? [])
      .find(binding => binding.is_active)
    selectedFunctionalTypeKey.value = activeBinding?.functional_type_key ?? null
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
  if (!definition.value || !canSaveGeneral.value)
    return

  savingGeneral.value = true

  try {
    const payload: { name?: string, description?: string | null, is_active?: boolean } = {}

    if (!isStructureLocked.value) {
      payload.name = generalForm.name.trim()
      payload.description = generalForm.description.trim() || null
    }

    if (generalForm.is_active !== definition.value.is_active) {
      payload.is_active = generalForm.is_active
    }

    definition.value = await workflowApi.updateDefinition(definition.value.id, payload)
    generalForm.name = definition.value.name
    generalForm.description = definition.value.description ?? ''
    generalForm.is_active = definition.value.is_active
    toast.success('Flujo actualizado.')
  }
  catch (error: unknown) {
    const err = error as { data?: { message?: string, errors?: Record<string, string[]> } }
    const first = err.data?.errors ? Object.values(err.data.errors)[0]?.[0] : null
    toast.error(first ?? err.data?.message ?? 'No se pudo actualizar el flujo.')
  }
  finally {
    savingGeneral.value = false
  }
}

function openCreateStage() {
  void navigateTo(`/workflow/configuracion/etapas/${definitionId.value}/nueva`)
}

function openEditStage(stage: WorkflowStage) {
  void navigateTo(`/workflow/configuracion/etapas/${definitionId.value}/${stage.id}`)
}

function openDeleteStageDialog(stage: WorkflowStage) {
  if (isStructureLocked.value || stages.value.length <= 1)
    return

  stagePendingDelete.value = stage
  deleteStageDialogOpen.value = true
}

async function onDeleteStageConfirm(reason: string) {
  const stage = stagePendingDelete.value
  if (!stage || deletingStage.value)
    return

  deletingStage.value = true

  try {
    await deleteWithReason(`/workflow/stages/${stage.id}`, reason)
    deleteStageDialogOpen.value = false
    stagePendingDelete.value = null
    toast.success('Etapa eliminada.')
    await loadDefinition()
  }
  catch (error: any) {
    const message = error?.data?.message
      || error?.data?.errors?.stage?.[0]
      || 'No se pudo eliminar la etapa.'
    toast.error(message)
  }
  finally {
    deletingStage.value = false
  }
}

async function bindFunctionalType() {
  if (!definition.value || !selectedFunctionalTypeKey.value)
    return

  bindingSaving.value = true

  try {
    await workflowApi.upsertBinding(definition.value.id, selectedFunctionalTypeKey.value, true)
    toast.success('Este flujo quedó asociado a un solo tipo funcional.')
    await loadDefinition()
  }
  catch (error: unknown) {
    const err = error as { data?: { message?: string, errors?: Record<string, string[]> } }
    const first = err.data?.errors ? Object.values(err.data.errors)[0]?.[0] : null
    toast.error(first ?? err.data?.message ?? 'No se pudo asociar el tipo funcional.')
  }
  finally {
    bindingSaving.value = false
  }
}

function functionalTypeOptionLabel(type: WorkflowFunctionalTypeOption) {
  const sla = type.sla_business_days == null ? 'sin SLA' : `${type.sla_business_days} días hábiles`

  return `${type.label} · ${sla}`
}

const functionalTypeOptions = computed(() =>
  functionalTypes.value.map(type => ({
    value: type.key,
    label: functionalTypeOptionLabel(type),
  })),
)

const selectedFunctionalType = computed(() =>
  functionalTypes.value.find(type => type.key === selectedFunctionalTypeKey.value) ?? null,
)

const functionalTypeDirty = computed(() =>
  (selectedFunctionalTypeKey.value ?? '') !== (boundFunctionalType.value?.key ?? ''),
)

async function importStages() {
  if (!definition.value || !importSourceId.value)
    return

  importingStages.value = true

  try {
    const result = await workflowApi.importStages(definition.value.id, Number(importSourceId.value))
    definition.value = result.data
    importDialogOpen.value = false
    importSourceId.value = ''
    toast.success(result.message)
  }
  catch (error: unknown) {
    const err = error as { data?: { message?: string, errors?: Record<string, string[]> } }
    const first = err.data?.errors ? Object.values(err.data.errors)[0]?.[0] : null
    toast.error(first ?? err.data?.message ?? 'No se pudieron importar las etapas.')
  }
  finally {
    importingStages.value = false
  }
}

const functionalTypesParametrizationPath = computed(() => {
  const query = new URLSearchParams({
    return_to: `/workflow/configuracion/${definitionId.value}`,
  })

  return `/parametrizacion/ventanilla-unica?${query.toString()}`
})

onMounted(async () => {
  await Promise.all([loadCatalogs(), loadDefinition()])
})

onActivated(async () => {
  if (loading.value)
    return

  await Promise.all([loadCatalogs(), loadDefinition()])
})

watch(deleteStageDialogOpen, (open) => {
  if (!open)
    stagePendingDelete.value = null
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <div class="mb-1 flex items-center gap-2">
          <PageBackButton to="/workflow/configuracion">
            Volver
          </PageBackButton>
        </div>
        <h1 class="text-2xl font-semibold tracking-tight">
          {{ definition?.name ?? 'Flujo de trabajo' }}
        </h1>
        <p class="text-sm text-muted-foreground">
          <code v-if="definition">{{ definition.key }}</code>
          <Badge v-if="isStructureLocked" variant="outline" class="ml-2 text-amber-700 border-amber-300">
            En uso — estructura bloqueada
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

    <Alert v-if="isStructureLocked">
      <Icon name="lucide:lock" class="size-4" />
      <AlertTitle>Flujo en uso</AlertTitle>
      <AlertDescription>
        Hay radicados con este flujo en curso: no puede cambiar etapas ni el nombre.
        Anule o cierre esos radicados para volver a editar. Si no hay procesos activos, el flujo queda editable.
      </AlertDescription>
    </Alert>

    <Alert v-if="hasActiveProcesses">
      <Icon name="lucide:activity" class="size-4" />
      <AlertTitle>Procesos en curso</AlertTitle>
      <AlertDescription>
        Hay radicados con este flujo activo. Espere a que finalicen o cancele esos procesos antes de desactivar el flujo.
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
      </TabsList>

      <TabsContent value="general" class="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Datos del flujo</CardTitle>
          </CardHeader>
          <CardContent class="grid max-w-xl gap-4">
            <div class="grid gap-2">
              <Label>Nombre</Label>
              <Input v-model="generalForm.name" :disabled="isStructureLocked" />
            </div>
            <div class="grid gap-2">
              <Label>Descripción</Label>
              <Textarea v-model="generalForm.description" rows="3" :disabled="isStructureLocked" />
            </div>
            <label class="flex items-center gap-2 text-sm">
              <Checkbox v-model="generalForm.is_active" :disabled="isActiveToggleDisabled" />
              Flujo activo
            </label>
            <p v-if="isActiveToggleDisabled" class="text-xs text-muted-foreground">
              No se puede desactivar mientras haya radicados con proceso en curso.
            </p>
            <Button
              v-if="canSaveGeneral"
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
        <Card>
          <CardHeader class="pb-3">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="space-y-1">
                <CardTitle class="text-base">
                  Tipo funcional
                </CardTitle>
                <CardDescription>
                  Un flujo corresponde a un solo tipo. El SLA de las etapas se reparte dentro de sus días hábiles.
                </CardDescription>
              </div>
              <PermissionGate
                :any-permission="['workflow_tipos_funcionales_parametrizar', 'ventanilla_configurar', 'plantillas_ver']"
              >
                <Button variant="outline" size="sm" as-child>
                  <NuxtLink :to="functionalTypesParametrizationPath">
                    <Icon name="lucide:plus" class="mr-1 size-4" />
                    Crear tipo
                  </NuxtLink>
                </Button>
              </PermissionGate>
            </div>
          </CardHeader>
          <CardContent class="space-y-4">
            <div
              v-if="functionalTypes.length === 0"
              class="rounded-lg border border-dashed p-6 text-center space-y-3"
            >
              <p class="text-sm text-muted-foreground">
                No hay tipos funcionales en ventanilla. Créelos en parametrización y asócielos a este flujo.
              </p>
              <PermissionGate
                :any-permission="['workflow_tipos_funcionales_parametrizar', 'ventanilla_configurar', 'plantillas_ver']"
                :fallback="true"
              >
                <Button as-child size="sm">
                  <NuxtLink :to="functionalTypesParametrizationPath">
                    Ir a crear tipo funcional
                  </NuxtLink>
                </Button>
                <template #fallback>
                  <p class="text-xs text-amber-700 dark:text-amber-400">
                    Necesita permiso de parametrización de tipos funcionales o de ventanilla.
                  </p>
                </template>
              </PermissionGate>
            </div>
            <div v-else class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <div class="grid gap-2">
                <Label>Tipo de este flujo</Label>
                <ArchivalSingleMultiselect
                  v-model="selectedFunctionalTypeKey"
                  :options="functionalTypeOptions"
                  :can-clear="false"
                  :disabled="bindingSaving"
                  placeholder="Buscar tipo funcional"
                  no-options-text="Sin tipos"
                  no-results-text="Sin coincidencias"
                />
              </div>
              <Button
                :disabled="bindingSaving || !selectedFunctionalTypeKey || !functionalTypeDirty"
                @click="bindFunctionalType"
              >
                {{ bindingSaving ? 'Guardando…' : 'Guardar tipo' }}
              </Button>
            </div>
            <Alert v-if="bindingsForDefinition.length > 1" variant="destructive">
              <AlertTitle>Este flujo tiene varios tipos</AlertTitle>
              <AlertDescription>
                Elija uno y guarde. Los demás quedan sin este flujo.
              </AlertDescription>
            </Alert>
            <p v-else-if="boundFunctionalType" class="text-xs text-muted-foreground">
              Asociado ahora: {{ boundFunctionalType.label }}
              <template v-if="boundFunctionalType.sla_business_days != null">
                · {{ boundFunctionalType.sla_business_days }} días hábiles
              </template>
              <template v-else>
                · sin SLA
              </template>
            </p>
            <p v-else-if="selectedFunctionalType" class="text-xs text-muted-foreground">
              Guarde para asociar «{{ selectedFunctionalType.label }}» a este flujo.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent class="p-4">
            <WorkflowDefinitionPreview :stages="stages" :example="stages.length === 0" />
          </CardContent>
        </Card>

        <Alert v-if="slaMode === 'unbound'">
          <Icon name="lucide:timer" class="size-4" />
          <AlertTitle>Falta el tipo funcional</AlertTitle>
          <AlertDescription>
            Asocie un tipo arriba para tomar su SLA. Hasta entonces las etapas no pueden consumir días.
          </AlertDescription>
        </Alert>

        <Alert v-else-if="slaMode === 'none'">
          <Icon name="lucide:timer" class="size-4" />
          <AlertTitle>Este tipo no tiene SLA</AlertTitle>
          <AlertDescription>
            «{{ boundFunctionalType?.label }}» no define días hábiles. Las etapas de este flujo quedan sin SLA.
          </AlertDescription>
        </Alert>

        <Alert v-else :variant="(slaRemaining ?? 0) < 0 ? 'destructive' : 'default'">
          <Icon name="lucide:timer" class="size-4" />
          <AlertTitle>
            SLA de {{ boundFunctionalType?.label }}: {{ slaBudget }} días hábiles
          </AlertTitle>
          <AlertDescription>
            Las etapas consumen {{ slaConsumed }} días.
            <template v-if="(slaRemaining ?? 0) < 0">
              Superan el tipo por {{ Math.abs(slaRemaining ?? 0) }}. Ajuste el SLA de cada etapa.
            </template>
            <template v-else>
              Quedan {{ slaRemaining }} días por repartir.
            </template>
          </AlertDescription>
        </Alert>

        <div class="flex flex-wrap items-center justify-between gap-3">
          <p class="text-sm text-muted-foreground">
            {{ stages.length }} etapa(s) — el orden define las columnas del tablero
          </p>
          <div v-if="!isStructureLocked" class="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" @click="importDialogOpen = true">
              <Icon name="lucide:copy" class="mr-1 size-4" />
              Importar etapas
            </Button>
            <Button size="sm" @click="openCreateStage">
              <Icon name="lucide:plus" class="mr-1 size-4" />
              Nueva etapa
            </Button>
          </div>
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
                  <span v-if="stage.captures_metadata">
                    Metadatos{{ stage.metadata_schema?.name ? `: ${stage.metadata_schema.name}` : '' }}
                  </span>
                  <span v-if="stage.allows_collaborators">Colaboradores</span>
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
                  <Badge
                    v-if="stage.requires_authorization_decision || stage.assignee_type === 'producer_org_unit_manager'"
                    variant="outline"
                    class="text-xs"
                  >
                    Aprobado / Denegado
                  </Badge>
                </div>
              </div>
              <div v-if="!isStructureLocked" class="flex gap-2">
                <Button variant="outline" size="sm" @click="openEditStage(stage)">
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  class="text-destructive"
                  :disabled="stages.length <= 1"
                  @click="openDeleteStageDialog(stage)"
                >
                  Eliminar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

    </Tabs>

    <Dialog v-model:open="importDialogOpen">
      <DialogContent class="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar etapas</DialogTitle>
          <DialogDescription>
            Copia las etapas de otro flujo. Si este ya tiene etapas sin tareas, se reemplazan. Después ajuste el SLA para que no supere los días del tipo funcional.
          </DialogDescription>
        </DialogHeader>
        <div class="grid gap-3 py-2">
          <Alert v-if="slaMode === 'unbound'">
            <AlertDescription>
              Primero asocie el tipo funcional. Así el SLA importado se puede adaptar a sus días.
            </AlertDescription>
          </Alert>
          <div class="grid gap-2">
            <Label>Flujo de origen</Label>
            <Select v-model="importSourceId" :disabled="slaMode === 'unbound'">
              <SelectTrigger>
                <SelectValue placeholder="Seleccione un flujo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="item in importCandidates"
                  :key="item.id"
                  :value="String(item.id)"
                >
                  {{ item.name }} · {{ item.stages?.length ?? 0 }} etapas
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="importDialogOpen = false">
            Cancelar
          </Button>
          <Button
            :disabled="importingStages || slaMode === 'unbound' || !importSourceId"
            @click="importStages"
          >
            {{ importingStages ? 'Importando…' : 'Importar y editar' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <ConfirmWithReasonDialog
      v-model:open="deleteStageDialogOpen"
      title="Eliminar etapa"
      :description="stagePendingDelete
        ? `Se eliminará la etapa «${stagePendingDelete.name}» (${stagePendingDelete.key}) del flujo. Esta acción no se puede deshacer.`
        : ''"
      reason-label="Motivo de la eliminación"
      reason-placeholder="Indica por qué se elimina esta etapa del flujo…"
      confirm-text="Eliminar etapa"
      cancel-text="Cancelar"
      :loading="deletingStage"
      @confirm="onDeleteStageConfirm"
    />
  </div>
</template>
