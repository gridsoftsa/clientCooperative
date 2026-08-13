<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { OrgPositionRow, OrgUnitRow } from '~/composables/useOrgStructureApi'
import type { OrgStaffListItem } from '~/types/org-structure'
import type { WorkflowTaskCollaboratorRow } from '~/types/workflow'
import { extractApiErrorMessage } from '~/utils/workflow-task-ui'

const props = defineProps<{
  taskId: number
}>()

const emit = defineEmits<{
  changed: []
}>()

const workflowApi = useWorkflowApi()
const orgApi = useOrgStructureApi()

const loading = ref(true)
const saving = ref(false)
const collaborators = ref<WorkflowTaskCollaboratorRow[]>([])
const summary = ref({ total: 0, pending: 0, all_responded: true, can_manage: true })

const orgUnits = ref<OrgUnitRow[]>([])
const positions = ref<OrgPositionRow[]>([])
const staffResults = ref<OrgStaffListItem[]>([])
const selectedOrgUnitId = ref<string>('')
const selectedPositionId = ref<string>('')
const selectedStaffId = ref<string>('')
const staffQuery = ref('')

const selectedStaff = computed(() =>
  staffResults.value.find(item => String(item.id) === selectedStaffId.value) ?? null,
)

async function loadCollaborators() {
  loading.value = true

  try {
    const result = await workflowApi.fetchTaskCollaborators(props.taskId)
    collaborators.value = result.data
    summary.value = result.meta
  }
  catch (error) {
    toast.error(extractApiErrorMessage(error))
  }
  finally {
    loading.value = false
  }
}

async function loadOrgUnits() {
  orgUnits.value = await orgApi.fetchUnits({ activeOnly: true })
}

async function loadPositions() {
  if (!selectedOrgUnitId.value) {
    positions.value = []
    return
  }

  positions.value = await orgApi.fetchPositions({
    activeOnly: true,
    orgUnitId: Number(selectedOrgUnitId.value),
  })
}

async function searchStaff() {
  if (!selectedOrgUnitId.value) {
    staffResults.value = []
    return
  }

  const orgUnitIds = [Number(selectedOrgUnitId.value)]
  const orgPositionIds = selectedPositionId.value ? [Number(selectedPositionId.value)] : undefined

  staffResults.value = await orgApi.fetchStaff({
    activeOnly: true,
    q: staffQuery.value.trim() || undefined,
    orgUnitIds,
    orgPositionIds,
  })

  staffResults.value = staffResults.value.filter(item => item.user_id != null)
}

watch(() => props.taskId, () => {
  void loadCollaborators()
}, { immediate: true })

watch(selectedOrgUnitId, async () => {
  selectedPositionId.value = ''
  selectedStaffId.value = ''
  await loadPositions()
  await searchStaff()
})

watch(selectedPositionId, async () => {
  selectedStaffId.value = ''
  await searchStaff()
})

onMounted(async () => {
  await loadOrgUnits()
})

function staffLabel(item: OrgStaffListItem): string {
  const name = item.full_name ?? `${item.first_name} ${item.first_last_name}`.trim()
  const position = item.current_assignment?.org_position?.name
  const unit = item.current_assignment?.org_unit?.name

  return [name, position, unit].filter(Boolean).join(' · ')
}

function statusLabel(status: WorkflowTaskCollaboratorRow['status']): string {
  return status === 'responded' ? 'Respondió' : 'Pendiente'
}

async function inviteCollaborator() {
  const staff = selectedStaff.value

  if (!staff?.user_id) {
    toast.error('Seleccione un colaborador con usuario vinculado.')

    return
  }

  saving.value = true

  try {
    await workflowApi.inviteTaskCollaborator(props.taskId, {
      user_id: staff.user_id,
      org_unit_id: selectedOrgUnitId.value ? Number(selectedOrgUnitId.value) : null,
      org_position_id: selectedPositionId.value ? Number(selectedPositionId.value) : null,
    })
    toast.success('Colaborador agregado y notificado.')
    selectedStaffId.value = ''
    await loadCollaborators()
    emit('changed')
  }
  catch (error) {
    toast.error(extractApiErrorMessage(error))
  }
  finally {
    saving.value = false
  }
}

