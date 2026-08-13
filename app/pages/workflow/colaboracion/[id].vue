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

definePageMeta({
  layout: 'default',
  middleware: 'auth',
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

const isResponded = computed(() => collaboration.value?.status === 'responded')

async function load() {
  loading.value = true

  try {
    collaboration.value = await workflowApi.fetchCollaboration(collaborationId.value)
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
    toast.success('Respuesta registrada correctamente.')
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
  <div class="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 md:px-6">
    <div class="flex items-start gap-3">
      <Button variant="ghost" size="icon" class="shrink-0" @click="router.push('/notificaciones')">
        <Icon name="i-lucide-arrow-left" class="size-4" />
      </Button>
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">
          Colaboración en tarea
        </h1>
        <p class="text-sm text-muted-foreground">
          Adjunte su aporte documental solicitado para esta etapa de gestión.
        </p>
      </div>
    </div>

    <Card v-if="loading">
      <CardContent class="py-10 text-sm text-muted-foreground">
        Cargando solicitud…
      </CardContent>
    </Card>

    <template v-else-if="collaboration">
      <Card>
        <CardHeader>
          <CardTitle class="text-base">
            {{ collaboration.filing?.filing_number ?? 'Radicado' }}
          </CardTitle>
          <CardDescription>
            {{ collaboration.filing?.subject ?? '—' }}
            <span v-if="collaboration.task?.stage"> · {{ collaboration.task.stage.name }}</span>
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-2 text-sm">
          <p>
            <span class="text-muted-foreground">Estado:</span>
            {{ isResponded ? 'Respondido' : 'Pendiente de su aporte' }}
          </p>
          <p v-if="collaboration.invited_by">
            <span class="text-muted-foreground">Solicitado por:</span>
            {{ collaboration.invited_by.name }}
          </p>
        </CardContent>
      </Card>

      <Card v-if="!isResponded">
        <CardHeader>
          <CardTitle class="text-base">
            Su respuesta
          </CardTitle>
          <CardDescription>
            Debe adjuntar al menos un archivo para completar la colaboración.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
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

          <Button class="w-full" :disabled="saving" @click="submitResponse">
            {{ saving ? 'Enviando…' : 'Enviar respuesta' }}
          </Button>
        </CardContent>
      </Card>

      <Card v-else>
        <CardHeader>
          <CardTitle class="text-base">
            Aporte registrado
          </CardTitle>
        </CardHeader>
        <CardContent class="space-y-3 text-sm">
          <p v-if="collaboration.response_note" class="text-muted-foreground">
            {{ collaboration.response_note }}
          </p>
          <ul v-if="collaboration.files.length" class="divide-y rounded-lg border">
            <li v-for="file in collaboration.files" :key="file.id" class="px-4 py-3">
              <p class="font-medium">
                {{ file.title }}
              </p>
              <p class="text-xs text-muted-foreground">
                {{ file.original_name }} · folios {{ file.folio_start }}–{{ file.folio_end }}
              </p>
            </li>
          </ul>
        </CardContent>
      </Card>
    </template>
  </div>
</template>
