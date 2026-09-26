<script setup lang="ts">
import { toast } from 'vue-sonner'
import {
  appendDocumentFoliosToFormData,
  createDocumentAttachmentRow,
  type DocumentAttachmentRow,
  validateDocumentAttachmentFolios,
} from '~/utils/document-attachment-folio'
import { VENTANILLA_FILING_UPLOAD_CONSTRAINTS } from '~/utils/document-upload-constraints'
import { extractApiErrorMessage } from '~/utils/workflow-task-ui'
import { canPreviewDocumentInline } from '~/utils/document-preview'
import DocumentInlinePreviewDialog from '~/components/radicacion/DocumentInlinePreviewDialog.vue'

definePageMeta({
  layout: 'default',
})

const route = useRoute()
const router = useRouter()
const workflowApi = useWorkflowApi()
const { user } = useAuth()

const collaborationId = computed(() => Number(route.params.id))

const loading = ref(true)
const saving = ref(false)
const reassigning = ref(false)
const requestingChange = ref(false)
const submitAttempted = ref(false)
const responseNote = ref('')
const reassignUserId = ref('')
const reassignNote = ref('')
const changeRequestNote = ref('')
const notResponsibleMode = ref<'peer' | 'ask'>('peer')
const assignableUsers = ref<Array<{ id: number, name: string, email?: string | null }>>([])
const areaName = ref<string | null>(null)
const attachment = ref<DocumentAttachmentRow>(createDocumentAttachmentRow())
const collaboration = ref<Awaited<ReturnType<typeof workflowApi.fetchCollaboration>> | null>(null)
const activeTab = ref('responder')
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

const isResponded = computed(() => collaboration.value?.status === 'responded')
const filingFileCount = computed(() => collaboration.value?.filing?.files.length ?? 0)
const canAct = computed(() =>
  collaboration.value?.status === 'pending'
  && collaboration.value.user?.id === user.value?.id,
)
const changeAlreadyRequested = computed(() => Boolean(collaboration.value?.reassignment_requested_at))
const inviterName = computed(() => collaboration.value?.invited_by?.name ?? 'quien solicitó la colaboración')

async function load() {
  loading.value = true

  try {
    collaboration.value = await workflowApi.fetchCollaboration(collaborationId.value)
    activeTab.value = collaboration.value.status === 'responded' ? 'aporte' : 'responder'
    if (collaboration.value.status === 'pending' && collaboration.value.user?.id === user.value?.id) {
      try {
        const candidates = await workflowApi.fetchCollaborationReassignCandidates(collaborationId.value)
        assignableUsers.value = candidates.users
        areaName.value = candidates.org_unit?.name ?? null
        notResponsibleMode.value = candidates.users.length > 0 ? 'peer' : 'ask'
      }
      catch {
        assignableUsers.value = []
        areaName.value = collaboration.value.org_unit?.name ?? null
        notResponsibleMode.value = 'ask'
      }
    }
  }
  catch (error) {
    toast.error(extractApiErrorMessage(error))
    collaboration.value = null
  }
  finally {
    loading.value = false
  }
}

watch(collaborationId, () => {
  void load()
}, { immediate: true })

function buildFormData(): FormData | null {
  submitAttempted.value = true

  if (!attachment.value.file) {
    toast.error('Debe adjuntar al menos un archivo.')

    return null
  }

  const folioError = validateDocumentAttachmentFolios(attachment.value.folioStart, attachment.value.folioEnd)

  if (folioError) {
    toast.error(folioError)

    return null
  }

  const fd = new FormData()

  if (responseNote.value.trim()) {
    fd.append('response_note', responseNote.value.trim())
  }

  fd.append('files[0][file]', attachment.value.file)
  fd.append('files[0][title]', attachment.value.title.trim() || attachment.value.file.name)
  appendDocumentFoliosToFormData(fd, 0, attachment.value.folioStart, attachment.value.folioEnd)

  return fd
}

async function submitReassign() {
  if (!reassignUserId.value) {
    toast.error('Seleccione un compañero del área.')

    return
  }

  if (reassignNote.value.trim().length < 10) {
    toast.error('Explique el motivo con al menos 10 caracteres.')

    return
  }

  reassigning.value = true

  try {
    await workflowApi.reassignCollaboration(collaborationId.value, {
      user_id: Number(reassignUserId.value),
      note: reassignNote.value.trim(),
    })
    toast.success('Colaboración reasignada. El nuevo encargado fue notificado.')
    await router.push('/workflow/colaboracion')
  }
  catch (error) {
    toast.error(extractApiErrorMessage(error))
  }
  finally {
    reassigning.value = false
  }
}

async function submitChangeRequest() {
  const note = changeRequestNote.value.trim()

  if (note.length < 10) {
    toast.error('Explique el motivo con al menos 10 caracteres.')

    return
  }

  requestingChange.value = true

  try {
    collaboration.value = await workflowApi.requestCollaborationChange(collaborationId.value, note)
    toast.success(`Se informó a ${inviterName.value} para que asigne al encargado correcto.`)
  }
  catch (error) {
    toast.error(extractApiErrorMessage(error))
  }
  finally {
    requestingChange.value = false
  }
}

