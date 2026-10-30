<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { ArchivalDocumentRetentionSummary } from '~/types/archival-file'
import type { InstitutionalLibraryCategory } from '~/types/institutional-library'
import {
  appendDocumentFoliosToFormData,
  createDocumentAttachmentRow,
  validateDocumentAttachmentFolios,
  type DocumentAttachmentRow,
} from '~/utils/document-attachment-folio'
import { ARCHIVAL_DOCUMENT_UPLOAD_CONSTRAINTS } from '~/utils/document-upload-constraints'
import { formatArchivalRetentionPreview } from '~/utils/archival-area-repository'
import { messageFromFetchError } from '~/utils/http-error-message'
import { preventArchivalMultiselectDialogDismiss } from '~/composables/useArchivalMultiselect'

const props = defineProps<{
  open: boolean
  orgUnitId: number
  docDocumentTypeId: number
  documentTypeName: string
  retention?: ArchivalDocumentRetentionSummary | null
  publishableToLibrary?: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  created: [archivalFileId: number]
}>()

const archivalApi = useArchivalFileApi()
const libraryApi = useInstitutionalLibraryApi()
const { hasPermission } = usePermissions()

const saving = ref(false)
const submitAttempted = ref(false)
const folderName = ref('')
const fileRows = ref<DocumentAttachmentRow[]>([createDocumentAttachmentRow()])
const publishToLibrary = ref(false)
const institutionalCategory = ref<string | null>(null)
const categories = ref<InstitutionalLibraryCategory[]>([])
const effectiveFrom = ref('')
const effectiveTo = ref('')
const isFeatured = ref(false)
const featuredDuration = ref<'indefinite' | 'until'>('indefinite')
const featuredUntil = ref('')

const canPublish = computed(() =>
  Boolean(props.publishableToLibrary) && hasPermission('expedientes_biblioteca_publicar'),
)

const retentionText = computed(() => formatArchivalRetentionPreview(props.retention))

watch(() => props.open, async (isOpen) => {
  if (!isOpen) {
    return
  }

  folderName.value = ''
  fileRows.value = [createDocumentAttachmentRow()]
  publishToLibrary.value = false
  institutionalCategory.value = null
  effectiveFrom.value = todayLocalIsoDate()
  effectiveTo.value = ''
  isFeatured.value = false
  featuredDuration.value = 'indefinite'
  featuredUntil.value = ''
  submitAttempted.value = false

  if (canPublish.value) {
    await loadLibraryCategories()
  }
})

