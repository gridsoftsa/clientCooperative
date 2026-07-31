<script setup lang="ts">
import { nextTick, watch } from 'vue'
import { toast } from 'vue-sonner'
import type { ApplicantForm, FinancialInfoForm } from '~/types/credit-application'
import {
  type AuxiliaryChecklistItem,
  type EconomicActivityCatalogOption,
  auxiliaryUploadRejectReason,
  extractItemsByActivityFromCatalogResponse,
  isAuxiliaryUploadFileAllowed,
  normalizeStoredActivityType,
  resolveAuxiliaryChecklistRows,
  titleForAuxiliaryDocumentUpload,
} from '~/constants/auxiliary-documents-checklist'
import { messageFromFetchError } from '~/utils/http-error-message'
import { creditApplicationDocumentIdEquals, parseFinancialChecklistDocumentIdMap } from '~/utils/financial-checklist-document-id-map'
import { findDocumentIdByTitle } from '~/utils/radicacion-document-upload'
import DocumentInlinePreviewDialog from '~/components/radicacion/DocumentInlinePreviewDialog.vue'

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
    /** Mismo catálogo que «Tipo de actividad económica» — alinea valores con las claves de `itemsByActivity`. */
    economicActivityOptions?: EconomicActivityCatalogOption[]
    disabled?: boolean
    /** `immediate`: el padre sube el archivo al servidor en cuanto se elige (p. ej. revisión documental en detalle). */
    auxiliaryPendingUploadHint?: 'draftSave' | 'immediate'
    /**
     * `full`: alta/edición (subir, quitar pendiente, eliminar persistido).
     * `uploadOnly`: revisión documental con subida — sin eliminar adjunto ya guardado.
     * `viewOnly`: solo ver / abrir archivo y (opcional) marcar revisión.
     */
    interactionMode?: 'full' | 'uploadOnly' | 'viewOnly'
    /** Muestra «Revisado» y comentario por documento ya vinculado al ítem del checklist (misma fila que la segunda captura). */
    showDocumentReviewControls?: boolean
  }>(),
  {
    creditApplicationId: null,
    applicationDocuments: () => [],
    economicActivityOptions: () => [],
    disabled: false,
    auxiliaryPendingUploadHint: 'draftSave',
    interactionMode: 'full',
    showDocumentReviewControls: false,
  },
)

const emit = defineEmits<{
  'update:applicant': [ApplicantForm]
}>()

const { $api } = useNuxtApp()
const {
  open: inlinePreviewOpen,
  loading: inlinePreviewLoading,
  title: inlinePreviewTitle,
  previewUrl: inlinePreviewUrl,
  previewKind: inlinePreviewKind,
  previewLocalFile,
  previewApplicationDocument,
} = useDocumentInlinePreview()

const loadingConfig = ref(false)
const itemsByActivity = ref<Record<string, AuxiliaryChecklistItem[]>>({})
/** Tras intentar avanzar de paso sin cumplir obligatorios: resalta filas y bloquea hasta corregir. */
const highlightMissingRequired = ref(false)

const financial = computed(() => (props.applicant.financial_info || {}) as FinancialInfoForm)

const activityType = computed(() => normalizeStoredActivityType(financial.value.activity_type))

const checklistRows = computed((): AuxiliaryChecklistItem[] =>
  resolveAuxiliaryChecklistRows(
    itemsByActivity.value,
    activityType.value,
    props.economicActivityOptions,
  ),
)

const docIdsByKey = computed((): Record<string, number | null> =>
  parseFinancialChecklistDocumentIdMap(financial.value.auxiliaryDocuments),
)

function applicantIdForDocs(): number | undefined {
  return props.applicant.id
}

function docMetaById(id: number) {
  const aid = applicantIdForDocs()
  const list = props.applicationDocuments ?? []
  return list.find(d =>
    creditApplicationDocumentIdEquals(d.id, id)
    && (aid == null || d.applicant_id == null || Number(d.applicant_id) === aid),
  ) ?? list.find(d => creditApplicationDocumentIdEquals(d.id, id)) ?? null
}

