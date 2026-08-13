<script setup lang="ts">
import { onDigitsOnlyInput, filterDigitsOnly } from '~/utils/digits-only-input'
import { isDigitsOnlyIdentifier } from '~/utils/ventanilla-party-validation'
import {
  appendDocumentFoliosToFormData,
  createDocumentAttachmentRow,
  type DocumentAttachmentRow,
  validateDocumentAttachmentFolios,
} from '~/utils/document-attachment-folio'
import {
  VENTANILLA_PUBLIC_INTAKE_UPLOAD_CONSTRAINTS,
  validateDocumentUploadFile,
} from '~/utils/document-upload-constraints'

definePageMeta({
  layout: false,
})

const ventanillaApi = useVentanillaApi()

const functionalTypes = ref<Array<{ key: string; label: string }>>([])
const functionalTypeKey = ref('')
const senderName = ref('')
const senderEmail = ref('')
const senderIdentifier = ref('')
const subject = ref('')
const body = ref('')
const fileRows = ref<DocumentAttachmentRow[]>([createDocumentAttachmentRow('Documento principal')])
const intakeUploadConstraints = VENTANILLA_PUBLIC_INTAKE_UPLOAD_CONSTRAINTS
const submitAttempted = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const receivedId = ref<number | null>(null)

onMounted(async () => {
  try {
    const catalog = await ventanillaApi.fetchPublicCatalog()
    functionalTypes.value = catalog.functional_types ?? []
  } catch {
    functionalTypes.value = []
  }
})

function addFileRow() {
  fileRows.value.push(createDocumentAttachmentRow())
}

function removeFileRow(index: number) {
  if (fileRows.value.length <= 1) {
    return
  }
  fileRows.value.splice(index, 1)
}

