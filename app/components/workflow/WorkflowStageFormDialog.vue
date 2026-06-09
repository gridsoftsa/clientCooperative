<script setup lang="ts">
import { toast } from 'vue-sonner'
import {
  WORKFLOW_ASSIGNEE_TYPE_OPTIONS,
  WORKFLOW_STAGE_TYPE_OPTIONS,
} from '~/constants/workflow'
import type { WorkflowStage, WorkflowStagePayload } from '~/types/workflow'
import type { OrgPositionRow, OrgUnitRow } from '~/composables/useOrgStructureApi'

const props = defineProps<{
  open: boolean
  definitionId: number
  stage?: WorkflowStage | null
  nextSortOrder: number
  locked?: boolean
  users: Array<{ id: number, name: string }>
  orgUnits: OrgUnitRow[]
  positions: OrgPositionRow[]
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  saved: []
}>()

const workflowApi = useWorkflowApi()
const saving = ref(false)
const isEdit = computed(() => !!props.stage?.id)

const form = reactive({
  key: '',
  name: '',
  sort_order: 1,
  stage_type: 'manual',
  assignee_type: 'org_unit_manager',
  assignee_user_id: '' as string,
  assignee_org_unit_id: '' as string,
  assignee_position_id: '' as string,
  sla_business_days: null as number | null,
  allows_advance: true,
  allows_return: false,
  allows_reassign: true,
  is_terminal: false,
})

watch(() => props.open, (isOpen) => {
  if (!isOpen)
    return

  if (props.stage) {
    form.key = props.stage.key
    form.name = props.stage.name
    form.sort_order = props.stage.sort_order
    form.stage_type = props.stage.stage_type
    form.assignee_type = props.stage.assignee_type
    form.assignee_user_id = props.stage.assignee_user_id ? String(props.stage.assignee_user_id) : ''
    form.assignee_org_unit_id = props.stage.assignee_org_unit_id ? String(props.stage.assignee_org_unit_id) : ''
    form.assignee_position_id = props.stage.assignee_position_id ? String(props.stage.assignee_position_id) : ''
    form.sla_business_days = props.stage.sla_business_days
    form.allows_advance = props.stage.allows_advance
    form.allows_return = props.stage.allows_return
    form.allows_reassign = props.stage.allows_reassign
    form.is_terminal = props.stage.is_terminal
  }
  else {
    form.key = ''
    form.name = ''
    form.sort_order = props.nextSortOrder
    form.stage_type = 'manual'
    form.assignee_type = 'org_unit_manager'
    form.assignee_user_id = ''
    form.assignee_org_unit_id = ''
    form.assignee_position_id = ''
    form.sla_business_days = null
    form.allows_advance = true
    form.allows_return = false
    form.allows_reassign = true
    form.is_terminal = false
  }
})

function buildPayload(): WorkflowStagePayload {
  const payload: WorkflowStagePayload = {
    key: form.key.trim(),
    name: form.name.trim(),
    sort_order: form.sort_order,
    stage_type: form.stage_type,
    assignee_type: form.assignee_type,
    allows_advance: form.allows_advance,
    allows_return: form.allows_return,
    allows_reassign: form.allows_reassign,
    is_terminal: form.is_terminal,
    sla_business_days: form.sla_business_days,
    assignee_user_id: null,
    assignee_org_unit_id: null,
    assignee_position_id: null,
  }

  if (form.assignee_type === 'specific_user' && form.assignee_user_id)
    payload.assignee_user_id = Number(form.assignee_user_id)
  if (form.assignee_type === 'org_unit' && form.assignee_org_unit_id)
    payload.assignee_org_unit_id = Number(form.assignee_org_unit_id)
  if (form.assignee_type === 'position' && form.assignee_position_id)
    payload.assignee_position_id = Number(form.assignee_position_id)

  return payload
}

async function save() {
  if (props.locked) {
    toast.error('El flujo está en uso y no se puede modificar.')
    return
  }

  if (!form.name.trim()) {
    toast.error('Indique el nombre de la etapa.')
    return
  }

  if (!isEdit.value && !/^[a-z0-9_-]+$/.test(form.key.trim())) {
    toast.error('La clave debe usar solo minúsculas, números, guiones o guión bajo.')
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

    emit('update:open', false)
    emit('saved')
  }
  catch (e: unknown) {
    const msg = e && typeof e === 'object' && 'data' in e
      ? JSON.stringify((e as { data?: unknown }).data)
      : 'No se pudo guardar la etapa.'
    toast.error(typeof msg === 'string' && msg.length < 120 ? msg : 'No se pudo guardar la etapa.')
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
      <DialogHeader>
        <DialogTitle>{{ isEdit ? 'Editar etapa' : 'Nueva etapa' }}</DialogTitle>
        <DialogDescription>
          Configure nombre, orden, responsable, SLA y reglas de transición.
        </DialogDescription>
      </DialogHeader>

      <div class="grid gap-4 py-2">
        <div v-if="!isEdit" class="grid gap-2">
          <Label for="stage-key">Clave técnica</Label>
          <Input
            id="stage-key"
            v-model="form.key"
            placeholder="ej. assign, review, close"
            :disabled="locked"
          />
          <p class="text-xs text-muted-foreground">
            Solo minúsculas, números, guiones o guión bajo. No se puede cambiar después.
          </p>
        </div>

        <div class="grid gap-2">
          <Label for="stage-name">Nombre</Label>
          <Input id="stage-name" v-model="form.name" placeholder="Asignar responsable" :disabled="locked" />
        </div>

        <div class="grid grid-cols-2 gap-3">
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
          <Label>Responsable</Label>
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
          <Select v-model="form.assignee_user_id" :disabled="locked">
            <SelectTrigger>
              <SelectValue placeholder="Seleccione usuario" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="user in users"
                :key="user.id"
                :value="String(user.id)"
              >
                {{ user.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div v-if="form.assignee_type === 'org_unit'" class="grid gap-2">
          <Label>Área</Label>
          <Select v-model="form.assignee_org_unit_id" :disabled="locked">
            <SelectTrigger>
              <SelectValue placeholder="Seleccione área" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="unit in orgUnits"
                :key="unit.id"
                :value="String(unit.id)"
              >
                {{ unit.name }} ({{ unit.code }})
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div v-if="form.assignee_type === 'position'" class="grid gap-2">
          <Label>Cargo</Label>
          <Select v-model="form.assignee_position_id" :disabled="locked">
            <SelectTrigger>
              <SelectValue placeholder="Seleccione cargo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="pos in positions"
                :key="pos.id"
                :value="String(pos.id)"
              >
                {{ pos.name }} — {{ pos.org_unit?.name ?? '' }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="grid gap-2">
          <Label for="stage-sla">SLA (días hábiles por etapa)</Label>
          <Input
            id="stage-sla"
            v-model.number="form.sla_business_days"
            type="number"
            min="1"
            max="365"
            placeholder="Opcional"
            :disabled="locked"
          />
        </div>

        <div class="rounded-lg border p-3 space-y-3">
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
      </div>

      <DialogFooter>
        <Button variant="outline" @click="emit('update:open', false)">
          Cancelar
        </Button>
        <Button :disabled="locked || saving" @click="save">
          {{ saving ? 'Guardando…' : (isEdit ? 'Actualizar' : 'Crear etapa') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
