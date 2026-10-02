<script setup lang="ts">
import { toast } from 'vue-sonner'
import {
  ARCHIVAL_DISPOSITION_ACT_STATUS_LABELS,
  ARCHIVAL_PHASE_LABELS,
} from '~/constants/archival-lifecycle'
import type {
  ArchivalTransferActRow,
  ArchivalTransferDocumentSelectionRow,
} from '~/composables/useArchivalLifecycleApi'
import { messageFromFetchError } from '~/utils/http-error-message'
import { canPreviewDocumentInline } from '~/utils/document-preview'
import DocumentInlinePreviewDialog from '~/components/radicacion/DocumentInlinePreviewDialog.vue'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: ['trd_ciclo_vida_ver', 'trd_tablas_ver', 'trd_catalogo_ver'],
})

const route = useRoute()
const router = useRouter()
const api = useArchivalLifecycleApi()

const actId = computed(() => Number(route.params.id))
const loading = ref(true)
const act = ref<ArchivalTransferActRow | null>(null)
const expandedFileIds = ref<Record<number, boolean>>({})

const {
  page: inventoryPage,
  pageCount: inventoryPageCount,
  pageItems: pagedInventoryFiles,
  rangeLabel: inventoryRangeLabel,
  goToPreviousPage: goToPreviousInventoryPage,
  goToNextPage: goToNextInventoryPage,
  resetPage: resetInventoryPage,
} = useClientPagination(() => act.value?.files ?? [])

watch(actId, () => {
  expandedFileIds.value = {}
  resetInventoryPage()
})

function isInventoryFileExpanded(fileId: number): boolean {
  return expandedFileIds.value[fileId] === true
}

function setInventoryFileExpanded(fileId: number, open: boolean): void {
  expandedFileIds.value = {
    ...expandedFileIds.value,
    [fileId]: open,
  }
}

const missingSelectionOnDraft = computed(() => {
  if (act.value?.status !== 'draft') {
    return false
  }

  return (act.value.files ?? []).some(file =>
    (file.documents ?? []).some(document =>
      Boolean(document.requires_selection) && !document.selection_decision,
    ),
  )
})

const statusLabel = computed(() => {
  if (!act.value) {
    return ''
  }

  return ARCHIVAL_DISPOSITION_ACT_STATUS_LABELS[act.value.status] ?? act.value.status
})

const nextStep = computed(() => {
  const current = act.value
  if (!current) {
    return null
  }

  if (current.status === 'cancelled') {
    return {
      title: 'Acta anulada',
      body: 'Este borrador fue anulado. No se puede aprobar ni ejecutar. Si necesita transferir, cree una acta nueva.',
    }
  }

  if (current.status === 'draft') {
    return {
      title: 'Siguiente paso: aprobar el acta',
      body: `Todavía es un borrador: los expedientes siguen en ${current.from_phase_label ?? 'archivo de gestión'}. Al aprobar se genera el PDF, se radica en la TRD del área y queda listo para firma. La transferencia física/lógica ocurre al ejecutar.`,
    }
  }

  if (current.status === 'approved') {
    return {
      title: 'Siguiente paso: ejecutar la transferencia',
      body: `El PDF ya es el instrumento de entrega y recibo. Al ejecutar, los ${current.files?.length ?? 0} expediente(s) pasan de ${current.from_phase_label ?? 'origen'} a ${current.to_phase_label ?? 'destino'}.`,
    }
  }

  return {
    title: 'Transferencia ejecutada',
    body: `Los expedientes de este inventario ya deben figurar en ${current.to_phase_label ?? 'el archivo de destino'}. El PDF no se publica en biblioteca institucional.`,
  }
})