async function submit() {
  errorMessage.value = ''
  receivedId.value = null
  submitAttempted.value = true

  if (!senderName.value.trim() || !senderEmail.value.trim() || !subject.value.trim()) {
    errorMessage.value = 'Nombre, correo y asunto son obligatorios.'
    return
  }
  if (!senderIdentifier.value.trim()) {
    errorMessage.value = 'La identificación es obligatoria.'
    return
  }
  if (!isDigitsOnlyIdentifier(filterDigitsOnly(senderIdentifier.value))) {
    errorMessage.value = 'La identificación debe contener solo números.'
    return
  }

  const withFiles = fileRows.value.filter(row => row.file)
  if (withFiles.length === 0) {
    errorMessage.value = 'Adjunte al menos un documento.'
    return
  }

  for (const [index, row] of withFiles.entries()) {
    if (!row.title.trim()) {
      errorMessage.value = `Indique el título del documento ${index + 1}.`
      return
    }

    const folioError = validateDocumentAttachmentFolios(row.folioStart, row.folioEnd)
    if (folioError) {
      errorMessage.value = `${folioError} (documento ${index + 1})`
      return
    }

    if (row.file) {
      const fileError = validateDocumentUploadFile(row.file, intakeUploadConstraints)
      if (fileError) {
        errorMessage.value = `${fileError} (documento ${index + 1})`
        return
      }
    }
  }

  submitAttempted.value = false

  const fd = new FormData()
  fd.append('sender_name', senderName.value.trim())
  fd.append('sender_email', senderEmail.value.trim())
  fd.append('sender_identifier', filterDigitsOnly(senderIdentifier.value.trim()))
  fd.append('subject', subject.value.trim())
  if (body.value.trim()) {
    fd.append('body', body.value.trim())
  }
  if (functionalTypeKey.value) {
    fd.append('functional_type_key', functionalTypeKey.value)
  }

  withFiles.forEach((row, index) => {
    if (!row.file) {
      return
    }
    fd.append(`files[${index}][file]`, row.file)
    fd.append(`files[${index}][title]`, row.title.trim() || row.file.name)
    appendDocumentFoliosToFormData(fd, index, row.folioStart, row.folioEnd)
  })

  saving.value = true
  try {
    const created = await ventanillaApi.createPublicIntake(fd)
    receivedId.value = created.id
    senderName.value = ''
    senderEmail.value = ''
    senderIdentifier.value = ''
    subject.value = ''
    body.value = ''
    functionalTypeKey.value = ''
    fileRows.value = [createDocumentAttachmentRow('Documento principal')]
  } catch (e: unknown) {
    const err = e as { data?: { message?: string; errors?: Record<string, string[]> } }
    const first = err.data?.errors ? Object.values(err.data.errors)[0]?.[0] : null
    errorMessage.value = first ?? err.data?.message ?? 'No se pudo enviar la solicitud.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-muted/30 px-4 py-8">
    <div class="mx-auto max-w-3xl space-y-6">
      <div class="rounded-2xl border bg-background p-6 shadow-sm">
        <p class="text-muted-foreground text-sm">
          Ventanilla única
        </p>
        <h1 class="text-2xl font-semibold tracking-tight">
          Formulario web de radicación
        </h1>
        <p class="mt-2 text-sm text-muted-foreground">
          Envíe su solicitud y anexos. El equipo de ventanilla la clasificará antes de generar el radicado oficial.
        </p>
      </div>

      <div v-if="receivedId" class="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        Solicitud recibida correctamente. Número interno de recepción: {{ receivedId }}.
      </div>
      <p v-if="errorMessage" class="text-destructive text-sm">
        {{ errorMessage }}
      </p>

      <form class="space-y-4 rounded-2xl border bg-background p-6 shadow-sm" @submit.prevent="submit">
        <div class="grid gap-4 md:grid-cols-2">
          <div class="space-y-2">
            <Label>Nombre completo *</Label>
            <Input v-model="senderName" />
          </div>
          <div class="space-y-2">
            <Label>Correo electrónico *</Label>
            <Input v-model="senderEmail" type="email" />
          </div>
          <div class="space-y-2">
            <Label>Identificación *</Label>
            <Input
              v-model="senderIdentifier"
              inputmode="numeric"
              maxlength="64"
              placeholder="Solo números"
              @input="onDigitsOnlyInput($event, v => (senderIdentifier = v))"
            />
          </div>
          <div v-if="functionalTypes.length" class="space-y-2 md:col-span-2">
            <Label>Tipo de solicitud (opcional)</Label>
            <Select v-model="functionalTypeKey">
              <SelectTrigger>
                <SelectValue placeholder="Seleccione si conoce el tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">
                  Sin especificar
                </SelectItem>
                <SelectItem v-for="type in functionalTypes" :key="type.key" :value="type.key">
                  {{ type.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-2 md:col-span-2">
            <Label>Asunto *</Label>
            <Input v-model="subject" maxlength="500" />
          </div>
          <div class="space-y-2 md:col-span-2">
            <Label>Mensaje</Label>
            <Textarea v-model="body" rows="5" />
          </div>
        </div>

        <div class="space-y-4">
          <div class="flex items-center justify-between gap-3">
            <div>
              <Label>Documentos anexos *</Label>
              <p class="text-xs text-muted-foreground">
                Indique título, folios y archivo de cada documento. {{ intakeUploadConstraints.pickerHint }}
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" @click="addFileRow">
              <Icon name="i-lucide-plus" class="mr-1 size-4" />
              Agregar anexo
            </Button>
          </div>

          <DocumentsDocumentAttachmentUploadCard
            v-for="(row, index) in fileRows"
            :key="index"
            :label="index === 0 ? 'Documento principal' : `Anexo ${index}`"
            :primary="index === 0"
            :removable="fileRows.length > 1"
            :submit-attempted="submitAttempted"
            :upload-constraints="intakeUploadConstraints"
            :title="row.title"
            :folio-start="row.folioStart"
            :folio-end="row.folioEnd"
            :file="row.file"
            @update:title="row.title = $event"
            @update:folio-start="row.folioStart = $event"
            @update:folio-end="row.folioEnd = $event"
            @update:file="row.file = $event"
            @remove="removeFileRow(index)"
          />
        </div>

        <div class="flex justify-end">
          <Button type="submit" :disabled="saving">
            {{ saving ? 'Enviando…' : 'Enviar solicitud' }}
          </Button>
        </div>
      </form>
    </div>
  </div>
</template>
