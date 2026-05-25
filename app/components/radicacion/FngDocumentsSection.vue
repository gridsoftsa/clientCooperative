<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { ApplicantForm, FinancialInfoForm } from '~/types/credit-application'
import {
  auxiliaryUploadRejectReason,
  isAuxiliaryUploadFileAllowed,
} from '~/constants/auxiliary-documents-checklist'
import {
  extractFngItemsFromCatalogResponse,
  type DocumentationFngChecklistItem,
} from '~/constants/documentation-fng-checklist'
import { messageFromFetchError } from '~/utils/http-error-message'

const props = withDefaults(
  defineProps<{
    applicant: ApplicantForm
    creditApplicationId?: number | null
    applicationDocuments?: Array<{
      id: number
      applicant_id?: number
      title?: string
      original_name?: string
      download_url?: string
      is_reviewed?: boolean
      review_comment?: string | null
    }>
    disabled?: boolean
    auxiliaryPendingUploadHint?: 'draftSave' | 'immediate'
    interactionMode?: 'full' | 'uploadOnly' | 'viewOnly'
  }>(),
  {
    creditApplicationId: null,
    applicationDocuments: () => [],
    disabled: false,
    auxiliaryPendingUploadHint: 'draftSave',
    interactionMode: 'full',
  },
)

const emit = defineEmits<{
  'update:applicant': [ApplicantForm]
  'document-removed': [documentId: number]
}>()

const { $api } = useNuxtApp()
const { hasPermission } = usePermissions()
const { viewDocumentInNewTab } = useDocumentDownload()

const loadingConfig = ref(false)
const checklistRows = ref<DocumentationFngChecklistItem[]>([])

const financial = computed(() => (props.applicant.financial_info || {}) as FinancialInfoForm)

const docIdsByKey = computed((): Record<string, number | null> => {
  const raw = financial.value.fngDocuments
  if (!raw || typeof raw !== 'object') {
    return {}
  }
  const out: Record<string, number | null> = {}
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === 'number' && Number.isFinite(v)) {
      out[k] = v
    } else if (v === null) {
      out[k] = null
    }
  }
  return out
})

function applicantIdForDocs(): number | undefined {
  return props.applicant.id
}

function docMetaForKey(key: string) {
  const id = docIdsByKey.value[key]
  if (id == null || id < 1) {
    return null
  }
  const aid = applicantIdForDocs()
  const list = props.applicationDocuments ?? []
  return list.find(d =>
    d.id === id && (aid == null || d.applicant_id == null || d.applicant_id === aid),
  ) ?? list.find(d => d.id === id) ?? null
}

const uploadBlocked = computed(
  () => props.disabled || props.interactionMode === 'viewOnly',
)

const allowsRemoveUploaded = computed(
  () =>
    props.interactionMode === 'full'
    && !props.disabled
    && Boolean(props.creditApplicationId)
    && (hasPermission('radicacion_documentos_eliminar') || hasPermission('radicacion_fng_documentos_eliminar')),
)

function patchFngDocumentsMap(next: Record<string, number | null>): void {
  const raw = financial.value.fngDocuments
  const prev: Record<string, number | null> = {}
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    for (const [k, v] of Object.entries(raw)) {
      if (typeof v === 'number' && Number.isFinite(v)) {
        prev[k] = v
      }
      else if (v === null) {
        prev[k] = null
      }
    }
  }
  patchApplicant({
    financial_info: {
      ...financial.value,
      fngDocuments: { ...prev, ...next },
    },
  })
}

function canReplaceDocument(key: string): boolean {
  return !uploadBlockedForKey(key)
}

function triggerReplaceInput(key: string, idx: number): void {
  if (uploadBlockedForKey(key)) {
    return
  }
  const input = document.getElementById(safeInputId(key, idx)) as HTMLInputElement | null
  input?.click()
}

async function removeUploaded(key: string): Promise<void> {
  const id = docIdsByKey.value[key]
  const appId = props.creditApplicationId
  if (!id || !appId) {
    return
  }
  try {
    await $api(`/credit-applications/${appId}/documents/${id}`, { method: 'DELETE' })
    emit('document-removed', id)
    patchFngDocumentsMap({ [key]: null })
    toast.success('Documento eliminado')
  }
  catch (e: unknown) {
    toast.error(messageFromFetchError(e, 'No se pudo eliminar el documento.'))
  }
}