function labelForChecklistKey(key: string): string {
  return checklistRows.value.find(r => r.key === key)?.label ?? key
}

/** Resuelve documento por mapa o, si el ID está huérfano / ausente, por título «Auxiliar — …». */
function resolvedDocIdForKey(key: string): number | null {
  const mapped = docIdsByKey.value[key]
  if (typeof mapped === 'number' && mapped >= 1 && docMetaById(mapped)) {
    return mapped
  }
  const byTitle = findDocumentIdByTitle(
    props.applicationDocuments ?? [],
    titleForAuxiliaryDocumentUpload(labelForChecklistKey(key)),
    applicantIdForDocs(),
  )
  if (byTitle != null) {
    return byTitle
  }
  if (typeof mapped === 'number' && mapped >= 1) {
    return mapped
  }
  return null
}

function docMetaForKey(key: string) {
  const id = resolvedDocIdForKey(key)
  if (id == null || id < 1) return null
  return docMetaById(id)
}

/** Misma fila que `applicationDocuments` del padre (mutación para revisión documental). */
function documentReviewRowForKey(key: string): {
  id: number
  is_reviewed?: boolean
  review_comment?: string | null
} | null {
  const docId = resolvedDocIdForKey(key)
  if (docId == null || docId < 1) {
    return null
  }
  const d = props.applicationDocuments?.find(x => creditApplicationDocumentIdEquals(x.id, docId))
  if (!d || typeof d !== 'object') {
    return null
  }
  return d as { id: number, is_reviewed?: boolean, review_comment?: string | null }
}

function auxiliaryReviewDomId(key: string): string {
  const d = documentReviewRowForKey(key)
  return d ? `aux_doc_reviewed_${key}_${d.id}` : `aux_doc_reviewed_${key}`
}

function setDocumentReviewChecked(key: string, v: unknown): void {
  const d = documentReviewRowForKey(key)
  if (d) {
    d.is_reviewed = Boolean(v)
  }
}

function setDocumentReviewComment(key: string, v: unknown): void {
  const d = documentReviewRowForKey(key)
  if (d) {
    d.review_comment = String(v ?? '')
  }
}

const uploadBlocked = computed(
  () => props.disabled || props.interactionMode === 'viewOnly',
)

function hasSatisfiedUploadForKey(key: string): boolean {
  // Archivo local pendiente siempre cuenta (se sube al guardar); debe ir antes del
  // chequeo de ID para no ignorarlo cuando el mapa apunta a un documento huérfano.
  const pending = pendingFileFor(key)
  if (pending instanceof File) {
    return true
  }
  // docMetaForKey ya recupera por título si el ID del mapa está huérfano o ausente.
  return Boolean(docMetaForKey(key))
}

/** En revisión documental con subida: solo reemplazar; no cargar el primer archivo en una fila vacía. */
function uploadBlockedForKey(key: string): boolean {
  if (uploadBlocked.value) {
    return true
  }
  if (props.interactionMode === 'uploadOnly' && !hasSatisfiedUploadForKey(key)) {
    return true
  }
  return false
}

function showChecklistEmptyReadOnlyState(key: string): boolean {
  if (props.interactionMode === 'viewOnly') {
    return !hasSatisfiedUploadForKey(key)
  }
  return props.interactionMode === 'uploadOnly' && !hasSatisfiedUploadForKey(key)
}

const allowsRemoveUploaded = computed(
  () =>
    props.interactionMode === 'full'
    && !props.disabled
    && Boolean(props.creditApplicationId),
)

function rowMissingRequired(row: AuxiliaryChecklistItem): boolean {
  return highlightMissingRequired.value && row.required && !hasSatisfiedUploadForKey(row.key)
}

function patchApplicant(patch: Partial<ApplicantForm>): void {
  emit('update:applicant', { ...props.applicant, ...patch })
}

function patchFinancial(patch: Partial<FinancialInfoForm>): void {
  const fi = { ...financial.value, ...patch }
  patchApplicant({ financial_info: fi })
}