async function removeCollaborator(row: WorkflowTaskCollaboratorRow) {
  saving.value = true

  try {
    await workflowApi.removeTaskCollaborator(props.taskId, row.id)
    toast.success('Colaborador eliminado.')
    await loadCollaborators()
    emit('changed')
  }
  catch (error) {
    toast.error(extractApiErrorMessage(error))
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="space-y-5">
    <Alert v-if="summary.pending > 0" variant="secondary">
      <Icon name="i-lucide-users" class="size-4" />
      <AlertTitle>Respuestas pendientes</AlertTitle>
      <AlertDescription>
        {{ summary.pending }} colaborador(es) aún no han subido su aporte. No podrá avanzar de etapa hasta que todos respondan.
      </AlertDescription>
    </Alert>

    <div class="space-y-3 rounded-lg border bg-muted/20 p-4">
      <p class="text-sm font-medium">
        Agregar colaborador
      </p>

      <div class="grid gap-3">
        <div class="space-y-2">
          <Label>Área</Label>
          <Select v-model="selectedOrgUnitId">
            <SelectTrigger>
              <SelectValue placeholder="Seleccione área" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="unit in orgUnits" :key="unit.id" :value="String(unit.id)">
                {{ unit.code }} — {{ unit.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="space-y-2">
          <Label>Cargo (opcional)</Label>
          <Select v-model="selectedPositionId" :disabled="!selectedOrgUnitId">
            <SelectTrigger>
              <SelectValue placeholder="Todos los cargos del área" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="position in positions" :key="position.id" :value="String(position.id)">
                {{ position.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="space-y-2">
          <Label>Buscar persona</Label>
          <div class="flex gap-2">
            <Input v-model="staffQuery" placeholder="Nombre o documento" :disabled="!selectedOrgUnitId" @keyup.enter="searchStaff" />
            <Button type="button" variant="outline" :disabled="!selectedOrgUnitId || saving" @click="searchStaff">
              Buscar
            </Button>
          </div>
        </div>

        <div class="space-y-2">
          <Label>Colaborador</Label>
          <Select v-model="selectedStaffId" :disabled="!staffResults.length">
            <SelectTrigger>
              <SelectValue placeholder="Seleccione colaborador" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="item in staffResults" :key="item.id" :value="String(item.id)">
                {{ staffLabel(item) }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button class="w-full" :disabled="saving || !selectedStaffId" @click="inviteCollaborator">
          Agregar y notificar
        </Button>
      </div>
    </div>

    <div v-if="loading" class="text-sm text-muted-foreground">
      Cargando colaboradores…
    </div>

    <div v-else-if="collaborators.length" class="space-y-3">
      <div
        v-for="row in collaborators"
        :key="row.id"
        class="rounded-lg border bg-card p-4 text-sm"
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="font-medium">
              {{ row.user?.name ?? 'Usuario' }}
            </p>
            <p v-if="row.org_unit || row.org_position" class="text-xs text-muted-foreground">
              <span v-if="row.org_unit">{{ row.org_unit.name }}</span>
              <span v-if="row.org_position"> · {{ row.org_position.name }}</span>
            </p>
            <p class="mt-1 text-xs text-muted-foreground">
              Invitado por {{ row.invited_by?.name ?? '—' }}
            </p>
          </div>
          <Badge :variant="row.status === 'responded' ? 'secondary' : 'outline'">
            {{ statusLabel(row.status) }}
          </Badge>
        </div>

        <p v-if="row.response_note" class="mt-2 text-muted-foreground">
          {{ row.response_note }}
        </p>

        <ul v-if="row.files.length" class="mt-2 space-y-1 text-xs text-muted-foreground">
          <li v-for="file in row.files" :key="file.id">
            {{ file.title }} ({{ file.original_name }})
          </li>
        </ul>

        <Button
          v-if="row.status === 'pending'"
          variant="ghost"
          size="sm"
          class="mt-3 text-destructive hover:text-destructive"
          :disabled="saving"
          @click="removeCollaborator(row)"
        >
          Quitar
        </Button>
      </div>
    </div>

    <p v-else class="text-sm text-muted-foreground">
      Aún no hay colaboradores en esta tarea.
    </p>
  </div>
</template>
