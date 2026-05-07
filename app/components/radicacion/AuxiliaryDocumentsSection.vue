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
} from '~/constants/auxiliary-documents-checklist'
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
    }>
    /** Mismo catálogo que «Tipo de actividad económica» — alinea valores con las claves de `itemsByActivity`. */
    economicActivityOptions?: EconomicActivityCatalogOption[]
    disabled?: boolean
  }>(),
  {
    creditApplicationId: null,
    applicationDocuments: () => [],
    economicActivityOptions: () => [],
    disabled: false,
  },
)

const emit = defineEmits<{
  'update:applicant': [ApplicantForm]
}>()

const { $api } = useNuxtApp()

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

const docIdsByKey = computed((): Record<string, number | null> => {
  const raw = financial.value.auxiliaryDocuments
  if (!raw || typeof raw !== 'object') return {}
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
  if (id == null || id < 1) return null
  const aid = applicantIdForDocs()
  const list = props.applicationDocuments ?? []
  return list.find(d =>
    d.id === id && (aid == null || d.applicant_id == null || d.applicant_id === aid),
  ) ?? list.find(d => d.id === id) ?? null
}

function hasSatisfiedUploadForKey(key: string): boolean {
  const id = docIdsByKey.value[key]
  if (typeof id === 'number' && id >= 1) {
    return true
  }
  const pending = pendingFileFor(key)
  if (pending instanceof File) {
    return true
  }
  if (docMetaForKey(key)) {
    return true
  }
  return false
}

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

function onAuxiliaryDragOver(e: DragEvent): void {
  e.preventDefault()
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'copy'
  }
}

function onAuxiliaryDrop(key: string, e: DragEvent): void {
  e.preventDefault()
  const file = e.dataTransfer?.files?.[0]
  pickAuxiliaryFile(key, file)
}

function clearPending(key: string): void {
  patchPendingFiles({ [key]: undefined })
}