function formatDate(value?: string | null): string {
  if (!value) {
    return '—'
  }

  const datePart = value.slice(0, 10)
  const parsed = new Date(`${datePart}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toLocaleDateString('es-CO')
}

function formatDateTime(value?: string | null): string {
  if (!value) {
    return '—'
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toLocaleString('es-CO', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

function phaseLabel(phase?: string | null): string {
  if (!phase) {
    return '—'
  }

  return ARCHIVAL_PHASE_LABELS[phase] ?? phase
}

async function load() {
  loading.value = true
  try {
    act.value = await api.fetchTransferAct(actId.value)
  }
  catch {
    toast.error('No se pudo cargar el acta')
    act.value = null
  }
  finally {
    loading.value = false
  }
}

async function approve() {
  try {
    const res = await api.approveTransferAct(actId.value)
    act.value = res.data
    toast.success(res.message ?? 'Aprobada')
  }
  catch (error: unknown) {
    toast.error(messageFromFetchError(error, 'No se pudo aprobar'))
  }
}

const {
  open: actFilePreviewOpen,
  title: actFilePreviewTitle,
  previewUrl: actFilePreviewUrl,
  previewKind: actFilePreviewKind,
  presentBlob: presentActFileBlob,
} = useInlineFilePreview()
const { fetchDocumentViewBlob } = useArchivalDocumentBlob()
const viewingPdf = ref(false)
const viewingDocumentId = ref<number | null>(null)
const downloadingDocumentId = ref<number | null>(null)

function actDocumentFileName(row: ArchivalTransferDocumentSelectionRow): string {
  return row.original_name?.trim() || row.title || 'documento'
}

function actDocumentCanPreview(row: ArchivalTransferDocumentSelectionRow): boolean {
  return canPreviewDocumentInline(actDocumentFileName(row), row.mime_type ?? '')
}

function triggerFileDownload(blob: Blob, filename: string): void {
  if (import.meta.server) {
    return
  }

  const objectUrl = URL.createObjectURL(blob)
  const anchor = window.document.createElement('a')
  anchor.href = objectUrl
  anchor.download = filename
  window.document.body.appendChild(anchor)
  anchor.click()
  window.document.body.removeChild(anchor)
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000)
}

async function viewActFileDocument(fileId: number, row: ArchivalTransferDocumentSelectionRow): Promise<void> {
  viewingDocumentId.value = row.id
  try {
    const blob = await fetchDocumentViewBlob(fileId, row.id)
    presentActFileBlob(blob, actDocumentFileName(row), row.mime_type)
  }
  catch (error: unknown) {
    toast.error(error instanceof Error ? error.message : 'No se pudo abrir el documento')
  }
  finally {
    viewingDocumentId.value = null
  }
}

async function downloadActFileDocument(fileId: number, row: ArchivalTransferDocumentSelectionRow): Promise<void> {
  downloadingDocumentId.value = row.id
  try {
    const blob = await fetchDocumentViewBlob(fileId, row.id)
    triggerFileDownload(blob, actDocumentFileName(row))
  }
  catch (error: unknown) {
    toast.error(error instanceof Error ? error.message : 'No se pudo descargar el documento')
  }
  finally {
    downloadingDocumentId.value = null
  }
}

async function viewPdf() {
  if (!act.value) {
    return
  }

  viewingPdf.value = true
  try {
    const blob = await api.fetchTransferActPdfBlob(act.value.id)
    presentActFileBlob(blob, `${act.value.act_code}.pdf`, 'application/pdf')
    act.value = await api.fetchTransferAct(actId.value)
  }
  catch (error: unknown) {
    toast.error(messageFromFetchError(error, 'No se pudo abrir el PDF'))
  }
  finally {
    viewingPdf.value = false
  }
}

async function execute() {
  try {
    const res = await api.executeTransferAct(actId.value)
    act.value = res.data
    toast.success(res.message ?? 'Ejecutada')
  }
  catch (error: unknown) {
    toast.error(messageFromFetchError(error, 'No se pudo ejecutar'))
  }
}

const pendingCancel = ref(false)
const pendingDelete = ref(false)
const acting = ref(false)

async function confirmCancel() {
  acting.value = true
  try {
    const res = await api.cancelTransferAct(actId.value)
    act.value = res.data
    pendingCancel.value = false
    toast.success(res.message ?? 'Acta anulada')
  }
  catch (error: unknown) {
    toast.error(messageFromFetchError(error, 'No se pudo anular el borrador'))
  }
  finally {
    acting.value = false
  }
}

async function confirmDelete() {
  acting.value = true
  try {
    const res = await api.deleteTransferAct(actId.value)
    pendingDelete.value = false
    toast.success(res.message ?? 'Borrador eliminado')
    await router.push('/settings/archival/transfers')
  }
  catch (error: unknown) {
    toast.error(messageFromFetchError(error, 'No se pudo eliminar el borrador'))
  }
  finally {
    acting.value = false
  }
}

onMounted(load)
</script>

<template>
  <SettingsLayout :wide="true" hide-intro>
    <div class="flex w-full flex-col gap-4">
      <Button variant="ghost" size="sm" class="-ml-2 w-fit" @click="router.push('/settings/archival/transfers')">
        <Icon name="i-lucide-arrow-left" class="mr-1 h-4 w-4" />
        Actas
      </Button>

      <div v-if="loading" class="flex items-center gap-2 py-10 text-sm text-muted-foreground">
        <Icon name="i-lucide-loader-2" class="h-4 w-4 animate-spin" />
        Cargando acta…
      </div>

      <p v-else-if="!act" class="text-sm text-muted-foreground">
        No se encontró el acta o no tiene permiso para consultarla.
      </p>

      <div v-else class="space-y-4">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="space-y-2">
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="text-2xl font-bold tracking-tight">
                {{ act.act_code }}
              </h2>
              <Badge variant="secondary">
                {{ statusLabel }}
              </Badge>
            </div>
            <p class="max-w-3xl text-sm leading-relaxed text-muted-foreground">
              {{ act.transfer_kind_label }}
              de
              <span class="font-medium text-foreground">{{ act.org_unit?.name ?? 'área sin asignar' }}</span>
              <template v-if="act.org_unit?.code">
                ({{ act.org_unit.code }})
              </template>
              · {{ act.files?.length ?? act.files_count ?? 0 }} expediente(s) en el inventario.
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <Button
              variant="outline"
              :disabled="viewingPdf"
              @click="viewPdf"
            >
              <Icon v-if="viewingPdf" name="i-lucide-loader-2" class="mr-2 h-4 w-4 animate-spin" />
              Ver PDF
            </Button>
            <PermissionGate v-if="act.status === 'draft'" permission="trd_transferencias_ejecutar">
              <Button variant="outline" @click="router.push(`/settings/archival/transfers/create?id=${act.id}`)">
                Editar
              </Button>
              <Button variant="outline" @click="pendingCancel = true">
                Anular
              </Button>
              <Button variant="destructive" @click="pendingDelete = true">
                Eliminar
              </Button>
              <Button
                variant="secondary"
                :disabled="missingSelectionOnDraft"
                @click="approve"
              >
                Aprobar acta
              </Button>
            </PermissionGate>
            <PermissionGate v-if="act.status === 'approved'" permission="trd_transferencias_ejecutar">
              <Button @click="execute">
                Ejecutar transferencia
              </Button>
            </PermissionGate>
          </div>
        </div>

        <div
          v-if="nextStep"
          class="rounded-lg border bg-muted/40 px-4 py-3"
        >
          <p class="text-sm font-medium">
            {{ nextStep.title }}
          </p>
          <p class="mt-1 text-sm leading-relaxed text-muted-foreground">
            {{ nextStep.body }}
          </p>
          <p
            v-if="missingSelectionOnDraft"
            class="mt-2 text-sm text-rose-700 dark:text-rose-300"
          >
            Hay documentos con disposición TRD de selección sin conservación o eliminación. Ábralos en el expediente (Metadatos del documento) y registre la decisión ahí. El acta no elige documentos.
          </p>
        </div>

        <div class="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle class="text-base">
                Datos del acta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl class="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt class="text-xs text-muted-foreground">
                    Fecha del acta
                  </dt>
                  <dd class="mt-0.5 font-medium">
                    {{ formatDate(act.act_date) }}
                  </dd>
                </div>
                <div>
                  <dt class="text-xs text-muted-foreground">
                    Elaborada por
                  </dt>
                  <dd class="mt-0.5 font-medium">
                    {{ act.created_by?.name ?? '—' }}
                  </dd>
                </div>
                <div>
                  <dt class="text-xs text-muted-foreground">
                    Origen
                  </dt>
                  <dd class="mt-0.5 font-medium">
                    {{ act.from_phase_label ?? phaseLabel(act.from_phase) }}
                  </dd>
                </div>
                <div>
                  <dt class="text-xs text-muted-foreground">
                    Destino
                  </dt>
                  <dd class="mt-0.5 font-medium">
                    {{ act.to_phase_label ?? phaseLabel(act.to_phase) }}
                  </dd>
                </div>
                <div>
                  <dt class="text-xs text-muted-foreground">
                    Aprobada por
                  </dt>
                  <dd class="mt-0.5 font-medium">
                    {{ act.approved_by?.name ?? 'Pendiente' }}
                  </dd>
                </div>
                <div>
                  <dt class="text-xs text-muted-foreground">
                    Fecha de aprobación
                  </dt>
                  <dd class="mt-0.5 font-medium">
                    {{ formatDateTime(act.approved_at) }}
                  </dd>
                </div>
                <div>
                  <dt class="text-xs text-muted-foreground">
                    Ejecutada
                  </dt>
                  <dd class="mt-0.5 font-medium">
                    {{ formatDateTime(act.executed_at) }}
                  </dd>
                </div>
                <div>
                  <dt class="text-xs text-muted-foreground">
                    PDF / biblioteca
                  </dt>
                  <dd class="mt-0.5 font-medium">
                    {{ act.has_pdf ? 'PDF generado' : 'Aún no hay PDF' }}
                    · {{ act.published_to_library ? 'publicado en biblioteca' : 'no se publica en biblioteca' }}
                  </dd>
                </div>
              </dl>
              <p v-if="act.description" class="mt-4 whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-sm">
                {{ act.description }}
              </p>
              <p v-else class="mt-4 text-sm text-muted-foreground">
                Sin descripción adicional en el acta.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle class="text-base">
                Dónde queda el PDF del acta
              </CardTitle>
              <CardDescription>
                Clasificación TRD del instrumento de control, no de los expedientes transferidos.
              </CardDescription>
            </CardHeader>
            <CardContent class="space-y-3 text-sm">
              <template v-if="act.doc_document_type">
                <div>
                  <p class="text-xs text-muted-foreground">
                    Serie
                  </p>
                  <p class="font-medium">
                    {{ act.doc_series?.code }} — {{ act.doc_series?.name }}
                  </p>
                </div>
                <div>
                  <p class="text-xs text-muted-foreground">
                    Subserie
                  </p>
                  <p class="font-medium">
                    {{ act.doc_subseries?.code }} — {{ act.doc_subseries?.name }}
                  </p>
                </div>
                <div>
                  <p class="text-xs text-muted-foreground">
                    Tipo documental
                  </p>
                  <p class="font-medium">
                    {{ act.doc_document_type.code }} — {{ act.doc_document_type.name }}
                  </p>
                </div>
                <p v-if="act.filed_file" class="text-muted-foreground">
                  Radicado en el expediente
                  <NuxtLink class="font-mono text-xs underline" :to="`/expedientes/${act.filed_file.id}`">
                    {{ act.filed_file.file_number }}
                  </NuxtLink>
                  — {{ act.filed_file.title }}
                </p>
                <p v-else class="text-muted-foreground">
                  El PDF se radica en esta clasificación al aprobar el acta.
                </p>
              </template>
              <p v-else class="text-muted-foreground">
                Esta acta no tiene clasificación TRD capturada. Configure la ubicación del área en
                <NuxtLink class="underline" to="/settings/archival/transfers/trd-filing">
                  Ubicación TRD del acta
                </NuxtLink>.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle class="text-base">
              Inventario de expedientes ({{ act.files?.length ?? 0 }})
            </CardTitle>
            <CardDescription>
              Expedientes del lote. Los documentos se ven al expandir cada uno. La TRD de selección se resuelve en el expediente, no eligiendo documentos en esta acta.
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-3">
            <div v-if="act.files?.length" class="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>{{ inventoryRangeLabel }}</span>
              <div v-if="inventoryPageCount > 1" class="flex gap-1">
                <Button type="button" size="sm" variant="outline" class="h-7 px-2" :disabled="inventoryPage <= 1" @click="goToPreviousInventoryPage">
                  Anterior
                </Button>
                <Button type="button" size="sm" variant="outline" class="h-7 px-2" :disabled="inventoryPage >= inventoryPageCount" @click="goToNextInventoryPage">
                  Siguiente
                </Button>
              </div>
            </div>
            <Collapsible
              v-for="file in pagedInventoryFiles"
              :key="file.id"
              :open="isInventoryFileExpanded(file.id)"
              class="rounded-lg border"
              @update:open="setInventoryFileExpanded(file.id, $event)"
            >
              <div class="flex items-start gap-2 p-3">
                <CollapsibleTrigger as-child>
                  <Button variant="ghost" size="sm" type="button" class="mt-0.5 h-8 w-8 shrink-0 px-0">
                    <Icon
                      :name="isInventoryFileExpanded(file.id) ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
                      class="size-4"
                    />
                    <span class="sr-only">
                      {{ isInventoryFileExpanded(file.id) ? 'Contraer' : 'Expandir' }}
                    </span>
                  </Button>
                </CollapsibleTrigger>
                <div class="min-w-0 flex-1 space-y-1">
                  <NuxtLink class="w-fit font-mono text-xs underline" :to="`/expedientes/${file.id}`">
                    {{ file.file_number }}
                  </NuxtLink>
                  <p class="text-sm font-medium leading-snug">
                    {{ file.title }}
                  </p>
                  <p class="text-xs text-muted-foreground">
                    {{ file.file_type?.name ?? 'Tipo no indicado' }}
                    · {{ phaseLabel(file.archival_phase) }}
                    · {{ file.documents_count ?? file.documents?.length ?? 0 }} documento(s)
                  </p>
                </div>
              </div>
              <CollapsibleContent>
                <div class="space-y-3 border-t px-3 pb-3 pt-3">
                  <dl class="grid gap-2 text-xs sm:grid-cols-3">
                    <div>
                      <dt class="text-muted-foreground">
                        Cierre
                      </dt>
                      <dd class="mt-0.5">
                        {{ formatDate(file.closed_at) }}
                      </dd>
                    </div>
                    <div>
                      <dt class="text-muted-foreground">
                        Fin gestión
                      </dt>
                      <dd class="mt-0.5">
                        {{ formatDate(file.archival_management_ends_at) }}
                      </dd>
                    </div>
                    <div>
                      <dt class="text-muted-foreground">
                        Fin central
                      </dt>
                      <dd class="mt-0.5">
                        {{ formatDate(file.archival_central_ends_at) }}
                      </dd>
                    </div>
                  </dl>
                  <div v-if="file.documents?.length" class="space-y-2">
                    <p class="text-xs font-medium text-muted-foreground">
                      Documentos
                    </p>
                    <div
                      v-for="fileDocument in file.documents"
                      :key="fileDocument.id"
                      class="flex items-center gap-3 rounded-md border bg-background px-3 py-2"
                    >
                      <Icon name="i-lucide-file" class="size-4 shrink-0 text-muted-foreground" />
                      <div class="min-w-0 flex-1">
                        <p class="truncate text-sm font-medium text-foreground">
                          {{ fileDocument.title }}
                        </p>
                        <p class="truncate text-xs text-muted-foreground">
                          <span v-if="fileDocument.original_name && fileDocument.original_name !== fileDocument.title">
                            {{ fileDocument.original_name }}
                            ·
                          </span>
                          <span v-if="fileDocument.final_disposition_label">
                            {{ fileDocument.final_disposition_label }}
                          </span>
                          <span v-if="fileDocument.selection_decision_label" class="font-medium text-foreground">
                            · {{ fileDocument.selection_decision_label }}
                          </span>
                          <span v-else-if="fileDocument.requires_selection" class="text-amber-700 dark:text-amber-300">
                            · Pendiente en el expediente
                          </span>
                        </p>
                      </div>
                      <div class="flex shrink-0 items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          type="button"
                          class="h-8 gap-1.5 px-2 text-xs"
                          :disabled="viewingDocumentId === fileDocument.id"
                          @click="viewActFileDocument(file.id, fileDocument)"
                        >
                          <Icon
                            :name="viewingDocumentId === fileDocument.id
                              ? 'i-lucide-loader-2'
                              : (actDocumentCanPreview(fileDocument) ? 'i-lucide-eye' : 'i-lucide-download')"
                            class="size-3.5"
                            :class="{ 'animate-spin': viewingDocumentId === fileDocument.id }"
                          />
                          {{ actDocumentCanPreview(fileDocument) ? 'Ver' : 'Descargar' }}
                        </Button>
                        <Button
                          v-if="actDocumentCanPreview(fileDocument)"
                          variant="ghost"
                          size="sm"
                          type="button"
                          class="h-8 px-2 text-xs"
                          :disabled="downloadingDocumentId === fileDocument.id"
                          @click="downloadActFileDocument(file.id, fileDocument)"
                        >
                          Descargar
                        </Button>
                      </div>
                    </div>
                  </div>
                  <p v-else class="text-sm text-muted-foreground">
                    Sin documentos en el expediente.
                  </p>
                </div>
              </CollapsibleContent>
            </Collapsible>
            <p v-if="!act.files?.length" class="text-sm text-muted-foreground">
              Sin expedientes asociados.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
    <AlertDialog :open="pendingCancel" @update:open="pendingCancel = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Anular borrador
          </AlertDialogTitle>
          <AlertDialogDescription>
            El acta quedará anulada y no se podrá aprobar ni ejecutar. El código se conserva en el historial.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="acting">
            Cancelar
          </AlertDialogCancel>
          <Button :disabled="acting" @click="confirmCancel">
            {{ acting ? 'Anulando…' : 'Anular acta' }}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog :open="pendingDelete" @update:open="pendingDelete = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Eliminar borrador
          </AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción borra el acta. El código quedará libre para usarlo de nuevo.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="acting">
            Cancelar
          </AlertDialogCancel>
          <Button variant="destructive" :disabled="acting" @click="confirmDelete">
            {{ acting ? 'Eliminando…' : 'Eliminar' }}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <DocumentInlinePreviewDialog
      v-model:open="actFilePreviewOpen"
      :title="actFilePreviewTitle"
      :preview-url="actFilePreviewUrl"
      :preview-kind="actFilePreviewKind"
    />
  </SettingsLayout>
</template>