function patchAuxiliaryDocuments(next: Record<string, number | null>): void {
  patchFinancial({ auxiliaryDocuments: next })
}

function patchPendingFiles(next: Record<string, File | undefined>): void {
  const prev = props.applicant.auxiliaryDocumentFiles ?? {}
  patchApplicant({ auxiliaryDocumentFiles: { ...prev, ...next } })
}

async function fetchConfig(): Promise<void> {
  loadingConfig.value = true
  try {
    const res = await $api<unknown>('/catalogs/template-flat-data/auxiliary-documents')
    itemsByActivity.value = extractItemsByActivityFromCatalogResponse(res)
  } catch (e: unknown) {
    itemsByActivity.value = {}
    toast.error(
      messageFromFetchError(
        e,
        'No se pudo cargar el listado de documentos del módulo auxiliar. Verifique su sesión o la parametrización.',
      ),
    )
  } finally {
    loadingConfig.value = false
  }
}

onMounted(() => {
  void fetchConfig()
})

watch(
  () => [
    props.applicant.auxiliaryDocumentFiles,
    financial.value.auxiliaryDocuments,
    activityType.value,
    checklistRows.value.map(r => `${r.key}:${hasSatisfiedUploadForKey(r.key)}`).join('|'),
  ],
  () => {
    if (!highlightMissingRequired.value) {
      return
    }
    const anyMissing = checklistRows.value.some(r => r.required && !hasSatisfiedUploadForKey(r.key))
    if (!anyMissing) {
      highlightMissingRequired.value = false
    }
  },
  { deep: true },
)

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function pickAuxiliaryFile(key: string, file: File | undefined): void {
  if (uploadBlockedForKey(key)) {
    if (file && props.interactionMode === 'uploadOnly' && !uploadBlocked.value) {
      toast.error('En revisión documental solo puede reemplazar archivos ya cargados en la solicitud, no adjuntar el primero desde aquí.')
    }
    return
  }
  if (!file) return
  if (!isAuxiliaryUploadFileAllowed(file)) {
    toast.error(auxiliaryUploadRejectReason(file) ?? 'Archivo no permitido.')
    return
  }
  patchPendingFiles({ [key]: file })
}

function onFileInput(key: string, event: Event): void {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  pickAuxiliaryFile(key, file)
}

function clearPending(key: string): void {
  patchPendingFiles({ [key]: undefined })
}

async function removeUploaded(key: string): Promise<void> {
  const id = resolvedDocIdForKey(key)
  const appId = props.creditApplicationId
  if (!id || !appId) return
  try {
    await $api(`/credit-applications/${appId}/documents/${id}`, { method: 'DELETE' })
    const next = { ...docIdsByKey.value, [key]: null }
    patchAuxiliaryDocuments(next)
    toast.success('Documento eliminado')
  } catch {
    toast.error('No se pudo eliminar el documento')
  }
}

function safeInputId(key: string, index: number): string {
  const slug = key.replace(/[^a-zA-Z0-9_-]/g, '_')
  return `aux_doc_${index}_${slug}`
}

function canPreviewAuxiliaryDocument(key: string): boolean {
  return Boolean(pendingFileFor(key) || docMetaForKey(key))
}

async function openAuxiliaryDocumentInlinePreview(key: string): Promise<void> {
  const pending = pendingFileFor(key)
  if (pending) {
    previewLocalFile(pending)
    return
  }

  const meta = docMetaForKey(key)
  const appId = props.creditApplicationId
  if (!meta?.id || !appId) {
    toast.error('No hay documento para previsualizar.')
    return
  }

  await previewApplicationDocument(appId, meta.id, meta.original_name)
}

function triggerAuxiliaryFileInput(key: string, idx: number): void {
  if (uploadBlockedForKey(key)) {
    return
  }
  const input = document.getElementById(safeInputId(key, idx)) as HTMLInputElement | null
  if (!input || input.disabled) {
    return
  }
  input.click()
}