async function removeUploaded(key: string): Promise<void> {
  const id = docIdsByKey.value[key]
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

function pendingFileFor(key: string): File | undefined {
  const f = props.applicant.auxiliaryDocumentFiles?.[key]
  return f instanceof File ? f : undefined
}

/**
 * Devuelve true si puede avanzar de paso; si faltan obligatorios, activa resaltado danger y false.
 */
function validateRequiredAuxiliaryUploads(): boolean {
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
    toast.error('Adjunta los documentos obligatorios del checklist antes de continuar.')
    void nextTick(() => {
      document.querySelector('[data-aux-doc-error="1"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
    return false
  }
  highlightMissingRequired.value = false
  return true
}

defineExpose({
  validateRequiredAuxiliaryUploads,
})
</script>

<template>
  <div id="radicacion-auxiliary-documents" class="space-y-4">
    <div v-if="loadingConfig" class="text-sm text-muted-foreground">
      Cargando listado de documentos…
    </div>
    <template v-else>
      <p v-if="!activityType" class="text-sm text-muted-foreground">
        Selecciona el tipo de actividad económica en la sección anterior de este formulario para mostrar aquí los
        documentos solicitados.
      </p>
      <p v-else-if="checklistRows.length === 0" class="text-sm text-muted-foreground">
        No hay documentos parametrizados para «{{ activityType }}». Revise Parametrización → Radicación → Documentos (módulo auxiliar).
      </p>
      <ul v-else class="list-none space-y-4 p-0">
        <li
          v-for="(row, idx) in checklistRows"
          :key="`${row.key}-${idx}`"
          class="overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm transition-[box-shadow,border-color]"
          :class="rowMissingRequired(row)
            ? 'border-destructive ring-2 ring-destructive/25'
            : 'border-border'"
          :data-aux-doc-error="rowMissingRequired(row) ? '1' : undefined"
        >
          <!-- Encabezado: requisito + nombre del documento (sin columna vacía lateral) -->
          <div
            class="border-b border-border px-4 py-3 sm:px-5"
            :class="rowMissingRequired(row) ? 'bg-destructive/[0.06]' : 'bg-muted/40'"
          >
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
                Checklist
              </span>
            </div>
            <p class="mt-2.5 text-sm font-medium leading-snug text-foreground">
              {{ row.label }}
            </p>
            <p
              v-if="rowMissingRequired(row)"
              class="mt-2 flex items-start gap-1.5 text-xs font-medium text-destructive"
            >
              <Icon name="i-lucide-alert-circle" class="mt-0.5 size-4 shrink-0" />
              Falta adjuntar el archivo. Use el área de abajo.
            </p>
          </div>

          <!-- Zona de carga a todo ancho -->
          <div class="p-4 sm:p-5">
            <input
              :id="safeInputId(row.key, idx)"
              type="file"
              accept=".pdf,.zip,.png,.jpg,.jpeg,.gif,.webp,.bmp,application/pdf,application/zip,image/*"
              class="sr-only"
              :disabled="disabled"
              @change="onFileInput(row.key, $event)"
            >
            <label
              :for="safeInputId(row.key, idx)"
              class="flex min-h-[6.5rem] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-4 text-center transition-colors focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
              :class="[
                disabled ? 'cursor-not-allowed opacity-60 pointer-events-none' : 'hover:border-primary/45 hover:bg-muted/30',
                rowMissingRequired(row)
                  ? 'border-destructive/50 bg-destructive/[0.04]'
                  : 'border-muted-foreground/25 bg-muted/20',
              ]"
              @dragover="onAuxiliaryDragOver"
              @drop="onAuxiliaryDrop(row.key, $event)"
            >
              <template v-if="pendingFileFor(row.key)">
                <Icon name="i-lucide-file-check" class="size-7 text-green-600 dark:text-green-500" />
                <span class="max-w-full truncate text-sm font-medium text-foreground">
                  {{ pendingFileFor(row.key)!.name }}
                </span>
                <span class="text-xs text-muted-foreground">
                  {{ formatFileSize(pendingFileFor(row.key)!.size) }}
                </span>
                <span v-if="!disabled" class="text-xs text-amber-700 dark:text-amber-400">
                  Se subirá al guardar la solicitud
                </span>
                <button
                  v-if="!disabled"
                  type="button"
                  class="text-xs font-medium text-primary underline underline-offset-2"
                  @click.prevent="clearPending(row.key)"
                >
                  Quitar selección
                </button>
              </template>
              <template v-else-if="docMetaForKey(row.key)">
                <Icon name="i-lucide-file-text" class="size-7 text-primary" />
                <a
                  :href="docMetaForKey(row.key)!.download_url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="max-w-full truncate text-sm font-medium text-primary underline underline-offset-2"
                  @click.stop
                >
                  {{ docMetaForKey(row.key)?.original_name || 'Ver archivo' }}
                </a>
                <span class="text-xs text-muted-foreground">Archivo en la solicitud</span>
                <button
                  v-if="!disabled && creditApplicationId"
                  type="button"
                  class="text-xs font-medium text-destructive underline underline-offset-2"
                  @click.prevent="removeUploaded(row.key)"
                >
                  Eliminar
                </button>
              </template>
              <template v-else>
                <div class="flex size-10 items-center justify-center rounded-full bg-muted">
                  <Icon
                    name="i-lucide-upload"
                    class="size-5 shrink-0"
                    :class="rowMissingRequired(row) ? 'text-destructive' : 'text-muted-foreground'"
                  />
                </div>
                <span
                  class="max-w-sm text-sm font-medium leading-snug"
                  :class="rowMissingRequired(row) ? 'text-destructive' : 'text-foreground'"
                >
                  Arrastre el archivo aquí o haga clic para elegir
                </span>
                <span class="text-xs text-muted-foreground">PDF, ZIP o imagen · máximo 10 MB</span>
              </template>
            </label>
          </div>
        </li>
      </ul>
    </template>
  </div>
</template>
