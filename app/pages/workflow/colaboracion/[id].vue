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

const collaborationId = computed(() => Number(route.params.id))

const loading = ref(true)
const saving = ref(false)
const submitAttempted = ref(false)
const responseNote = ref('')
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

async function load() {
  loading.value = true

  try {
    collaboration.value = await workflowApi.fetchCollaboration(collaborationId.value)
    activeTab.value = collaboration.value.status === 'responded' ? 'aporte' : 'responder'
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
          Solicitado por {{ collaboration.invited_by?.name ?? '—' }} · Pendiente de su aporte
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

      <TabsContent v-else value="aporte" class="mt-4 space-y-3">
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
