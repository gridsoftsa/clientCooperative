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
const selectedOrgUnitId = ref<number | null>(null)
const selectedPositionId = ref<number | null>(null)
const selectedStaffId = ref<number | null>(null)
const requestNote = ref('')
const requiresDocument = ref(true)
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

function staffLabel(item: OrgStaffListItem): string {
  const name = item.full_name ?? `${item.first_name} ${item.first_last_name}`.trim()
  const position = item.current_assignment?.org_position?.name
  const unit = item.current_assignment?.org_unit?.name

  return [name, position, unit].filter(Boolean).join(' · ')
}

const orgUnitOptions = computed(() =>
  orgUnits.value.map(unit => ({
    value: unit.id,
    label: `${unit.code} — ${unit.name}`,
  })),
)

const positionOptions = computed(() =>
  positions.value.map((position) => {
    const label = position.name

    return { value: position.id, label }
  }),
)

const staffOptions = computed(() =>
  staffResults.value.map(item => ({
    value: item.id,
    label: staffLabel(item),
  })),
)

const selectedStaffItem = computed(() => {
  if (selectedStaffId.value == null) {
    return null
  }

  const item = staffResults.value.find(staff => staff.id === selectedStaffId.value)

  return item?.user_id ? item : null
})

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
    const rows = result.data.filter(row => row.workflow_task_id === props.taskId)
    collaborators.value = rows
    const pending = rows.filter(row => row.status === 'pending').length
    summary.value = {
      total: rows.length,
      pending,
      all_responded: pending === 0,
      can_manage: result.meta.can_manage,
    }
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
  if (selectedOrgUnitId.value == null) {
    positions.value = []
    selectedPositionId.value = null
    return
  }

  positions.value = await orgApi.fetchPositions({
    activeOnly: true,
    orgUnitId: selectedOrgUnitId.value,
  })

  if (selectedPositionId.value != null && !positions.value.some(position => position.id === selectedPositionId.value)) {
    selectedPositionId.value = null
  }
}

async function searchStaff() {
  if (selectedOrgUnitId.value == null) {
    staffResults.value = []
    selectedStaffId.value = null
    return
  }

  const rows = await orgApi.fetchStaff({
    activeOnly: true,
    orgUnitIds: [selectedOrgUnitId.value],
    orgPositionIds: selectedPositionId.value != null ? [selectedPositionId.value] : undefined,
  })

  staffResults.value = rows.filter(item => item.user_id != null)

  if (selectedStaffId.value != null && !staffResults.value.some(item => item.id === selectedStaffId.value)) {
    selectedStaffId.value = null
  }
}

watch(() => [props.taskId, props.rows] as const, () => {
  void loadCollaborators()
}, { immediate: true, deep: true })

watch(selectedOrgUnitId, async () => {
  await loadPositions()
  await searchStaff()
})

watch(selectedPositionId, async () => {
  await searchStaff()
})

onMounted(async () => {
  if (props.readOnly) {
    return
  }

  await loadOrgUnits()
})

function statusLabel(status: WorkflowTaskCollaboratorRow['status']): string {
  return status === 'responded' ? 'Respondió' : 'Pendiente'
}

function collaboratorDisplayName(row: WorkflowTaskCollaboratorRow): string {
  return row.user?.name?.trim() || 'Usuario'
}

