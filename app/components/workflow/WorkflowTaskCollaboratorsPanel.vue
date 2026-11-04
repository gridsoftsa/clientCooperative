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
const selectedOrgUnitIds = ref<number[]>([])
const selectedPositionIds = ref<number[]>([])
const selectedStaffIds = ref<number[]>([])
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
    const unitName = position.org_unit?.name
    const label = unitName && selectedOrgUnitIds.value.length > 1
      ? `${position.name} · ${unitName}`
      : position.name

    return { value: position.id, label }
  }),
)

const staffOptions = computed(() =>
  staffResults.value.map(item => ({
    value: item.id,
    label: staffLabel(item),
  })),
)

const selectedStaffItems = computed(() =>
  selectedStaffIds.value
    .map(id => staffResults.value.find(item => item.id === id))
    .filter((item): item is OrgStaffListItem => Boolean(item?.user_id)),
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
  if (selectedOrgUnitIds.value.length === 0) {
    positions.value = []
    selectedPositionIds.value = []
    return
  }

  const lists = await Promise.all(
    selectedOrgUnitIds.value.map(orgUnitId => orgApi.fetchPositions({
      activeOnly: true,
      orgUnitId,
    })),
  )

  const byId = new Map<number, OrgPositionRow>()
  for (const position of lists.flat()) {
    byId.set(position.id, position)
  }

  positions.value = [...byId.values()]
  selectedPositionIds.value = selectedPositionIds.value.filter(id => byId.has(id))
}

async function searchStaff() {
  if (selectedOrgUnitIds.value.length === 0) {
    staffResults.value = []
    selectedStaffIds.value = []
    return
  }

  const rows = await orgApi.fetchStaff({
    activeOnly: true,
    orgUnitIds: selectedOrgUnitIds.value,
    orgPositionIds: selectedPositionIds.value.length ? selectedPositionIds.value : undefined,
  })

  staffResults.value = rows.filter(item => item.user_id != null)
  const allowed = new Set(staffResults.value.map(item => item.id))
  selectedStaffIds.value = selectedStaffIds.value.filter(id => allowed.has(id))
}

watch(() => [props.taskId, props.rows] as const, () => {
  void loadCollaborators()
}, { immediate: true, deep: true })

watch(selectedOrgUnitIds, async () => {
  await loadPositions()
  await searchStaff()
})

watch(selectedPositionIds, async () => {
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
  const staffItems = selectedStaffItems.value

  if (!props.taskId) {
    return
  }

  if (staffItems.length === 0) {
    toast.error('Seleccione uno o más colaboradores con usuario vinculado.')

    return
  }

  saving.value = true

  const invitedUserIds = new Set(
    collaborators.value
      .map(row => row.user?.id)
      .filter((id): id is number => typeof id === 'number'),
  )

  let added = 0
  let skipped = 0
  const errors: string[] = []

  try {
    for (const staff of staffItems) {
      const userId = staff.user_id
      if (!userId) {
        skipped += 1
        continue
      }

      if (invitedUserIds.has(userId)) {
        skipped += 1
        continue
      }

      try {
        await workflowApi.inviteTaskCollaborator(props.taskId, {
          user_id: userId,
          org_unit_id: staff.current_assignment?.org_unit?.id ?? selectedOrgUnitIds.value[0] ?? null,
          org_position_id: staff.current_assignment?.org_position?.id ?? selectedPositionIds.value[0] ?? null,
          request_note: requestNote.value.trim() || null,
          requires_document: requiresDocument.value === true,
        })
        invitedUserIds.add(userId)
        added += 1
      }
      catch (error) {
        errors.push(`${staffLabel(staff)}: ${extractApiErrorMessage(error)}`)
      }
    }

    if (added > 0) {
      toast.success(added === 1
        ? 'Colaborador agregado. Se le notificó para que ingrese a colaborar.'
        : `${added} colaboradores agregados y notificados.`)
      selectedStaffIds.value = []
      requestNote.value = ''
      requiresDocument.value = true
      await loadCollaborators()
      emit('changed')
    }

    if (skipped > 0 && added === 0 && errors.length === 0) {
      toast.error('Esos colaboradores ya están en la tarea.')
    }

    if (errors.length) {
      toast.error(errors[0] ?? 'No se pudieron agregar algunos colaboradores.')
    }
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
        Agregar colaboradores
      </p>

      <div class="grid gap-3">
        <div class="space-y-2">
          <Label for="wf-invite-org-units">Área</Label>
          <ArchivalMultiMultiselect
            id="wf-invite-org-units"
            v-model="selectedOrgUnitIds"
            :options="orgUnitOptions"
            placeholder="Seleccione una o más áreas"
            no-options-text="No hay áreas activas"
            no-results-text="Sin coincidencias"
          />
        </div>

        <div class="space-y-2">
          <Label for="wf-invite-positions">Cargo (opcional)</Label>
          <ArchivalMultiMultiselect
            id="wf-invite-positions"
            v-model="selectedPositionIds"
            :disabled="selectedOrgUnitIds.length === 0"
            :options="positionOptions"
            placeholder="Todos los cargos de las áreas elegidas"
            no-options-text="Elija un área para ver cargos"
            no-results-text="Sin coincidencias"
          />
        </div>

        <div class="space-y-2">
          <Label for="wf-invite-staff">Colaborador</Label>
          <ArchivalMultiMultiselect
            id="wf-invite-staff"
            v-model="selectedStaffIds"
            :disabled="selectedOrgUnitIds.length === 0 || staffResults.length === 0"
            :options="staffOptions"
            placeholder="Seleccione uno o más colaboradores"
            no-options-text="Elija un área para listar personas"
            no-results-text="Sin coincidencias"
          />
        </div>

        <div class="space-y-2">
          <Label>Qué se solicita (opcional)</Label>
          <Textarea
            v-model="requestNote"
            rows="3"
            placeholder="Indique a los colaboradores qué documento o concepto deben aportar."
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
                ? 'Cada colaborador debe adjuntar un archivo.'
                : 'Pueden responder solo con una nota.' }}
            </span>
          </Label>
        </div>

        <Button class="w-full" :disabled="saving || selectedStaffItems.length === 0" @click="inviteCollaborator">
          {{ selectedStaffItems.length > 1 ? `Agregar y notificar (${selectedStaffItems.length})` : 'Agregar y notificar' }}
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
            <p v-if="row.reassignment_requested_at" class="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              Pidió cambio de encargado{{ row.reassignment_request_note ? `: ${row.reassignment_request_note}` : '.' }}
              Reasigne o quite este colaborador y elija a la persona correcta.
            </p>
            <div
              v-if="row.status === 'pending' && !readOnly"
              class="mt-3 flex items-start gap-3 rounded-md border px-3 py-2"
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
            <p v-else class="mt-2 text-xs text-muted-foreground">
              {{ collaboratorRequiresDocument(row) ? 'Requiere documento' : 'Documento opcional' }}
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

        <p v-if="row.status === 'responded' && !row.files.length" class="mt-2 text-xs text-muted-foreground">
          No se adjuntó documento.
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
