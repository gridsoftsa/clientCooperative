<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { OrgPositionRow, OrgUnitRow } from '~/composables/useOrgStructureApi'
import type { OrgStaffListItem } from '~/types/org-structure'
import type { WorkflowTaskCollaboratorRow } from '~/types/workflow'
import { extractApiErrorMessage } from '~/utils/workflow-task-ui'
import { canPreviewDocumentInline } from '~/utils/document-preview'
import DocumentInlinePreviewDialog from '~/components/radicacion/DocumentInlinePreviewDialog.vue'

const props = defineProps<{
  taskId?: number | null
  readOnly?: boolean
  rows?: WorkflowTaskCollaboratorRow[]
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
const requestNote = ref('')
const openingFileId = ref<number | null>(null)
const {
  open: inlinePreviewOpen,
  title: inlinePreviewTitle,
  previewUrl: inlinePreviewUrl,
  previewKind: inlinePreviewKind,
  presentBlob,
} = useInlineFilePreview()

function fileCanPreview(fileName: string, mimeType?: string | null): boolean {
  return canPreviewDocumentInline(fileName, mimeType ?? '')
}

const selectedStaff = computed(() =>
  staffResults.value.find(item => String(item.id) === selectedStaffId.value) ?? null,
)

async function loadCollaborators() {
  if (props.rows) {
    collaborators.value = props.rows
    const pending = props.rows.filter(row => row.status === 'pending').length
    summary.value = {
      total: props.rows.length,
      pending,
      all_responded: pending === 0,
      can_manage: false,
    }
    loading.value = false

    return
  }

  if (!props.taskId) {
    collaborators.value = []
    summary.value = { total: 0, pending: 0, all_responded: true, can_manage: false }
    loading.value = false

    return
  }

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

watch(() => [props.taskId, props.rows] as const, () => {
  void loadCollaborators()
}, { immediate: true, deep: true })

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
  if (props.readOnly) {
    return
  }

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

async function viewFile(row: WorkflowTaskCollaboratorRow, file: WorkflowTaskCollaboratorRow['files'][number]) {
  openingFileId.value = file.id

  try {
    const { blob, filename } = await workflowApi.fetchCollaborationFile(row.id, file.id)
    presentBlob(blob, file.original_name || filename || file.title, file.mime_type)
  }
  catch {
    toast.error('No se pudo abrir el archivo del colaborador.')
  }
  finally {
    openingFileId.value = null
  }
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
      request_note: requestNote.value.trim() || null,
    })
    toast.success('Colaborador agregado. Se le notificó para que ingrese a colaborar.')
    selectedStaffId.value = ''
    requestNote.value = ''
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
    <Alert v-if="summary.pending > 0 && !readOnly" variant="secondary">
      <Icon name="i-lucide-users" class="size-4" />
      <AlertTitle>Respuestas pendientes</AlertTitle>
      <AlertDescription>
        {{ summary.pending }} colaborador(es) aún no han subido su aporte. No podrá avanzar de etapa hasta que todos respondan.
      </AlertDescription>
    </Alert>

    <Alert v-else-if="summary.total > 0 && summary.pending === 0">
      <Icon name="i-lucide-circle-check" class="size-4" />
      <AlertTitle>Aportes de colaboradores</AlertTitle>
      <AlertDescription>
        {{ readOnly
          ? 'Documentos y notas registrados en etapas anteriores. Puede abrirlos aquí o en el historial.'
          : 'Todos los colaboradores ya registraron su aporte. Puede abrir los documentos y avanzar la etapa.' }}
      </AlertDescription>
    </Alert>

    <Alert v-if="!readOnly">
      <Icon name="i-lucide-bell-ring" class="size-4" />
      <AlertTitle>Notificación al colaborador</AlertTitle>
      <AlertDescription>
        Al agregar un colaborador se le notifica en la bandeja del sistema y, si el correo está habilitado,
        por email. Podrá ingresar a <strong>Colaboración</strong> para adjuntar documentos y registrar su aporte.
      </AlertDescription>
    </Alert>

    <div v-if="!readOnly" class="space-y-3 rounded-lg border bg-muted/20 p-4">
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

        <div class="space-y-2">
          <Label>Qué se solicita (opcional)</Label>
          <Textarea
            v-model="requestNote"
            rows="3"
            placeholder="Indique al colaborador qué documento o concepto debe aportar."
          />
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
              <span v-if="row.task?.stage"> · {{ row.task.stage.name }}</span>
            </p>
            <p v-if="row.request_note" class="mt-2 whitespace-pre-wrap text-sm">
              {{ row.request_note }}
            </p>
          </div>
          <Badge :variant="row.status === 'responded' ? 'secondary' : 'outline'">
            {{ statusLabel(row.status) }}
          </Badge>
        </div>

        <p v-if="row.response_note" class="mt-2 whitespace-pre-wrap text-muted-foreground">
          {{ row.response_note }}
        </p>

        <ul v-if="row.files.length" class="mt-3 divide-y rounded-lg border">
          <li
            v-for="file in row.files"
            :key="file.id"
            class="flex items-start justify-between gap-3 px-3 py-2"
          >
            <div class="min-w-0">
              <p class="font-medium">
                {{ file.title }}
              </p>
              <p class="text-xs text-muted-foreground">
                {{ file.original_name }}
                <span v-if="file.folio_start && file.folio_end"> · folios {{ file.folio_start }}–{{ file.folio_end }}</span>
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              class="shrink-0"
              :disabled="openingFileId === file.id"
              @click="viewFile(row, file)"
            >
              <Icon
                :name="openingFileId === file.id ? 'i-lucide-loader-2' : (fileCanPreview(file.original_name, file.mime_type) ? 'i-lucide-eye' : 'i-lucide-download')"
                class="mr-1 size-4"
                :class="{ 'animate-spin': openingFileId === file.id }"
              />
              {{ fileCanPreview(file.original_name, file.mime_type) ? 'Ver' : 'Descargar' }}
            </Button>
          </li>
        </ul>

        <Button
          v-if="row.status === 'pending' && !readOnly"
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
      {{ readOnly ? 'No hubo colaboradores en este proceso.' : 'Aún no hay colaboradores en este proceso.' }}
    </p>
  </div>

  <DocumentInlinePreviewDialog
    v-model:open="inlinePreviewOpen"
    :title="inlinePreviewTitle"
    :preview-url="inlinePreviewUrl"
    :preview-kind="inlinePreviewKind"
  />
</template>