function collaboratorInitials(row: WorkflowTaskCollaboratorRow): string {
  const name = collaboratorDisplayName(row)
  const parts = name.split(/[\s@._-]+/).filter(Boolean)
  const letters = parts.slice(0, 2).map(part => part[0]?.toUpperCase() ?? '').join('')

  return letters || '?'
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
  const staff = selectedStaffItem.value

  if (!props.taskId) {
    return
  }

  if (!staff?.user_id) {
    toast.error('Seleccione un colaborador con usuario vinculado.')

    return
  }

  const alreadyInvited = collaborators.value.some(row => row.user?.id === staff.user_id)
  if (alreadyInvited) {
    toast.error('Ese colaborador ya está en la tarea.')

    return
  }

  saving.value = true

  try {
    await workflowApi.inviteTaskCollaborator(props.taskId, {
      user_id: staff.user_id,
      org_unit_id: staff.current_assignment?.org_unit?.id ?? selectedOrgUnitId.value,
      org_position_id: staff.current_assignment?.org_position?.id ?? selectedPositionId.value,
      request_note: requestNote.value.trim() || null,
      requires_document: requiresDocument.value === true,
    })
    toast.success('Colaborador agregado. Se le notificó para que ingrese a colaborar.')
    selectedStaffId.value = null
    requestNote.value = ''
    requiresDocument.value = true
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

function collaboratorRequiresDocument(row: WorkflowTaskCollaboratorRow): boolean {
  return row.requires_document !== false
}

async function setCollaboratorRequiresDocument(row: WorkflowTaskCollaboratorRow, value: boolean | 'indeterminate') {
  const next = value === true
  const previous = collaboratorRequiresDocument(row)

  if (next === previous || row.status !== 'pending' || !props.taskId) {
    return
  }

  row.requires_document = next
  saving.value = true

  try {
    const updated = await workflowApi.updateTaskCollaborator(props.taskId, row.id, {
      requires_document: next,
    })
    const index = collaborators.value.findIndex(item => item.id === row.id)
    if (index >= 0) {
      collaborators.value[index] = updated
    }
  }
  catch (error) {
    row.requires_document = previous
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
        por email. Podrá ingresar a <strong>Colaboración</strong> para registrar su aporte. Indique si debe adjuntar documento.
      </AlertDescription>
    </Alert>

    <div v-if="!readOnly" class="space-y-3 rounded-lg border bg-muted/20 p-4">
      <p class="text-sm font-medium">
        Agregar colaborador
      </p>

      <div class="grid gap-3">
        <div class="space-y-2">
          <Label for="wf-invite-org-unit">Área</Label>
          <ArchivalSingleMultiselect
            id="wf-invite-org-unit"
            v-model="selectedOrgUnitId"
            coerce-number
            :options="orgUnitOptions"
            placeholder="Seleccione un área"
            no-options-text="No hay áreas activas"
            no-results-text="Sin coincidencias"
          />
        </div>

        <div class="space-y-2">
          <Label for="wf-invite-position">Cargo (opcional)</Label>
          <ArchivalSingleMultiselect
            id="wf-invite-position"
            v-model="selectedPositionId"
            coerce-number
            :disabled="selectedOrgUnitId == null"
            :options="positionOptions"
            placeholder="Todos los cargos del área"
            no-options-text="Elija un área para ver cargos"
            no-results-text="Sin coincidencias"
          />
        </div>

        <div class="space-y-2">
          <Label for="wf-invite-staff">Colaborador</Label>
          <ArchivalSingleMultiselect
            id="wf-invite-staff"
            v-model="selectedStaffId"
            coerce-number
            :disabled="selectedOrgUnitId == null || staffResults.length === 0"
            :options="staffOptions"
            placeholder="Seleccione un colaborador"
            no-options-text="Elija un área para listar personas"
            no-results-text="Sin coincidencias"
          />
        </div>

        <div class="space-y-2">
          <Label>Qué se solicita (opcional)</Label>
          <Textarea
            v-model="requestNote"
            rows="3"
            placeholder="Indique al colaborador qué documento o concepto debe aportar."
          />
        </div>

        <div
          class="flex items-start gap-3 rounded-md border px-3 py-2"
          :class="requiresDocument ? 'border-primary/40 bg-primary/5' : ''"
        >
          <span class="mt-0.5 inline-flex shrink-0">
            <Checkbox
              id="wf-invite-requires-document"
              bare
              :disabled="saving"
              :model-value="requiresDocument"
              @update:model-value="requiresDocument = $event === true"
            />
          </span>
          <Label
            for="wf-invite-requires-document"
            class="min-w-0 flex-1 cursor-pointer font-normal"
            @mousedown.prevent
          >
            <span class="block text-sm font-medium">Requiere documento</span>
            <span class="block text-xs font-normal text-muted-foreground">
              {{ requiresDocument
                ? 'El colaborador debe adjuntar un archivo.'
                : 'Puede responder solo con una nota.' }}
            </span>
          </Label>
        </div>

        <Button class="w-full" :disabled="saving || !selectedStaffItem" @click="inviteCollaborator">
          Agregar y notificar
        </Button>
      </div>
    </div>

    <div v-if="loading" class="text-sm text-muted-foreground">
      Cargando colaboradores…
    </div>

    <div v-else-if="collaborators.length" class="space-y-3">
      <article
        v-for="row in collaborators"
        :key="row.id"
        class="overflow-hidden rounded-xl border bg-card text-sm shadow-sm"
      >
        <div class="flex items-start gap-3 border-b bg-muted/30 px-4 py-3">
          <div
            class="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary"
            aria-hidden="true"
          >
            {{ collaboratorInitials(row) }}
          </div>
          <div class="min-w-0 flex-1">
            <p class="truncate font-medium leading-5">
              {{ collaboratorDisplayName(row) }}
            </p>
            <p v-if="row.org_unit || row.org_position" class="mt-0.5 truncate text-xs text-muted-foreground">
              <span v-if="row.org_unit">{{ row.org_unit.name }}</span>
              <span v-if="row.org_position"> · {{ row.org_position.name }}</span>
            </p>
            <p class="mt-1 text-xs text-muted-foreground">
              Invitado por {{ row.invited_by?.name ?? '—' }}
              <span v-if="row.task?.stage"> · {{ row.task.stage.name }}</span>
            </p>
          </div>
          <Badge
            class="shrink-0"
            :variant="row.status === 'responded' ? 'default' : 'outline'"
          >
            {{ statusLabel(row.status) }}
          </Badge>
        </div>

        <div class="space-y-3 p-4">
          <p
            v-if="row.reassignment_requested_at"
            class="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
          >
            Pidió cambio de encargado{{ row.reassignment_request_note ? `: ${row.reassignment_request_note}` : '.' }}
            Reasigne o quite este colaborador y elija a la persona correcta.
          </p>

          <div
            v-if="row.status === 'pending' && !readOnly"
            class="flex items-start gap-3 rounded-md border px-3 py-2"
            :class="collaboratorRequiresDocument(row) ? 'border-primary/40 bg-primary/5' : ''"
          >
            <span class="mt-0.5 inline-flex shrink-0">
              <Checkbox
                :id="`wf-collab-requires-document-${row.id}`"
                bare
                :disabled="saving"
                :model-value="collaboratorRequiresDocument(row)"
                @update:model-value="setCollaboratorRequiresDocument(row, $event === true)"
              />
            </span>
            <Label
              :for="`wf-collab-requires-document-${row.id}`"
              class="min-w-0 flex-1 cursor-pointer font-normal"
              @mousedown.prevent
            >
              <span class="block text-sm font-medium">Requiere documento</span>
              <span class="block text-xs font-normal text-muted-foreground">
                {{ collaboratorRequiresDocument(row)
                  ? 'Debe adjuntar un archivo al responder.'
                  : 'Puede responder solo con una nota.' }}
              </span>
            </Label>
          </div>

          <section v-if="row.request_note" class="space-y-1.5">
            <p class="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Solicitud
            </p>
            <div class="rounded-lg border bg-muted/25 px-3 py-2.5">
              <p class="whitespace-pre-wrap leading-relaxed">
                {{ row.request_note }}
              </p>
            </div>
          </section>

          <section v-if="row.status === 'responded'" class="space-y-1.5">
            <p class="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Respuesta
            </p>
            <div
              class="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5"
            >
              <p
                v-if="row.response_note"
                class="whitespace-pre-wrap leading-relaxed text-foreground"
              >
                {{ row.response_note }}
              </p>
              <p v-else class="text-sm italic text-muted-foreground">
                Respondió sin nota.
              </p>
            </div>
          </section>

          <div
            v-if="row.status === 'responded' && !row.files.length"
            class="flex items-center gap-2 rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground"
          >
            <Icon name="i-lucide-file-x" class="size-3.5 shrink-0" />
            <span>{{ collaboratorRequiresDocument(row) ? 'No se adjuntó el documento solicitado.' : 'Documento opcional: no se adjuntó archivo.' }}</span>
          </div>
          <p
            v-else-if="row.status !== 'responded' && readOnly"
            class="text-xs text-muted-foreground"
          >
            {{ collaboratorRequiresDocument(row) ? 'Requiere documento' : 'Documento opcional' }}
          </p>

          <ul v-if="row.files.length" class="divide-y overflow-hidden rounded-lg border">
            <li
              v-for="file in row.files"
              :key="file.id"
              class="flex items-start justify-between gap-3 bg-background px-3 py-2"
            >
              <div class="flex min-w-0 items-start gap-2">
                <Icon name="i-lucide-paperclip" class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div class="min-w-0">
                  <p class="font-medium">
                    {{ file.title }}
                  </p>
                  <p class="text-xs text-muted-foreground">
                    {{ file.original_name }}
                    <span v-if="file.folio_start && file.folio_end"> · folios {{ file.folio_start }}–{{ file.folio_end }}</span>
                  </p>
                </div>
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
            class="text-destructive hover:text-destructive"
            :disabled="saving"
            @click="removeCollaborator(row)"
          >
            Quitar
          </Button>
        </div>
      </article>
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