async function submitResponse() {
  const fd = buildFormData()

  if (!fd) {
    return
  }

  saving.value = true

  try {
    collaboration.value = await workflowApi.respondCollaboration(collaborationId.value, fd)
    activeTab.value = 'aporte'
    toast.success('Respuesta registrada correctamente.')
  }
  catch (error) {
    toast.error(extractApiErrorMessage(error))
  }
  finally {
    saving.value = false
  }
}

async function viewContributionFile(file: { id: number, mime_type?: string | null, original_name?: string | null }) {
  openingFileId.value = file.id

  try {
    const { blob, filename } = await workflowApi.fetchCollaborationFile(collaborationId.value, file.id)
    presentBlob(blob, file.original_name || filename || 'documento', file.mime_type)
  }
  catch (error) {
    toast.error(extractApiErrorMessage(error))
  }
  finally {
    openingFileId.value = null
  }
}
</script>

<template>
  <div class="mx-auto w-full max-w-4xl space-y-5 px-4 py-6 md:px-6">
    <div class="flex items-start gap-3">
      <Button variant="ghost" size="icon" class="shrink-0" @click="router.push('/workflow/colaboracion')">
        <Icon name="i-lucide-arrow-left" class="size-4" />
      </Button>
      <div class="min-w-0 space-y-1">
        <h1 class="text-2xl font-semibold tracking-tight">
          Colaboración en tarea
        </h1>
        <p class="text-sm text-muted-foreground">
          <span class="font-medium text-foreground">
            {{ collaboration?.filing?.filing_number ?? 'Radicado' }}
          </span>
          <span v-if="collaboration?.filing?.subject"> · {{ collaboration.filing.subject }}</span>
          <span v-if="collaboration?.task?.stage"> · {{ collaboration.task.stage.name }}</span>
        </p>
      </div>
    </div>

    <div
      v-if="collaboration?.filing?.requires_response && collaboration.filing.sla_business_days"
      class="sticky top-0 z-10 rounded-lg border bg-background/95 p-4 shadow-sm backdrop-blur"
    >
      <p class="mb-2 text-sm font-medium">
        SLA del radicado
      </p>
      <VentanillaSlaProgressBar
        :sla-business-days="collaboration.filing.sla_business_days"
        :elapsed-business-days="collaboration.filing.sla_elapsed_business_days"
        :deadline="collaboration.filing.response_deadline_at"
      />
    </div>

    <Card v-if="loading">
      <CardContent class="py-10 text-sm text-muted-foreground">
        Cargando solicitud…
      </CardContent>
    </Card>

    <Tabs
      v-else-if="collaboration"
      v-model="activeTab"
      :default-value="isResponded ? 'aporte' : 'responder'"
      class="w-full"
    >
      <TabsList class="flex h-auto w-full shrink-0 flex-wrap gap-1 p-1">
        <TabsTrigger v-if="!isResponded" value="responder" class="flex-1 sm:flex-none">
          Responder
        </TabsTrigger>
        <TabsTrigger v-if="canAct" value="cambiar-encargado" class="flex-1 sm:flex-none">
          Cambiar encargado
        </TabsTrigger>
        <TabsTrigger v-else value="aporte" class="flex-1 sm:flex-none">
          Aporte
        </TabsTrigger>
        <TabsTrigger value="radicado" class="flex-1 sm:flex-none">
          Radicado
        </TabsTrigger>
        <TabsTrigger value="documentos" class="flex-1 sm:flex-none">
          Documentos
          <Badge v-if="filingFileCount > 0" variant="secondary" class="ml-2">
            {{ filingFileCount }}
          </Badge>
        </TabsTrigger>
      </TabsList>

      <TabsContent v-if="!isResponded" value="responder" class="mt-4 space-y-4">
        <Alert>
          <Icon name="i-lucide-message-square" class="size-4" />
          <AlertTitle>Qué se solicita</AlertTitle>
          <AlertDescription class="whitespace-pre-wrap">
            {{ collaboration.request_note || 'No dejaron una instrucción específica. Revise el radicado y los documentos en las otras pestañas.' }}
          </AlertDescription>
        </Alert>
        <p class="text-sm text-muted-foreground">
          Solicitado por {{ collaboration.invited_by?.name ?? '—' }}
          <span v-if="collaboration.org_unit"> · {{ collaboration.org_unit.name }}</span>
          · Pendiente de su aporte
        </p>

        <div class="space-y-2">
          <Label>Nota (opcional)</Label>
          <Textarea v-model="responseNote" rows="3" placeholder="Comentario sobre su aporte" />
        </div>

        <DocumentsDocumentAttachmentUploadCard
          v-model:title="attachment.title"
          v-model:folio-start="attachment.folioStart"
          v-model:folio-end="attachment.folioEnd"
          v-model:file="attachment.file"
          title="Archivo de respuesta"
          label="Documento"
          :submit-attempted="submitAttempted"
          :upload-constraints="VENTANILLA_FILING_UPLOAD_CONSTRAINTS"
        />

        <Button class="w-full sm:w-auto" :disabled="saving" @click="submitResponse">
          {{ saving ? 'Enviando…' : 'Enviar respuesta' }}
        </Button>
      </TabsContent>

      <TabsContent v-if="canAct" value="cambiar-encargado" class="mt-4 space-y-4">
        <Alert>
          <Icon name="i-lucide-user-round-cog" class="size-4" />
          <AlertTitle>Esta colaboración no le corresponde</AlertTitle>
          <AlertDescription>
            Pásela a un compañero de{{ areaName ? ` ${areaName}` : ' su área' }}
            o informe a {{ inviterName }} para que elija a otra persona.
          </AlertDescription>
        </Alert>

        <Alert v-if="changeAlreadyRequested" class="border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          <Icon name="i-lucide-bell" class="size-4" />
          <AlertTitle>Cambio solicitado</AlertTitle>
          <AlertDescription>
            Ya se informó a {{ inviterName }} para que asigne al encargado correcto.
            <span v-if="collaboration.reassignment_request_note"> Motivo: {{ collaboration.reassignment_request_note }}</span>
          </AlertDescription>
        </Alert>

        <div class="grid grid-cols-2 gap-2">
          <Button
            type="button"
            size="sm"
            :variant="notResponsibleMode === 'peer' ? 'default' : 'outline'"
            :disabled="assignableUsers.length === 0"
            @click="notResponsibleMode = 'peer'"
          >
            Compañero del área
          </Button>
          <Button
            type="button"
            size="sm"
            :variant="notResponsibleMode === 'ask' ? 'default' : 'outline'"
            :disabled="changeAlreadyRequested"
            @click="notResponsibleMode = 'ask'"
          >
            Informar al solicitante
          </Button>
        </div>

        <div v-if="notResponsibleMode === 'peer'" class="space-y-3">
          <p v-if="assignableUsers.length === 0" class="text-sm text-muted-foreground">
            No hay otros usuarios del área para reasignar. Informe a {{ inviterName }}.
          </p>
          <template v-else>
            <div class="space-y-2">
              <Label>Reasignar a</Label>
              <Select v-model="reassignUserId">
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione compañero del área" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="candidate in assignableUsers"
                    :key="candidate.id"
                    :value="String(candidate.id)"
                  >
                    {{ candidate.name }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="space-y-2">
              <Label>Motivo</Label>
              <Textarea
                v-model="reassignNote"
                rows="2"
                placeholder="Ej. Esta solicitud la atiende el analista de contratos."
              />
            </div>
            <Button
              type="button"
              :disabled="reassigning || !reassignUserId || reassignNote.trim().length < 10"
              @click="submitReassign"
            >
              {{ reassigning ? 'Reasignando…' : 'Reasignar' }}
            </Button>
          </template>
        </div>

        <div v-else class="space-y-3">
          <div class="space-y-2">
            <Label>Motivo</Label>
            <Textarea
              v-model="changeRequestNote"
              rows="3"
              placeholder="Ej. Esta solicitud corresponde a Jurídica, no a esta área."
            />
          </div>
          <Button
            type="button"
            :disabled="requestingChange || changeAlreadyRequested || changeRequestNote.trim().length < 10"
            @click="submitChangeRequest"
          >
            {{ requestingChange ? 'Enviando…' : `Informar a ${inviterName}` }}
          </Button>
        </div>
      </TabsContent>

      <TabsContent v-if="isResponded" value="aporte" class="mt-4 space-y-3">
        <p v-if="collaboration.response_note" class="whitespace-pre-wrap text-sm">
          {{ collaboration.response_note }}
        </p>
        <ul v-if="collaboration.files.length" class="divide-y rounded-lg border">
          <li
            v-for="file in collaboration.files"
            :key="file.id"
            class="flex items-start justify-between gap-3 px-4 py-3 text-sm"
          >
            <div class="min-w-0">
              <p class="font-medium">
                {{ file.title }}
              </p>
              <p class="text-xs text-muted-foreground">
                {{ file.original_name }} · folios {{ file.folio_start }}–{{ file.folio_end }}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              class="shrink-0"
              :disabled="openingFileId === file.id"
              @click="viewContributionFile(file)"
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
      </TabsContent>

      <TabsContent value="radicado" class="mt-4">
        <WorkflowTaskFilingSummaryPanel
          v-if="collaboration.filing"
          :filing="collaboration.filing"
          :show-open-filing-button="false"
          :show-files="false"
        />
        <p v-else class="text-sm text-muted-foreground">
          No hay datos del radicado para esta colaboración.
        </p>
      </TabsContent>

      <TabsContent value="documentos" class="mt-4">
        <WorkflowTaskFilingSummaryPanel
          v-if="collaboration.filing"
          :filing="collaboration.filing"
          :show-open-filing-button="false"
          :show-details="false"
        />
        <p v-else class="text-sm text-muted-foreground">
          No hay documentos asociados.
        </p>
      </TabsContent>
    </Tabs>

    <DocumentInlinePreviewDialog
      v-model:open="inlinePreviewOpen"
      :title="inlinePreviewTitle"
      :preview-url="inlinePreviewUrl"
      :preview-kind="inlinePreviewKind"
    />
  </div>
</template>