/** Safari iOS no abre bien el file picker si hay `<button>`/`<a>` dentro de `<label for="file">`; usamos click programático en la zona. */
function onAuxiliaryUploadZoneActivate(key: string, idx: number, event?: MouseEvent | KeyboardEvent): void {
  if (uploadBlockedForKey(key)) {
    return
  }
  if (event && 'target' in event && event.target instanceof Element) {
    if (event.target.closest('a[href], button')) {
      return
    }
  }
  triggerAuxiliaryFileInput(key, idx)
}

function pendingFileFor(key: string): File | undefined {
  const f = props.applicant.auxiliaryDocumentFiles?.[key]
  return f instanceof File ? f : undefined
}

/**
 * Devuelve true si puede avanzar de paso; si faltan obligatorios, activa resaltado danger y false.
 * @param opts.silent Si true, no muestra toast (el padre ya explicó quién/qué falta).
 */
function validateRequiredAuxiliaryUploads(opts?: { silent?: boolean }): boolean {
  if (props.interactionMode === 'viewOnly') {
    highlightMissingRequired.value = false
    return true
  }
  if (props.disabled) {
    highlightMissingRequired.value = false
    return true
  }
  if (!activityType.value || checklistRows.value.length === 0) {
    highlightMissingRequired.value = false
    return true
  }
  const missing = checklistRows.value.filter(r => r.required && !hasSatisfiedUploadForKey(r.key))
  if (missing.length > 0) {
    highlightMissingRequired.value = true
    docFilter.value = 'pending'
    if (!opts?.silent) {
      toast.error('Adjunta los documentos obligatorios del checklist antes de continuar.')
    }
    void nextTick(() => {
      document.querySelector('[data-aux-doc-error="1"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
    return false
  }
  highlightMissingRequired.value = false
  return true
}

type DocFilter = 'all' | 'pending' | 'done'

const docFilter = ref<DocFilter>('all')

const uploadStats = computed(() => {
  const rows = checklistRows.value
  const required = rows.filter(r => r.required)
  const done = rows.filter(r => hasSatisfiedUploadForKey(r.key))
  const requiredDone = required.filter(r => hasSatisfiedUploadForKey(r.key))
  return {
    total: rows.length,
    done: done.length,
    requiredTotal: required.length,
    requiredDone: requiredDone.length,
    requiredPending: required.length - requiredDone.length,
    percent: rows.length ? Math.round((done.length / rows.length) * 100) : 0,
  }
})

const displayedRows = computed(() => {
  const rows = checklistRows.value
  if (docFilter.value === 'pending') {
    return rows.filter(r => !hasSatisfiedUploadForKey(r.key))
  }
  if (docFilter.value === 'done') {
    return rows.filter(r => hasSatisfiedUploadForKey(r.key))
  }
  return rows
})

function rowStatusIcon(row: AuxiliaryChecklistItem): 'done' | 'missing' | 'optional' {
  if (hasSatisfiedUploadForKey(row.key)) {
    return 'done'
  }
  if (row.required) {
    return 'missing'
  }
  return 'optional'
}

function displayFileNameForKey(key: string): string | null {
  const pending = pendingFileFor(key)
  if (pending) {
    return pending.name
  }
  const meta = docMetaForKey(key)
  if (meta?.original_name) {
    return meta.original_name
  }
  return null
}

defineExpose({
  validateRequiredAuxiliaryUploads,
})
</script>

<template>
  <div id="radicacion-auxiliary-documents" class="space-y-3">
    <div v-if="loadingConfig" class="text-sm text-muted-foreground">
      Cargando listado de documentos…
    </div>
    <template v-else>
      <p v-if="!activityType" class="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
        Seleccione el <span class="font-medium text-foreground">tipo de actividad económica</span> arriba para ver los documentos requeridos.
      </p>
      <p v-else-if="checklistRows.length === 0" class="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
        No hay documentos parametrizados para «{{ activityType }}».
      </p>
      <template v-else>
        <!-- Resumen y filtros -->
        <div class="sticky top-0 z-10 space-y-3 rounded-lg border border-border bg-background/95 p-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div class="flex flex-wrap items-center gap-3">
            <div
              class="flex size-11 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold tabular-nums"
              :class="uploadStats.requiredPending > 0
                ? 'border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-100'
                : 'border-green-500/50 bg-green-500/10 text-green-800 dark:text-green-200'"
            >
              {{ uploadStats.done }}/{{ uploadStats.total }}
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-foreground">
                {{ uploadStats.done }} de {{ uploadStats.total }} documentos listos
              </p>
              <p class="text-xs text-muted-foreground">
                <template v-if="uploadStats.requiredPending > 0">
                  Faltan <span class="font-medium text-amber-700 dark:text-amber-300">{{ uploadStats.requiredPending }} obligatorio(s)</span>
                </template>
                <template v-else>
                  Todos los obligatorios están adjuntos
                </template>
                · PDF, ZIP o imagen · máx. 10 MB
              </p>
            </div>
          </div>
          <Progress :model-value="uploadStats.percent" class="h-1.5" />
          <div class="flex flex-wrap gap-1.5">
            <Button
              type="button"
              size="sm"
              :variant="docFilter === 'all' ? 'default' : 'outline'"
              class="h-8"
              @click="docFilter = 'all'"
            >
              Todos ({{ uploadStats.total }})
            </Button>
            <Button
              type="button"
              size="sm"
              :variant="docFilter === 'pending' ? 'default' : 'outline'"
              class="h-8"
              @click="docFilter = 'pending'"
            >
              Pendientes ({{ uploadStats.total - uploadStats.done }})
            </Button>
            <Button
              type="button"
              size="sm"
              :variant="docFilter === 'done' ? 'default' : 'outline'"
              class="h-8"
              @click="docFilter = 'done'"
            >
              Listos ({{ uploadStats.done }})
            </Button>
          </div>
        </div>

        <p v-if="displayedRows.length === 0" class="text-center text-sm text-muted-foreground py-6">
          No hay documentos en esta vista. Pruebe otro filtro.
        </p>

        <ul
          v-else
          class="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card"
        >
          <li
            v-for="(row, idx) in displayedRows"
            :key="`${row.key}-${idx}`"
            class="transition-colors hover:bg-muted/25"
            :class="rowMissingRequired(row) ? 'bg-destructive/[0.04]' : ''"
            :data-aux-doc-error="rowMissingRequired(row) ? '1' : undefined"
          >
            <div class="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:gap-3">
              <!-- Estado + título -->
              <div class="flex min-w-0 flex-1 items-start gap-2.5">
                <div
                  class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full"
                  :class="{
                    'bg-green-500/15 text-green-700 dark:text-green-400': rowStatusIcon(row) === 'done',
                    'bg-amber-500/15 text-amber-800 dark:text-amber-300': rowStatusIcon(row) === 'missing',
                    'bg-muted text-muted-foreground': rowStatusIcon(row) === 'optional',
                  }"
                >
                  <Icon
                    :name="rowStatusIcon(row) === 'done' ? 'i-lucide-check' : rowStatusIcon(row) === 'missing' ? 'i-lucide-circle-alert' : 'i-lucide-circle-dashed'"
                    class="size-4"
                  />
                </div>
                <div class="min-w-0 flex-1 space-y-1">
                  <div class="flex flex-wrap items-center gap-1.5">
                    <Badge
                      variant="outline"
                      class="h-5 px-1.5 text-[10px] font-semibold uppercase"
                      :class="row.required
                        ? 'border-amber-600/40 text-amber-900 dark:text-amber-100'
                        : 'text-muted-foreground'"
                    >
                      {{ row.required ? 'Obligatorio' : 'Opcional' }}
                    </Badge>
                  </div>
                  <p
                    class="text-sm font-medium leading-snug text-foreground line-clamp-2"
                    :title="row.label"
                  >
                    {{ row.label }}
                  </p>
                  <p
                    v-if="displayFileNameForKey(row.key)"
                    class="truncate text-xs text-muted-foreground"
                    :title="displayFileNameForKey(row.key) ?? undefined"
                  >
                    <Icon name="i-lucide-paperclip" class="mr-1 inline size-3" />
                    {{ displayFileNameForKey(row.key) }}
                    <span v-if="pendingFileFor(row.key)">
                      ({{ formatFileSize(pendingFileFor(row.key)!.size) }})
                    </span>
                    <span v-if="pendingFileFor(row.key)" class="text-amber-700 dark:text-amber-400">
                      · pendiente de guardar
                    </span>
                  </p>
                  <p
                    v-else-if="rowMissingRequired(row)"
                    class="text-xs font-medium text-destructive"
                  >
                    Falta adjuntar el archivo
                  </p>
                </div>
              </div>

              <!-- Acciones -->
              <div class="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:pl-2">
                <input
                  :id="safeInputId(row.key, idx)"
                  type="file"
                  accept=".pdf,.zip,.png,.jpg,.jpeg,.gif,.webp,.bmp,application/pdf,application/zip,image/*"
                  class="sr-only"
                  :disabled="uploadBlockedForKey(row.key)"
                  @change="onFileInput(row.key, $event)"
                >
                <Button
                  v-if="canPreviewAuxiliaryDocument(row.key)"
                  type="button"
                  variant="outline"
                  size="sm"
                  class="h-8 gap-1.5"
                  @click="void openAuxiliaryDocumentInlinePreview(row.key)"
                >
                  <Icon name="i-lucide-eye" class="size-3.5" />
                  Ver
                </Button>
                <template v-if="showChecklistEmptyReadOnlyState(row.key) && !canPreviewAuxiliaryDocument(row.key)">
                  <span class="text-xs text-muted-foreground">Sin archivo</span>
                </template>
                <Button
                  v-else-if="!uploadBlockedForKey(row.key)"
                  type="button"
                  size="sm"
                  :variant="hasSatisfiedUploadForKey(row.key) ? 'outline' : 'default'"
                  class="h-8 gap-1.5"
                  @click="triggerAuxiliaryFileInput(row.key, idx)"
                >
                  <Icon :name="hasSatisfiedUploadForKey(row.key) ? 'i-lucide-refresh-cw' : 'i-lucide-upload'" class="size-3.5" />
                  {{ hasSatisfiedUploadForKey(row.key) ? 'Cambiar' : 'Adjuntar' }}
                </Button>
                <button
                  v-if="pendingFileFor(row.key) && !uploadBlockedForKey(row.key)"
                  type="button"
                  class="text-xs font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground"
                  @click.stop.prevent="clearPending(row.key)"
                >
                  Quitar
                </button>
                <button
                  v-if="allowsRemoveUploaded && docMetaForKey(row.key) && !pendingFileFor(row.key)"
                  type="button"
                  class="text-xs font-medium text-destructive underline underline-offset-2"
                  @click.stop.prevent="removeUploaded(row.key)"
                >
                  Eliminar
                </button>
              </div>
            </div>

            <div
              v-if="showDocumentReviewControls && documentReviewRowForKey(row.key)"
              class="flex flex-wrap items-center gap-3 border-t border-border bg-muted/20 px-3 py-2"
            >
              <div class="flex items-center gap-2">
                <Checkbox
                  :id="auxiliaryReviewDomId(row.key)"
                  :model-value="Boolean(documentReviewRowForKey(row.key)?.is_reviewed)"
                  @update:model-value="setDocumentReviewChecked(row.key, $event)"
                />
                <Label :for="auxiliaryReviewDomId(row.key)" class="cursor-pointer text-xs font-medium">
                  Revisado
                </Label>
              </div>
              <Input
                class="h-8 min-w-[12rem] flex-1 text-xs"
                :model-value="documentReviewRowForKey(row.key)?.review_comment ?? ''"
                placeholder="Nota de revisión (opcional)"
                @update:model-value="setDocumentReviewComment(row.key, $event)"
              />
            </div>
          </li>
        </ul>
      </template>
    </template>

    <DocumentInlinePreviewDialog
      v-model:open="inlinePreviewOpen"
      :title="inlinePreviewTitle"
      :loading="inlinePreviewLoading"
      :preview-url="inlinePreviewUrl"
      :preview-kind="inlinePreviewKind"
    />
  </div>
</template>