function pendingFileFor(key: string): File | undefined {
  const f = props.applicant.fngDocumentFiles?.[key]
  return f instanceof File ? f : undefined
}

function hasSatisfiedUploadForKey(key: string): boolean {
  const id = docIdsByKey.value[key]
  if (typeof id === 'number' && id >= 1) {
    return true
  }
  if (pendingFileFor(key) instanceof File) {
    return true
  }
  if (docMetaForKey(key)) {
    return true
  }
  return false
}

function uploadBlockedForKey(_key: string): boolean {
  return uploadBlocked.value
}

function showChecklistEmptyReadOnlyState(key: string): boolean {
  if (props.interactionMode === 'viewOnly') {
    return true
  }
  return props.interactionMode === 'uploadOnly' && !hasSatisfiedUploadForKey(key)
}

function patchApplicant(patch: Partial<ApplicantForm>): void {
  emit('update:applicant', { ...props.applicant, ...patch })
}

function patchFngFiles(next: Record<string, File | undefined>): void {
  const prev = props.applicant.fngDocumentFiles ?? {}
  patchApplicant({ fngDocumentFiles: { ...prev, ...next } })
}

async function loadChecklistConfig(): Promise<void> {
  loadingConfig.value = true
  try {
    const res = await $api<unknown>('/catalogs/template-flat-data/documentation-fng-documents')
    checklistRows.value = extractFngItemsFromCatalogResponse(res)
  } catch (e) {
    console.error(e)
    toast.error(messageFromFetchError(e, 'No se pudo cargar el checklist de FNG.'))
    checklistRows.value = []
  } finally {
    loadingConfig.value = false
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function safeInputId(key: string, index: number): string {
  const slug = key.replace(/[^a-zA-Z0-9_-]/g, '_')

  return `fng_doc_${index}_${slug}`
}

function pickFngFile(key: string, file: File | undefined): void {
  if (uploadBlockedForKey(key)) {
    return
  }
  if (!file) {
    return
  }
  if (!isAuxiliaryUploadFileAllowed(file)) {
    toast.error(auxiliaryUploadRejectReason(file) ?? 'Archivo no permitido.')
    return
  }
  patchFngFiles({ [key]: file })
}

function onFileInput(key: string, event: Event): void {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  pickFngFile(key, file)
}

function onInsDragOver(e: DragEvent): void {
  e.preventDefault()
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'copy'
  }
}

function onInsDragOverWrapper(key: string, e: DragEvent): void {
  if (uploadBlockedForKey(key)) {
    return
  }
  onInsDragOver(e)
}

function onInsDropWrapper(key: string, e: DragEvent): void {
  if (uploadBlockedForKey(key)) {
    return
  }
  e.preventDefault()
  const file = e.dataTransfer?.files?.[0]
  pickFngFile(key, file)
}

function onInsKeyWrapper(key: string, idx: number, e: KeyboardEvent): void {
  if (uploadBlockedForKey(key)) {
    return
  }
  onInsUploadZoneActivate(key, idx, e)
}

function onInsUploadZoneActivate(key: string, idx: number, event?: MouseEvent | KeyboardEvent): void {
  if (uploadBlockedForKey(key)) {
    return
  }
  if (event && 'target' in event && event.target instanceof Element) {
    if (event.target.closest('a[href], button')) {
      return
    }
  }
  const input = document.getElementById(safeInputId(key, idx)) as HTMLInputElement | null
  input?.click()
}

function clearPending(key: string): void {
  patchFngFiles({ [key]: undefined })
}

async function openFngDocumentInPreview(key: string): Promise<void> {
  const meta = docMetaForKey(key)
  const appId = props.creditApplicationId
  if (!meta?.id || !appId) {
    toast.error('No hay documento para abrir.')
    return
  }
  try {
    await viewDocumentInNewTab(appId, meta.id)
  } catch (e: unknown) {
    toast.error(messageFromFetchError(e, 'No se pudo abrir el archivo.'))
  }
}

watch(
  () => props.creditApplicationId,
  () => {
    void loadChecklistConfig()
  },
  { immediate: true },
)
</script>

<template>
  <div id="radicacion-fng-documents" class="space-y-4">
    <div>
      <h4 class="text-sm font-semibold">
        Documentos de FNG (parametrizados)
      </h4>
      <p class="mt-1 text-xs text-muted-foreground leading-relaxed">
        Lista definida en Parametrización → Radicación (plantilla «FNG — documentos», debajo de Asegurabilidad). Mismo criterio de archivos que el módulo auxiliar (PDF, ZIP, imagen · máximo 10 MB). No requiere marcar «Revisado» en esta sección. Si ya hay archivo cargado, use «Reemplazar archivo» para cambiarlo; «Eliminar» requiere permiso de eliminación (adjuntos o solo FNG).
      </p>
    </div>

    <div v-if="loadingConfig" class="flex items-center gap-2 py-4 text-sm text-muted-foreground">
      <Icon name="i-lucide-loader-2" class="h-4 w-4 animate-spin" />
      Cargando checklist…
    </div>

    <p
      v-else-if="checklistRows.length === 0"
      class="text-sm text-muted-foreground"
    >
      No hay documentos parametrizados para FNG. Revise Parametrización → Radicación (plantilla «FNG — documentos»), o ejecute en la API
      <code class="rounded bg-muted px-1 py-0.5 text-xs">php artisan db:seed --class=DocumentationFngDocumentsTemplateSeeder</code>
      si aún no se cargó la plantilla en base de datos.
    </p>

    <ScrollArea v-else class="h-[min(65vh,28rem)] w-full rounded-lg border border-border bg-muted/15 p-2 sm:p-3">
      <ul class="list-none space-y-4 p-0 pr-3">
        <li
          v-for="(row, idx) in checklistRows"
          :key="`${row.key}-${idx}`"
          class="overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm"
        >
          <div class="border-b border-border bg-muted/40 px-4 py-3 sm:px-5">
            <div class="flex flex-wrap items-center gap-2">
              <span
                class="inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
                :class="row.required
                  ? 'border-amber-600/35 bg-amber-500/10 text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100'
                  : 'border-muted-foreground/25 bg-background text-muted-foreground'"
              >
                {{ row.required ? 'Obligatorio' : 'Opcional' }}
              </span>
              <span class="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                FNG
              </span>
            </div>
            <p class="mt-2.5 min-w-0 break-words text-sm font-medium leading-snug text-foreground">
              {{ row.label }}
            </p>
          </div>

          <div class="p-4 sm:p-5">
            <input
              :id="safeInputId(row.key, idx)"
              type="file"
              accept=".pdf,.zip,.png,.jpg,.jpeg,.gif,.webp,.bmp,application/pdf,application/zip,image/*"
              class="sr-only"
              :disabled="uploadBlockedForKey(row.key)"
              @change="onFileInput(row.key, $event)"
            >
            <template v-if="pendingFileFor(row.key)">
              <div
                :role="uploadBlockedForKey(row.key) ? undefined : 'button'"
                :tabindex="uploadBlockedForKey(row.key) ? undefined : 0"
                :aria-label="uploadBlockedForKey(row.key) ? undefined : `Adjuntar archivo: ${row.label}`"
                class="flex min-h-[6.5rem] touch-manipulation flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/20 px-4 py-4 text-center transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                :class="uploadBlockedForKey(row.key) ? 'cursor-default opacity-95' : 'cursor-pointer hover:border-primary/45 hover:bg-muted/30 active:bg-muted/35'"
                @click="onInsUploadZoneActivate(row.key, idx, $event)"
                @keydown.enter.prevent="onInsKeyWrapper(row.key, idx, $event)"
                @keydown.space.prevent="onInsKeyWrapper(row.key, idx, $event)"
                @dragover="onInsDragOverWrapper(row.key, $event)"
                @drop="onInsDropWrapper(row.key, $event)"
              >
                <Icon name="i-lucide-file-check" class="size-7 text-green-600 dark:text-green-500" />
                <span class="w-full max-w-full whitespace-normal break-words px-2 text-center text-sm font-medium leading-snug text-foreground [overflow-wrap:anywhere]">
                  {{ pendingFileFor(row.key)!.name }}
                </span>
                <span class="text-xs text-muted-foreground">
                  {{ formatFileSize(pendingFileFor(row.key)!.size) }}
                </span>
                <span v-if="!uploadBlockedForKey(row.key)" class="text-xs text-amber-700 dark:text-amber-400">
                  {{
                    auxiliaryPendingUploadHint === 'immediate'
                      ? 'Se sube automáticamente en unos segundos…'
                      : 'Se subirá al guardar la solicitud'
                  }}
                </span>
                <button
                  v-if="!uploadBlockedForKey(row.key)"
                  type="button"
                  class="text-xs font-medium text-primary underline underline-offset-2"
                  @click.stop.prevent="clearPending(row.key)"
                >
                  Quitar selección
                </button>
              </div>
            </template>
            <template v-else-if="docMetaForKey(row.key)">
              <div
                class="flex min-h-[6.5rem] flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/20 px-4 py-4 text-center"
              >
                <Icon name="i-lucide-file-text" class="size-7 text-primary" />
                <button
                  type="button"
                  class="inline-block w-full max-w-full cursor-pointer whitespace-normal break-words bg-transparent px-2 text-center text-sm font-medium leading-snug text-primary underline underline-offset-2 [overflow-wrap:anywhere]"
                  @click="void openFngDocumentInPreview(row.key)"
                >
                  {{ docMetaForKey(row.key)?.original_name || 'Ver archivo' }}
                </button>
                <span class="text-xs text-muted-foreground">Archivo en la solicitud</span>
                <div class="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
                  <button
                    v-if="canReplaceDocument(row.key)"
                    type="button"
                    class="text-xs font-medium text-primary underline underline-offset-2"
                    @click="triggerReplaceInput(row.key, idx)"
                  >
                    Reemplazar archivo
                  </button>
                  <button
                    v-if="allowsRemoveUploaded"
                    type="button"
                    class="text-xs font-medium text-destructive underline underline-offset-2"
                    @click="void removeUploaded(row.key)"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </template>
            <template v-else-if="showChecklistEmptyReadOnlyState(row.key)">
              <div
                class="flex min-h-[6.5rem] flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/20 px-4 py-4 text-center opacity-95"
              >
                <Icon name="i-lucide-file-warning" class="size-7 text-muted-foreground" />
                <span class="max-w-sm text-sm font-medium leading-snug text-muted-foreground">
                  Sin archivo en la solicitud para este requisito.
                </span>
              </div>
            </template>
            <template v-else>
              <div
                :role="uploadBlockedForKey(row.key) ? undefined : 'button'"
                :tabindex="uploadBlockedForKey(row.key) ? undefined : 0"
                :aria-label="uploadBlockedForKey(row.key) ? undefined : `Adjuntar archivo: ${row.label}`"
                class="flex min-h-[6.5rem] touch-manipulation flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/20 px-4 py-4 text-center transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                :class="uploadBlockedForKey(row.key) ? 'cursor-default opacity-95' : 'cursor-pointer hover:border-primary/45 hover:bg-muted/30 active:bg-muted/35'"
                @click="onInsUploadZoneActivate(row.key, idx, $event)"
                @keydown.enter.prevent="onInsKeyWrapper(row.key, idx, $event)"
                @keydown.space.prevent="onInsKeyWrapper(row.key, idx, $event)"
                @dragover="onInsDragOverWrapper(row.key, $event)"
                @drop="onInsDropWrapper(row.key, $event)"
              >
                <div class="flex size-10 items-center justify-center rounded-full bg-muted">
                  <Icon name="i-lucide-upload" class="size-5 shrink-0 text-muted-foreground" />
                </div>
                <span class="max-w-sm text-sm font-medium leading-snug text-foreground">
                  Arrastre el archivo aquí o haga clic para elegir
                </span>
                <span class="text-xs text-muted-foreground">PDF, ZIP o imagen · máximo 10 MB</span>
              </div>
            </template>
          </div>
        </li>
      </ul>
    </ScrollArea>
  </div>
</template>
