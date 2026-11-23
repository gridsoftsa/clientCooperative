<script setup lang="ts">
import { toast } from 'vue-sonner'
import {
  WORKFLOW_ASSIGNEE_TYPE_OPTIONS,
  WORKFLOW_STAGE_TYPE_OPTIONS,
  WORKFLOW_VENTANILLA_ROLE_OPTIONS,
} from '~/constants/workflow'
import { suggestWorkflowStageKey } from '~/utils/workflow-technical-key'
import type { WorkflowStage, WorkflowStagePayload } from '~/types/workflow'
import type { OrgPositionRow, OrgUnitRow } from '~/composables/useOrgStructureApi'

const props = defineProps<{
  definitionId: number
  stage?: WorkflowStage | null
  nextSortOrder: number
  locked?: boolean
  users: Array<{ id: number, name: string, email?: string | null }>
  orgUnits: OrgUnitRow[]
  positions: OrgPositionRow[]
  slaMode?: 'unbound' | 'none' | 'limited'
  functionalTypeLabel?: string | null
  slaBudget?: number | null
  maxSlaDays?: number | null
  consumedByOtherStages?: number
}>()

const emit = defineEmits<{
  cancel: []
  saved: []
}>()

type StageConfigTab = 'general' | 'assignee' | 'ventanilla' | 'transition'

const workflowApi = useWorkflowApi()
const saving = ref(false)
const activeTab = ref<StageConfigTab>('general')
const isEdit = computed(() => !!props.stage?.id)
const suggestedStageKey = computed(() => suggestWorkflowStageKey(form.name))

const form = reactive({
  name: '',
  sort_order: 1,
  stage_type: 'manual',
  assignee_type: 'org_unit_manager',
  assignee_user_id: null as number | null,
  assignee_org_unit_id: null as number | null,
  assignee_position_id: null as number | null,
  sla_business_days: null as number | null,
  allows_advance: true,
  allows_return: false,
  allows_reassign: true,
  is_terminal: false,
  ventanilla_role: 'none' as string,
  captures_metadata: true,
  allows_collaborators: true,
  metadata_schema_choice: 'filing' as string,
})

const metadataSchemas = ref<Array<{ id: number, name: string, version_number: number }>>([])
const isManagementRole = computed(() => form.ventanilla_role === 'management')

function hydrateForm(): void {
  if (props.stage) {
    form.name = props.stage.name
    form.sort_order = props.stage.sort_order
    form.stage_type = props.stage.stage_type
    form.assignee_type = props.stage.assignee_type
    form.assignee_user_id = props.stage.assignee_user_id ?? null
    form.assignee_org_unit_id = props.stage.assignee_org_unit_id ?? null
    form.assignee_position_id = props.stage.assignee_position_id ?? null
    form.sla_business_days = props.stage.sla_business_days
    form.allows_advance = props.stage.allows_advance
    form.allows_return = props.stage.allows_return
    form.allows_reassign = props.stage.allows_reassign
    form.is_terminal = props.stage.is_terminal
    form.ventanilla_role = props.stage.ventanilla_role ?? 'none'
    form.captures_metadata = props.stage.captures_metadata ?? props.stage.ventanilla_role === 'management'
    form.allows_collaborators = props.stage.allows_collaborators ?? props.stage.ventanilla_role === 'management'
    form.metadata_schema_choice = props.stage.archival_metadata_schema_id
      ? String(props.stage.archival_metadata_schema_id)
      : 'filing'

    return
  }

  form.name = ''
  form.sort_order = props.nextSortOrder
  form.stage_type = 'manual'
  form.assignee_type = 'org_unit_manager'
  form.assignee_user_id = null
  form.assignee_org_unit_id = null
  form.assignee_position_id = null
  form.sla_business_days = null
  form.allows_advance = true
  form.allows_return = false
  form.allows_reassign = true
  form.is_terminal = false
  form.ventanilla_role = 'none'
  form.captures_metadata = true
  form.allows_collaborators = true
  form.metadata_schema_choice = 'filing'
}

watch(() => [props.stage?.id, props.nextSortOrder] as const, () => {
  hydrateForm()
}, { immediate: true })

onMounted(() => {
  workflowApi.fetchMetadataSchemas()
    .then((rows) => {
      metadataSchemas.value = rows
    })
    .catch(() => {
      metadataSchemas.value = []
    })
})

watch(() => form.assignee_type, (type) => {
  if (type !== 'specific_user')
    form.assignee_user_id = null
  if (type !== 'org_unit')
    form.assignee_org_unit_id = null
  if (type !== 'position')
    form.assignee_position_id = null
})