function todayLocalIsoDate(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${now.getFullYear()}-${month}-${day}`
}

async function loadLibraryCategories(): Promise<void> {
  try {
    categories.value = await libraryApi.fetchCatalog()
  }
  catch {
    categories.value = []
    toast.error('No se pudieron cargar las categorías de biblioteca.')
  }
}

function setPublishToLibrary(checked: boolean): void {
  publishToLibrary.value = checked
  if (!checked) {
    isFeatured.value = false
    featuredDuration.value = 'indefinite'
    featuredUntil.value = ''
    return
  }

  if (categories.value.length === 0) {
    void loadLibraryCategories()
  }
}

function setFeatured(checked: boolean): void {
  isFeatured.value = checked
  if (checked && featuredDuration.value !== 'until') {
    featuredDuration.value = 'indefinite'
  }
  if (!checked) {
    featuredDuration.value = 'indefinite'
    featuredUntil.value = ''
  }
}

function addFileRow() {
  fileRows.value.push(createDocumentAttachmentRow())
}

function removeFileRow(index: number) {
  if (fileRows.value.length === 1) {
    return
  }
  fileRows.value.splice(index, 1)
}

async function submit() {
  submitAttempted.value = true
  const title = folderName.value.trim()

  if (!title) {
    toast.error('Indique el nombre de la carpeta.')
    return
  }

  for (const [index, row] of fileRows.value.entries()) {
    if (!row.file) {
      toast.error(`Adjunte el archivo del documento ${index + 1}.`)
      return
    }

    const folioError = validateDocumentAttachmentFolios(row.folioStart, row.folioEnd)
    if (folioError) {
      toast.error(`${folioError} (documento ${index + 1})`)
      return
    }
  }

  if (publishToLibrary.value && !institutionalCategory.value) {
    toast.error('Seleccione una categoría de biblioteca institucional.')
    return
  }

  if (publishToLibrary.value && isFeatured.value && featuredDuration.value === 'until' && !featuredUntil.value.trim()) {
    toast.error('Indique hasta qué fecha debe mostrarse como destacado.')
    return
  }

  saving.value = true

  try {
    const formData = new FormData()
    formData.append('org_unit_id', String(props.orgUnitId))
    formData.append('doc_document_type_id', String(props.docDocumentTypeId))
    formData.append('title', title)
    formData.append('publish_to_library', publishToLibrary.value ? '1' : '0')
    if (publishToLibrary.value && institutionalCategory.value) {
      formData.append('institutional_categories[0]', institutionalCategory.value)
      if (effectiveFrom.value) {
        formData.append('effective_from', effectiveFrom.value)
      }
      if (effectiveTo.value) {
        formData.append('effective_to', effectiveTo.value)
      }
      formData.append('is_featured', isFeatured.value ? '1' : '0')
      formData.append('featured_duration', featuredDuration.value)
      if (isFeatured.value && featuredDuration.value === 'until' && featuredUntil.value) {
        formData.append('featured_until', featuredUntil.value)
      }
    }

    fileRows.value.forEach((row, index) => {
      if (!row.file) {
        return
      }
      formData.append(`files[${index}][file]`, row.file)
      formData.append(`files[${index}][title]`, row.title.trim() || row.file.name)
      appendDocumentFoliosToFormData(formData, index, row.folioStart, row.folioEnd)
    })

    const res = await archivalApi.createAreaManualFolder(formData)
    toast.success(res.message)
    emit('update:open', false)
    emit('created', res.data.archival_file_id)
  }
  catch (error) {
    toast.error(messageFromFetchError(error, 'No se pudo crear la carpeta en el tipo documental.'))
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent
      class="area-folder-shell top-0 right-0 bottom-0 left-0 h-auto max-h-none w-auto max-w-none translate-x-0 translate-y-0 border-0 bg-transparent p-4 shadow-none sm:max-w-none"
      @pointer-down-outside="preventArchivalMultiselectDialogDismiss"
      @focus-outside="preventArchivalMultiselectDialogDismiss"
      @interact-outside="preventArchivalMultiselectDialogDismiss"
    >
      <div class="area-folder-dialog">
      <DialogClose class="absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:outline-hidden">
        <Icon name="i-lucide-x" class="size-4" />
        <span class="sr-only">Cerrar</span>
      </DialogClose>
      <div class="area-folder-dialog__bar space-y-4">
        <DialogHeader>
          <DialogTitle>Nueva carpeta en tipo documental</DialogTitle>
          <DialogDescription>
            {{ documentTypeName }}. Se aplica la retención de la TRD del área a cada archivo.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter class="gap-2 sm:justify-end">
          <Button type="button" variant="outline" :disabled="saving" @click="emit('update:open', false)">
            Cancelar
          </Button>
          <Button type="button" :disabled="saving" @click="submit">
            {{ saving ? 'Creando…' : 'Crear carpeta y cargar' }}
          </Button>
        </DialogFooter>
      </div>

      <div class="area-folder-dialog__body space-y-4">
        <div
          v-if="retentionText"
          class="rounded-md border bg-muted/30 p-3 text-sm leading-relaxed text-muted-foreground"
        >
          <p class="font-medium text-foreground">
            Tiempos TRD que se aplicarán
          </p>
          <p class="mt-1">
            {{ retentionText }}
          </p>
          <p v-if="retention?.management_ends_at" class="mt-1 text-xs">
            En archivo de gestión hasta {{ retention.management_ends_at }} (desde hoy).
          </p>
        </div>
        <p
          v-else
          class="rounded-md border border-dashed p-3 text-sm text-muted-foreground"
        >
          No hay regla de retención vigente en la TRD para este tipo. Los archivos se cargan igual; configure la TRD del área para fijar plazos.
        </p>

        <div class="space-y-2">
          <Label for="area-manual-folder-name">Nombre de la carpeta *</Label>
          <Input
            id="area-manual-folder-name"
            v-model="folderName"
            placeholder="Ej. Acta de donación de equipos — octubre 2026"
          />
        </div>

        <div class="flex flex-wrap items-center justify-between gap-2">
          <p class="text-sm font-medium">
            Archivos y folios
          </p>
          <Button type="button" variant="outline" size="sm" :disabled="saving" @click="addFileRow">
            <Icon name="i-lucide-plus" class="mr-1 size-4" />
            Agregar archivo
          </Button>
        </div>

        <DocumentsDocumentAttachmentUploadCard
          v-for="(row, index) in fileRows"
          :key="index"
          :label="fileRows.length === 1 ? 'Documento' : `Documento ${index + 1}`"
          :removable="fileRows.length > 1"
          :submit-attempted="submitAttempted"
          :disabled="saving"
          :upload-constraints="ARCHIVAL_DOCUMENT_UPLOAD_CONSTRAINTS"
          :title="row.title"
          :folio-start="row.folioStart"
          :folio-end="row.folioEnd"
          :file="row.file"
          :file-input-id="`area-manual-file-${index}`"
          @update:title="row.title = $event"
          @update:folio-start="row.folioStart = $event"
          @update:folio-end="row.folioEnd = $event"
          @update:file="row.file = $event"
          @remove="removeFileRow(index)"
        />

        <div v-if="canPublish" class="space-y-3 rounded-lg border p-4">
          <Checkbox
            id="area-manual-publish"
            :model-value="publishToLibrary"
            @update:model-value="setPublishToLibrary($event === true)"
          >
            Publicar en biblioteca institucional
          </Checkbox>
          <p class="pl-6 text-xs leading-snug text-muted-foreground">
            Esta serie TRD está habilitada para biblioteca. Los archivos de la carpeta quedarán publicados.
          </p>
          <div v-if="publishToLibrary" class="space-y-4 pl-6">
            <div class="space-y-2">
              <Label>Categoría</Label>
              <p class="text-xs leading-relaxed text-muted-foreground">
                Elija una clasificación en la biblioteca institucional.
              </p>
              <ArchivalLibraryCategorySelect
                v-model="institutionalCategory"
                :options="categories"
              />
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <div class="space-y-2">
                <Label for="area-manual-effective-from">Vigente desde</Label>
                <Input id="area-manual-effective-from" v-model="effectiveFrom" type="date" />
              </div>
              <div class="space-y-2">
                <Label for="area-manual-effective-to">Vigente hasta (opcional)</Label>
                <Input id="area-manual-effective-to" v-model="effectiveTo" type="date" :min="effectiveFrom" />
              </div>
            </div>

            <div class="space-y-3 rounded-lg border bg-muted/20 p-4">
              <Checkbox
                id="area-manual-featured"
                :model-value="isFeatured"
                @update:model-value="setFeatured($event === true)"
              >
                Destacar en biblioteca
              </Checkbox>
              <p class="pl-6 text-xs leading-relaxed text-muted-foreground">
                El documento aparecerá en el banner principal de la biblioteca institucional.
              </p>

              <div v-if="isFeatured" class="space-y-3 pl-6">
                <p class="text-xs font-medium">
                  Duración del destacado
                </p>
                <label class="flex cursor-pointer items-start gap-2">
                  <input
                    v-model="featuredDuration"
                    type="radio"
                    name="area-manual-featured-duration"
                    value="indefinite"
                    class="mt-0.5 size-4 shrink-0 accent-primary"
                  >
                  <span class="text-sm font-normal leading-snug">
                    <strong>Indefinido.</strong> Se mantiene destacado hasta que se quite la publicación o se edite.
                  </span>
                </label>
                <label class="flex cursor-pointer items-start gap-2">
                  <input
                    v-model="featuredDuration"
                    type="radio"
                    name="area-manual-featured-duration"
                    value="until"
                    class="mt-0.5 size-4 shrink-0 accent-primary"
                  >
                  <span class="text-sm font-normal leading-snug">
                    <strong>Hasta una fecha.</strong> Deja de destacarse al día siguiente de esa fecha.
                  </span>
                </label>
                <div v-if="featuredDuration === 'until'" class="space-y-2 sm:max-w-xs">
                  <Label for="area-manual-featured-until-date">Destacado hasta</Label>
                  <Input
                    id="area-manual-featured-until-date"
                    v-model="featuredUntil"
                    type="date"
                    :min="effectiveFrom"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        <p v-else-if="publishableToLibrary" class="text-xs text-muted-foreground">
          La serie admite biblioteca institucional, pero su usuario no tiene permiso de publicación.
        </p>
        <p v-else class="text-xs text-muted-foreground">
          Esta serie no está habilitada para biblioteca institucional.
        </p>
      </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<style>
/* Capa a pantalla completa: centra la tarjeta y no la pega arriba. */
.area-folder-shell {
  position: fixed !important;
  inset: 0 !important;
  top: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  left: 0 !important;
  transform: none !important;
  translate: none !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: auto !important;
  max-width: none !important;
  height: auto !important;
  max-height: none !important;
  margin: 0 !important;
  padding: 1rem !important;
  gap: 0 !important;
  overflow: visible !important;
  background: transparent !important;
  border: none !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  animation: none !important;
  pointer-events: none !important;
}

.area-folder-shell > button {
  display: none !important;
}

.area-folder-dialog {
  pointer-events: auto;
  position: relative;
  display: flex;
  flex-direction: column;
  width: min(42rem, 100%);
  max-height: calc(100dvh - 2rem);
  min-height: 0;
  overflow: hidden;
  border-radius: 0.5rem;
  border: 1px solid var(--border);
  background: var(--background);
  box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
}

.area-folder-dialog__bar {
  flex: 0 0 auto;
  border-bottom: 1px solid var(--border);
  background: var(--background);
  padding: 1rem 3rem 1rem 1.5rem;
}

.area-folder-dialog__body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 1rem 1.5rem 1.25rem;
}
</style>