const slaMode = computed(() => props.slaMode ?? 'unbound')
const slaInputDisabled = computed(() => props.locked || slaMode.value !== 'limited')
const slaHelper = computed(() => {
  if (slaMode.value === 'unbound') {
    return 'Asocie un tipo funcional en Etapas. El SLA de la etapa sale de los días de ese tipo.'
  }

  if (slaMode.value === 'none') {
    return `«${props.functionalTypeLabel ?? 'Este tipo'}» no tiene SLA. Esta etapa no consume días.`
  }

  const budget = props.slaBudget ?? 0
  const others = props.consumedByOtherStages ?? 0
  const max = props.maxSlaDays ?? 0

  if (max < 1) {
    return `«${props.functionalTypeLabel ?? 'El tipo'}» tiene ${budget} días y las demás etapas ya los consumen. Deje el SLA vacío o reduzca otras etapas.`
  }

  return `«${props.functionalTypeLabel ?? 'El tipo'}» tiene ${budget} días hábiles. Las demás etapas consumen ${others}. Esta etapa puede usar hasta ${max}.`
})

const userOptions = computed(() =>
  props.users.map(user => ({
    value: user.id,
    label: user.email ? `${user.name} · ${user.email}` : user.name,
  })),
)

const orgUnitOptions = computed(() =>
  props.orgUnits.map(unit => ({
    value: unit.id,
    label: `${unit.name} (${unit.code})`,
  })),
)

const positionOptions = computed(() =>
  props.positions.map(position => ({
    value: position.id,
    label: position.org_unit?.name
      ? `${position.name} — ${position.org_unit.name}`
      : position.name,
  })),
)

function buildPayload(): WorkflowStagePayload {
  const payload: WorkflowStagePayload = {
    name: form.name.trim(),
    sort_order: form.sort_order,
    stage_type: form.stage_type,
    assignee_type: form.assignee_type,
    allows_advance: form.allows_advance,
    allows_return: form.allows_return,
    allows_reassign: form.allows_reassign,
    is_terminal: form.is_terminal,
    sla_business_days: typeof form.sla_business_days === 'number'
      && Number.isFinite(form.sla_business_days)
      && form.sla_business_days >= 1
      ? form.sla_business_days
      : null,
    ventanilla_role: form.ventanilla_role === 'none' ? null : form.ventanilla_role,
    captures_metadata: form.ventanilla_role === 'management' && form.captures_metadata,
    allows_collaborators: form.ventanilla_role === 'management' && form.allows_collaborators,
    archival_metadata_schema_id: form.ventanilla_role === 'management'
      && form.captures_metadata
      && form.metadata_schema_choice !== 'filing'
      ? Number(form.metadata_schema_choice)
      : null,
    assignee_user_id: null,
    assignee_org_unit_id: null,
    assignee_position_id: null,
  }

  if (form.assignee_type === 'specific_user' && form.assignee_user_id)
    payload.assignee_user_id = form.assignee_user_id
  if (form.assignee_type === 'org_unit' && form.assignee_org_unit_id)
    payload.assignee_org_unit_id = form.assignee_org_unit_id
  if (form.assignee_type === 'position' && form.assignee_position_id)
    payload.assignee_position_id = form.assignee_position_id

  return payload
}

function failValidation(tab: StageConfigTab, message: string): boolean {
  activeTab.value = tab
  toast.error(message)

  return false
}

function validateForm(): boolean {
  if (props.locked) {
    return failValidation('general', 'El flujo está en uso y no se puede modificar.')
  }

  if (!form.name.trim()) {
    return failValidation('general', 'Indique el nombre de la etapa.')
  }

  if (form.assignee_type === 'specific_user' && !form.assignee_user_id) {
    return failValidation('assignee', 'Seleccione el usuario responsable.')
  }
  if (form.assignee_type === 'org_unit' && !form.assignee_org_unit_id) {
    return failValidation('assignee', 'Seleccione el área responsable.')
  }
  if (form.assignee_type === 'position' && !form.assignee_position_id) {
    return failValidation('assignee', 'Seleccione el cargo responsable.')
  }

  const sla = typeof form.sla_business_days === 'number' && form.sla_business_days >= 1
    ? form.sla_business_days
    : null

  if (slaMode.value === 'limited' && sla != null && sla > (props.maxSlaDays ?? 0)) {
    return failValidation('general', `Esta etapa puede usar hasta ${props.maxSlaDays ?? 0} días del SLA del tipo funcional.`)
  }

  if (slaMode.value !== 'limited' && sla != null) {
    return failValidation('general', slaMode.value === 'none'
      ? 'Este tipo funcional no tiene SLA. Deje el campo vacío.'
      : 'Asocie un tipo funcional antes de indicar días de SLA.')
  }

  return true
}

async function save() {
  if (!validateForm()) {
    return
  }

  saving.value = true

  try {
    if (isEdit.value && props.stage) {
      const { key: _key, ...updatePayload } = buildPayload()
      await workflowApi.updateStage(props.stage.id, updatePayload)
      toast.success('Etapa actualizada.')
    }
    else {
      await workflowApi.createStage(props.definitionId, buildPayload())
      toast.success('Etapa creada.')
    }

    emit('saved')
  }
  catch (e: unknown) {
    const err = e as { data?: { message?: string, errors?: Record<string, string[]> } }
    const first = err.data?.errors ? Object.values(err.data.errors)[0]?.[0] : null
    toast.error(first ?? (err.data?.message && err.data.message !== 'Server Error' ? err.data.message : null) ?? 'No se pudo guardar la etapa.')
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>{{ isEdit ? 'Editar etapa' : 'Nueva etapa' }}</CardTitle>
      <CardDescription>
        Use las pestañas para configurar la etapa. Guardar aplica todos los datos, no solo la pestaña activa.
      </CardDescription>
    </CardHeader>
    <CardContent>
      <Tabs v-model="activeTab" class="gap-4">
        <TabsList class="flex h-auto w-full flex-wrap">
          <TabsTrigger value="general" class="flex-1">
            General
          </TabsTrigger>
          <TabsTrigger value="assignee" class="flex-1">
            Responsable
          </TabsTrigger>
          <TabsTrigger value="ventanilla" class="flex-1">
            Ventanilla
          </TabsTrigger>
          <TabsTrigger value="transition" class="flex-1">
            Transición
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" class="grid gap-5">
          <div v-if="!isEdit" class="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            La <span class="font-medium text-foreground">clave técnica</span> se asignará al crear
            (ej.
            <span class="font-mono text-xs">{{ suggestedStageKey || 'asignar_responsable' }}</span>).
            No se puede cambiar después.
          </div>

          <div class="grid gap-2">
            <Label for="stage-name">Nombre</Label>
            <Input id="stage-name" v-model="form.name" placeholder="Asignar responsable" :disabled="locked" />
          </div>

          <div class="grid gap-3 sm:grid-cols-2">
            <div class="grid gap-2">
              <Label for="stage-order">Orden</Label>
              <Input
                id="stage-order"
                v-model.number="form.sort_order"
                type="number"
                min="1"
                :disabled="locked"
              />
            </div>
            <div class="grid gap-2">
              <Label>Tipo de etapa</Label>
              <Select v-model="form.stage_type" :disabled="locked">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="opt in WORKFLOW_STAGE_TYPE_OPTIONS"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div class="grid gap-2">
            <Label for="stage-sla">SLA (días hábiles de esta etapa)</Label>
            <Input
              id="stage-sla"
              v-model.number="form.sla_business_days"
              type="number"
              min="1"
              :max="slaMode === 'limited' ? (maxSlaDays ?? 1) : undefined"
              placeholder="Vacío si esta etapa no consume días"
              :disabled="slaInputDisabled"
            />
            <p class="text-xs text-muted-foreground">
              {{ slaHelper }}
            </p>
          </div>
        </TabsContent>

        <TabsContent value="assignee" class="grid gap-5">
          <div class="grid gap-2">
            <Label>Responsable</Label>
            <p v-if="isManagementRole" class="text-xs text-muted-foreground">
              Este responsable aplica únicamente a esta etapa de gestión.
            </p>
            <Select v-model="form.assignee_type" :disabled="locked">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="opt in WORKFLOW_ASSIGNEE_TYPE_OPTIONS"
                  :key="opt.value"
                  :value="opt.value"
                >
                  {{ opt.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div v-if="form.assignee_type === 'specific_user'" class="grid gap-2">
            <Label>Usuario</Label>
            <ArchivalSingleMultiselect
              v-model="form.assignee_user_id"
              coerce-number
              :options="userOptions"
              :disabled="locked"
              placeholder="Buscar usuario"
              no-options-text="No hay usuarios asignables"
              no-results-text="Sin coincidencias"
            />
            <p v-if="userOptions.length === 0" class="text-xs text-muted-foreground">
              No hay usuarios con permiso de workflow para asignar.
            </p>
          </div>

          <div v-if="form.assignee_type === 'org_unit'" class="grid gap-2">
            <Label>Área</Label>
            <ArchivalSingleMultiselect
              v-model="form.assignee_org_unit_id"
              coerce-number
              :options="orgUnitOptions"
              :disabled="locked"
              placeholder="Buscar área"
              no-options-text="No hay áreas"
              no-results-text="Sin coincidencias"
            />
          </div>

          <div v-if="form.assignee_type === 'position'" class="grid gap-2">
            <Label>Cargo</Label>
            <ArchivalSingleMultiselect
              v-model="form.assignee_position_id"
              coerce-number
              :options="positionOptions"
              :disabled="locked"
              placeholder="Buscar cargo"
              no-options-text="No hay cargos"
              no-results-text="Sin coincidencias"
            />
          </div>
        </TabsContent>

        <TabsContent value="ventanilla" class="grid gap-5">
          <div class="grid gap-2">
            <Label>Integración con ventanilla</Label>
            <Select v-model="form.ventanilla_role" :disabled="locked">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="opt in WORKFLOW_VENTANILLA_ROLE_OPTIONS"
                  :key="opt.value"
                  :value="opt.value"
                >
                  {{ opt.label }}
                </SelectItem>
              </SelectContent>
            </Select>
            <p class="text-xs text-muted-foreground">
              Vincula esta etapa con acciones del radicado (asignar, iniciar gestión, cerrar).
              Puede haber varias etapas de gestión. Asignación y cierre siguen siendo una sola etapa por flujo.
            </p>
          </div>

          <div v-if="isManagementRole" class="space-y-3 rounded-lg border p-4">
            <p class="text-sm font-medium">
              Parámetros de esta etapa de gestión
            </p>
            <p class="text-xs text-muted-foreground">
              El responsable, los metadatos y los colaboradores se configuran solo para esta etapa.
            </p>
            <label class="flex items-center gap-2 text-sm">
              <Checkbox v-model="form.captures_metadata" :disabled="locked" />
              Capturar metadatos en esta etapa
            </label>
            <div v-if="form.captures_metadata" class="grid gap-2">
              <Label>Esquema de metadatos</Label>
              <Select v-model="form.metadata_schema_choice" :disabled="locked">
                <SelectTrigger>
                  <SelectValue placeholder="Esquema del radicado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="filing">
                    Esquema del radicado
                  </SelectItem>
                  <SelectItem
                    v-for="schema in metadataSchemas"
                    :key="schema.id"
                    :value="String(schema.id)"
                  >
                    {{ schema.name }} · v{{ schema.version_number }}
                  </SelectItem>
                </SelectContent>
              </Select>
              <p class="text-xs text-muted-foreground">
                «Esquema del radicado» usa el tipo documental o el tipo funcional. Un esquema propio guarda los valores solo en esta etapa.
              </p>
            </div>
            <label class="flex items-center gap-2 text-sm">
              <Checkbox v-model="form.allows_collaborators" :disabled="locked" />
              Permitir colaboradores en esta etapa
            </label>
          </div>
        </TabsContent>

        <TabsContent value="transition">
          <div class="space-y-3 rounded-lg border p-4">
            <p class="text-sm font-medium">
              Reglas de transición
            </p>
            <div class="flex flex-wrap gap-4">
              <label class="flex items-center gap-2 text-sm">
                <Checkbox v-model="form.allows_advance" :disabled="locked" />
                Permitir avanzar
              </label>
              <label class="flex items-center gap-2 text-sm">
                <Checkbox v-model="form.allows_return" :disabled="locked" />
                Permitir devolver
              </label>
              <label class="flex items-center gap-2 text-sm">
                <Checkbox v-model="form.allows_reassign" :disabled="locked" />
                Permitir reasignar
              </label>
              <label class="flex items-center gap-2 text-sm">
                <Checkbox v-model="form.is_terminal" :disabled="locked" />
                Etapa de cierre
              </label>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </CardContent>
    <CardFooter class="justify-end gap-2">
      <Button variant="outline" @click="emit('cancel')">
        Cancelar
      </Button>
      <Button :disabled="locked || saving" @click="save">
        {{ saving ? 'Guardando…' : (isEdit ? 'Actualizar' : 'Crear etapa') }}
      </Button>
    </CardFooter>
  </Card>
</template>
