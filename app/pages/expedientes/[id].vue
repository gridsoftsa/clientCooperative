<script setup lang="ts">
import { toast } from 'vue-sonner'
import InstitutionalLibraryPublishDialog from '~/components/archival/InstitutionalLibraryPublishDialog.vue'
import type { ArchivalMetadataFieldRow } from '~/composables/useArchivalMetadataApi'
import type {
  ArchivalFile,
  ArchivalFileAlert,
  ArchivalFileClosureReadiness,
  ArchivalFileRequiredDocumentsEvaluation,
  ArchivalFileTreeNode,
  ArchivalPhaseTarget,
} from '~/types/archival-file'
import { ARCHIVAL_FILE_STATUS_LABELS, ARCHIVAL_PHASE_TARGET_LABELS } from '~/types/archival-file'
import {
  archivalFileStatusActions,
  archivalFileStatusBadgeVariant,
  archivalFileStatusBanner,
  isArchivalFileEditable,
  isArchivalFileOperational,
  type ArchivalFileStatusActionOption,
} from '~/utils/archival-file-status'
import { messageFromFetchError } from '~/utils/http-error-message'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'expedientes_ver',
})

const route = useRoute()
const archivalApi = useArchivalFileApi()
const { hasPermission } = usePermissions()

const fileId = computed(() => Number(route.params.id))
const loading = ref(true)
const file = ref<ArchivalFile | null>(null)
const tree = ref<ArchivalFileTreeNode | null>(null)
const required = ref<ArchivalFileRequiredDocumentsEvaluation | null>(null)
const closureReadiness = ref<ArchivalFileClosureReadiness | null>(null)
const alerts = ref<ArchivalFileAlert[]>([])
const consolidationMeta = ref({ allow_reconsolidation: false, include_qr_code: false })
const transferring = ref(false)
const dispositionReason = ref('')

const referenceDialogOpen = ref(false)
const versionDialogOpen = ref(false)
const publishDialogOpen = ref(false)
const transferDialogOpen = ref(false)
const statusTransitionDialogOpen = ref(false)
const completeConfirmOpen = ref(false)
const completing = ref(false)
const selectedStatusAction = ref<ArchivalFileStatusActionOption | null>(null)
const selectedTreeNode = ref<ArchivalFileTreeNode | null>(null)
const transferAlertType = ref<string | null>(null)
const transferSuggestedPhase = ref<ArchivalPhaseTarget | null>(null)
const workspaceTab = ref<'resumen' | 'gestion' | 'metadatos' | 'adjuntar' | 'auditoria'>('resumen')
const treeQuery = ref('')

const gestionAttentionCount = computed(() => {
  let count = 0
  if (required.value && !required.value.complete) {
    count += 1
  }
  if (closureReadiness.value && !closureReadiness.value.ready && canClose.value) {
    count += 1
  }
  count += alerts.value.length
  return count
})

const canAttachDocument = computed(() =>
  (hasPermission('expedientes_editar') || hasPermission('expedientes_documentos_adjuntar'))
  && isArchivalFileOperational(file.value?.status, Boolean(file.value?.is_frozen)),
)
const canManageDocuments = computed(() =>
  (hasPermission('expedientes_editar') || hasPermission('expedientes_documentos_adjuntar'))
  && isArchivalFileOperational(file.value?.status, Boolean(file.value?.is_frozen)),
)
const canDownloadDocuments = computed(() => hasPermission('expedientes_documentos_descargar'))
const canViewDocuments = computed(() =>
  hasPermission('expedientes_ver')
  || hasPermission('expedientes_documentos_descargar')
  || hasPermission('expedientes_area_ver'),
)
const canPublishToLibrary = computed(() => hasPermission('expedientes_biblioteca_publicar'))
const canClose = computed(() =>
  hasPermission('expedientes_cerrar')
  && isArchivalFileEditable(file.value?.status)
  && !file.value?.is_frozen,
)

const statusBanner = computed(() =>
  file.value ? archivalFileStatusBanner(file.value.status) : null,
)

const availableStatusActions = computed(() => {
  if (!file.value) {
    return []
  }

  return archivalFileStatusActions(file.value.status).filter(action =>
    hasPermission(action.permission),
  )
})
const canConsolidate = computed(() =>
  hasPermission('expedientes_consolidar')
  && file.value?.status === 'closed'
  && (!file.value?.consolidated_path || consolidationMeta.value?.allow_reconsolidation),
)
const canReconsolidate = computed(() =>
  hasPermission('expedientes_consolidar')
  && file.value?.status === 'closed'
  && !!file.value?.consolidated_path
  && consolidationMeta.value.allow_reconsolidation,
)
const canTransferToDisposed = computed(() =>
  hasPermission('expedientes_transferir')
  && file.value?.eligible_next_phase === 'disposed'
  && file.value?.can_transfer_to_next_phase === true,
)
const canDownloadConsolidated = computed(() =>
  hasPermission('expedientes_documentos_descargar') && !!file.value?.consolidated_path,
)
const canTransfer = computed(() =>
  hasPermission('expedientes_transferir')
  && file.value?.eligible_next_phase != null,
)

const archivalPhaseLabel = computed(() => {
  const phase = file.value?.archival_phase
  if (phase && phase in ARCHIVAL_PHASE_TARGET_LABELS) {
    return ARCHIVAL_PHASE_TARGET_LABELS[phase as ArchivalPhaseTarget]
  }

  if (file.value?.status === 'closed') {
    return ARCHIVAL_PHASE_TARGET_LABELS.management
  }

  return '—'
})

const eligibleNextPhaseLabel = computed(() => {
  const phase = file.value?.eligible_next_phase
  if (!phase) {
    return null
  }

  return ARCHIVAL_PHASE_TARGET_LABELS[phase]
})
const consolidating = ref(false)

function archivalTreeNodeMatchesQuery(node: ArchivalFileTreeNode, query: string): boolean {
  const haystack = [
    node.name,
    node.file_number,
    node.doc_document_type_name,
    node.doc_series_code,
    node.trd?.path,
    node.trd?.series?.code,
    node.trd?.series?.name,
    node.trd?.subseries?.code,
    node.trd?.subseries?.name,
    node.trd?.document_type?.code,
    node.trd?.document_type?.name,
    node.source_filing?.filing_number,
    JSON.stringify(node.metadata_values ?? {}),
    JSON.stringify(node.source_filing?.metadata_values ?? {}),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return haystack.includes(query)
}

function filterArchivalTree(node: ArchivalFileTreeNode, query: string): ArchivalFileTreeNode | null {
  if (!query) {
    return node
  }

  const children = (node.children ?? [])
    .map(child => filterArchivalTree(child, query))
    .filter((child): child is ArchivalFileTreeNode => child != null)

  if (archivalTreeNodeMatchesQuery(node, query) || children.length > 0) {
    return { ...node, children }
  }

  return null
}

const visibleTree = computed(() => {
  if (!tree.value) {
    return null
  }

  const query = treeQuery.value.trim().toLowerCase()
  if (!query) {
    return tree.value
  }

  return filterArchivalTree(tree.value, query)
})

const expedienteMetadataFields = computed<ArchivalMetadataFieldRow[]>(() => {
  const fields = file.value?.metadata_schema?.active_fields ?? []

  return fields.map((field, index) => ({
    code: field.code,
    name: field.name,
    data_type: field.data_type,
    is_required: field.is_required,
    sort_order: index,
    is_active: true,
    is_reusable: field.is_reusable,
    is_variable: field.is_variable,
    is_ocr_extractable: false,
    is_autocompletable: field.is_autocompletable,
    is_searchable: false,
    is_reportable: false,
    options: field.options ?? null,
  }))
})

async function handleConsolidate() {
  if (!file.value)
    return

  consolidating.value = true

  try {
    const res = await archivalApi.consolidateFile(file.value.id)
    toast.success(res.message)
    await loadAll()
  }
  catch {
    toast.error('No se pudo consolidar el expediente.')
  }
  finally {
    consolidating.value = false
  }
}

async function handleReconsolidate() {
  if (!file.value)
    return

  consolidating.value = true

  try {
    const res = await archivalApi.consolidateFile(file.value.id)
    toast.success(res.message)
    await loadAll()
  }
  catch {
    toast.error('No se pudo reconsolidar el expediente.')
  }
  finally {
    consolidating.value = false
  }
}

async function handleDisposition() {
  if (!file.value)
    return

  transferring.value = true

  try {
    const res = await archivalApi.transferFile(file.value.id, {
      target_phase: 'disposed',
      reason: dispositionReason.value || undefined,
    })
    toast.success(res.message)
    dispositionReason.value = ''
    await loadAll()
  }
  catch {
    toast.error('No se pudo registrar la disposición final.')
  }
  finally {
    transferring.value = false
  }
}

async function loadAll() {
  loading.value = true

  try {
    const [fileData, treeData, requiredData, readinessData, alertsData, metaData] = await Promise.all([
      archivalApi.fetchFile(fileId.value),
      archivalApi.fetchTree(fileId.value),
      archivalApi.fetchRequiredDocuments(fileId.value),
      archivalApi.fetchClosureReadiness(fileId.value),
      archivalApi.fetchFileAlerts(fileId.value),
      archivalApi.fetchConsolidationMeta(),
    ])
    file.value = fileData
    tree.value = treeData
    required.value = requiredData
    closureReadiness.value = readinessData
    alerts.value = alertsData
    consolidationMeta.value = metaData
  }
  catch {
    toast.error('No se pudo cargar el expediente.')
  }
  finally {
    loading.value = false
  }
}

async function refreshTree() {
  try {
    tree.value = await archivalApi.fetchTree(fileId.value)
  }
  catch {
    toast.error('No se pudo actualizar el árbol documental.')
  }
}

async function requestComplete() {
  if (!file.value) {
    return
  }

  if (closureReadiness.value && !closureReadiness.value.ready) {
    workspaceTab.value = 'gestion'
    const lines = closureReadiness.value.blocking.map(item => item.message)
    toast.error(
      lines.length > 0
        ? lines.join(' · ')
        : 'Revise los requisitos para completar en la pestaña Gestión.',
    )
    await nextTick()
    document.getElementById('closure-readiness-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    return
  }

  completeConfirmOpen.value = true
}

async function handleClose() {
  if (!file.value) {
    return
  }

  completing.value = true

  try {
    await archivalApi.closeFile(file.value.id)
    completeConfirmOpen.value = false
    toast.success('Expediente completado.')
    await loadAll()
  }
  catch (error: unknown) {
    workspaceTab.value = 'gestion'
    await loadAll()
    const apiError = error as { data?: { errors?: Record<string, unknown>, message?: string } }
    const errors = apiError?.data?.errors
    if (errors && typeof errors === 'object') {
      const messages = Object.entries(errors)
        .filter(([key]) => key !== 'file' && !key.endsWith('_details'))
        .flatMap(([, value]) => Array.isArray(value) ? value.map(String) : [String(value)])
      if (messages.length > 0) {
        toast.error(messages.join(' · '))
        await nextTick()
        document.getElementById('closure-readiness-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        return
      }
    }
    toast.error(messageFromFetchError(error, 'No se pudo completar el expediente.'))
  }
  finally {
    completing.value = false
  }
}

function openReferenceDialog(node?: ArchivalFileTreeNode) {
  selectedTreeNode.value = node ?? null
  referenceDialogOpen.value = true
}

function openVersionDialog(node: ArchivalFileTreeNode) {
  selectedTreeNode.value = node
  versionDialogOpen.value = true
}

function openPublishDialog(node: ArchivalFileTreeNode) {
  if (!node.archival_file_document_id) {
    toast.error('No se identificó el documento a publicar.')
    return
  }
  selectedTreeNode.value = node
  publishDialogOpen.value = true
}

function openTransferDialog(alert?: ArchivalFileAlert) {
  transferAlertType.value = alert?.alert_type ?? null
  transferSuggestedPhase.value = file.value?.eligible_next_phase
    ?? inferPhaseFromAlert(alert?.alert_type)
    ?? null
  transferDialogOpen.value = true
}

function openStatusTransitionDialog(action: ArchivalFileStatusActionOption) {
  selectedStatusAction.value = action
  statusTransitionDialogOpen.value = true
}

function inferPhaseFromAlert(alertType?: string | null): ArchivalPhaseTarget | null {
  switch (alertType) {
    case 'retention_management_overdue':
    case 'retention_management_upcoming':
      return 'central'
    case 'retention_central_overdue':
    case 'retention_central_upcoming':
      return 'historical'
    case 'retention_historical_overdue':
    case 'retention_historical_upcoming':
      return 'disposed'
    default:
      return null
  }
}

onMounted(() => loadAll())
</script>

<template>
  <div class="flex h-[calc(100dvh-6.5rem)] min-h-0 flex-col gap-3">
    <div v-if="loading" class="py-16 text-center text-muted-foreground">
      Cargando expediente...
    </div>

    <template v-else-if="file">
      <div class="shrink-0 space-y-3 border-b px-1 pb-3">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div class="min-w-0 space-y-1">
            <p class="font-mono text-xs text-muted-foreground">
              {{ file.file_number }}
            </p>
            <h1 class="text-xl font-semibold tracking-tight sm:text-2xl">
              {{ file.title }}
            </h1>
            <div class="flex flex-wrap gap-1.5">
              <Badge :variant="archivalFileStatusBadgeVariant(file.status)">
                {{ ARCHIVAL_FILE_STATUS_LABELS[file.status] }}
              </Badge>
              <Badge v-if="file.is_frozen" variant="secondary">
                Congelado
              </Badge>
              <Badge v-if="file.consolidated_at" variant="secondary">
                Consolidado
              </Badge>
              <Badge v-if="file.is_master_file" variant="secondary">
                Maestro
              </Badge>
              <Badge v-if="required" :variant="required.complete ? 'outline' : 'destructive'">
                Obligatorios: {{ required.complete ? 'OK' : 'Pendientes' }}
              </Badge>
            </div>
          </div>

          <div
            v-if="availableStatusActions.length || canTransfer || canReconsolidate || canConsolidate || canDownloadConsolidated || canAttachDocument"
            class="flex max-w-full flex-wrap gap-2 sm:justify-end"
          >
            <Button
              v-for="action in availableStatusActions"
              :key="action.target"
              size="sm"
              :variant="action.variant"
              :title="action.description"
              @click="openStatusTransitionDialog(action)"
            >
              <Icon :name="action.icon" class="size-4" />
              {{ action.label }}
            </Button>
            <Button
              v-if="canTransfer"
              variant="outline"
              size="sm"
              title="Mover el expediente a la siguiente fase archivística"
              @click="openTransferDialog()"
            >
              <Icon name="i-lucide-arrow-right-left" class="size-4" />
              Transferir
            </Button>
            <Button
              v-if="canReconsolidate"
              variant="default"
              size="sm"
              :disabled="consolidating"
              @click="handleReconsolidate"
            >
              <Icon name="i-lucide-refresh-cw" class="size-4" />
              {{ consolidating ? 'Reconsolidando…' : 'Reconsolidar PDF' }}
            </Button>
            <Button
              v-if="canConsolidate"
              variant="default"
              size="sm"
              :disabled="consolidating"
              @click="handleConsolidate"
            >
              <Icon name="i-lucide-file-stack" class="size-4" />
              {{ consolidating ? 'Consolidando…' : (file.consolidated_path ? 'Reconsolidar PDF' : 'Consolidar PDF') }}
            </Button>
            <a
              v-if="canDownloadConsolidated && file"
              :href="archivalApi.consolidatedDownloadUrl(file.id)"
              class="inline-flex"
            >
              <Button variant="outline" size="sm" type="button">
                <Icon name="i-lucide-download" class="size-4" />
                Descargar consolidado
              </Button>
            </a>
            <Button
              v-if="canAttachDocument"
              variant="secondary"
              size="sm"
              title="Agregar documentos al expediente"
              @click="workspaceTab = 'adjuntar'"
            >
              <Icon name="i-lucide-paperclip" class="size-4" />
              Adjuntar documento
            </Button>
          </div>
        </div>

        <div
          v-if="statusBanner"
          class="rounded-md border px-3 py-2 text-sm"
          :class="file.status === 'returned'
            ? 'border-destructive/40 bg-destructive/10 text-destructive'
            : file.status === 'in_review'
              ? 'border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100'
              : 'border-muted bg-muted/30 text-muted-foreground'"
        >
          <p class="font-medium leading-snug">
            {{ statusBanner.title }}
          </p>
          <p class="mt-0.5 text-xs opacity-90">
            {{ statusBanner.description }}
          </p>
        </div>
      </div>

      <div class="grid min-h-0 flex-1 gap-4 lg:grid-cols-2 lg:items-stretch">
        <Card class="min-h-0 min-w-0 flex flex-col overflow-hidden">
          <CardHeader class="flex shrink-0 flex-row flex-wrap items-center justify-between gap-2 space-y-0 border-b py-3">
            <div class="min-w-0">
              <CardTitle class="text-base">
                Árbol documental
              </CardTitle>
              <CardDescription class="text-xs">
                Navegue carpetas y documentos. La TRD y los metadatos aparecen en cada nodo.
              </CardDescription>
            </div>
            <Button
              v-if="canManageDocuments"
              variant="outline"
              size="sm"
              type="button"
              @click="openReferenceDialog()"
            >
              Referenciar
            </Button>
          </CardHeader>
          <CardContent class="min-h-0 min-w-0 flex-1 overflow-y-auto p-3 sm:p-4">
            <div class="mb-3">
              <Input
                v-model="treeQuery"
                placeholder="Buscar por TRD, documento o metadatos…"
                class="h-8 text-xs"
                title="Buscar en el árbol por código o nombre TRD, documento o metadatos"
                aria-label="Buscar en el árbol por TRD, documento o metadatos"
              />
            </div>
            <p
              v-if="tree && !visibleTree && treeQuery.trim()"
              class="text-xs text-muted-foreground"
            >
              Ningún documento coincide con la búsqueda.
            </p>
            <ArchivalFileTreeItem
              v-else-if="visibleTree"
              :node="visibleTree"
              :file-id="file.id"
              :can-manage-documents="canManageDocuments"
              :can-view="canViewDocuments"
              :can-download="canDownloadDocuments"
              :metadata-fields="expedienteMetadataFields"
              :file-metadata-values="file.metadata_values"
              :can-publish-to-library="canPublishToLibrary"
              @reference="openReferenceDialog"
              @replace-version="openVersionDialog"
              @publish-to-library="openPublishDialog"
              @selection-updated="refreshTree"
            />
          </CardContent>
        </Card>

        <Card class="min-h-0 min-w-0 flex flex-col overflow-hidden">
          <Tabs v-model="workspaceTab" class="flex min-h-0 min-w-0 flex-1 flex-col">
            <div class="shrink-0 border-b px-2 py-2">
              <TabsList class="grid h-auto w-full grid-cols-2 gap-1 p-1 sm:grid-cols-3 lg:flex lg:flex-wrap">
                <TabsTrigger
                  value="resumen"
                  class="min-h-9 flex-1 px-2.5 text-xs data-[state=active]:bg-background data-[state=active]:font-semibold data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground sm:text-sm"
                >
                  Resumen
                </TabsTrigger>
                <TabsTrigger
                  value="gestion"
                  class="min-h-9 flex-1 px-2.5 text-xs data-[state=active]:bg-background data-[state=active]:font-semibold data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground sm:text-sm"
                >
                  Gestión
                  <Badge
                    v-if="gestionAttentionCount > 0"
                    variant="destructive"
                    class="ml-1.5 h-5 min-w-5 px-1 text-[10px]"
                  >
                    {{ gestionAttentionCount }}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="metadatos"
                  class="min-h-9 flex-1 px-2.5 text-xs data-[state=active]:bg-background data-[state=active]:font-semibold data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground sm:text-sm"
                >
                  Metadatos
                </TabsTrigger>
                <TabsTrigger
                  v-if="canAttachDocument"
                  value="adjuntar"
                  class="min-h-9 flex-1 px-2.5 text-xs data-[state=active]:bg-background data-[state=active]:font-semibold data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground sm:text-sm"
                >
                  Adjuntar
                </TabsTrigger>
                <TabsTrigger
                  value="auditoria"
                  class="min-h-9 flex-1 px-2.5 text-xs data-[state=active]:bg-background data-[state=active]:font-semibold data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground sm:text-sm"
                >
                  Auditoría
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="resumen" class="mt-0 min-h-0 flex-1 overflow-y-auto p-4 data-[state=inactive]:hidden">
              <div class="space-y-4 text-sm">
                <div class="grid gap-2 rounded-lg border bg-muted/20 p-3">
                  <div>
                    <span class="text-muted-foreground">Tipo:</span>
                    {{ file.file_type?.name }}
                  </div>
                  <div>
                    <span class="text-muted-foreground">Área:</span>
                    {{ file.org_unit?.name }}
                  </div>
                  <div v-if="tree?.trd" class="space-y-1">
                    <span class="text-muted-foreground">Ubicación TRD:</span>
                    <ArchivalTrdPlacementDropdown :trd="tree.trd" />
                  </div>
                  <div v-if="file.entity_label">
                    <span class="text-muted-foreground">Entidad:</span>
                    {{ file.entity_label }}
                  </div>
                  <div v-if="file.entity_key">
                    <span class="text-muted-foreground">Identificador:</span>
                    {{ file.entity_key }}
                  </div>
                </div>

                <div
                  v-if="file.status === 'closed' || file.archival_phase"
                  class="grid gap-2 rounded-lg border p-3"
                >
                  <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Ciclo archivístico
                  </p>
                  <div>
                    <span class="text-muted-foreground">Fase actual:</span>
                    {{ archivalPhaseLabel }}
                  </div>
                  <div v-if="eligibleNextPhaseLabel">
                    <span class="text-muted-foreground">Siguiente fase:</span>
                    {{ eligibleNextPhaseLabel }}
                  </div>
                  <div v-if="file.archival_management_ends_at">
                    <span class="text-muted-foreground">Fin gestión:</span>
                    {{ file.archival_management_ends_at }}
                  </div>
                  <div v-if="file.archival_central_ends_at">
                    <span class="text-muted-foreground">Fin central:</span>
                    {{ file.archival_central_ends_at }}
                  </div>
                  <div v-if="file.archival_historical_ends_at">
                    <span class="text-muted-foreground">Fin histórico:</span>
                    {{ file.archival_historical_ends_at }}
                  </div>
                  <p
                    v-if="file.transfer_blocked_reason"
                    class="text-xs text-amber-700 dark:text-amber-300"
                  >
                    {{ file.transfer_blocked_reason }}
                  </p>
                </div>
                <p class="text-xs text-muted-foreground leading-relaxed">
                  El árbol queda siempre visible a la izquierda. Use las pestañas para gestión, metadatos y carga sin perder el contexto documental.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="gestion" class="mt-0 min-h-0 flex-1 overflow-y-auto p-4 space-y-4 data-[state=inactive]:hidden">
              <Card v-if="required">
                <CardHeader class="pb-2">
                  <CardTitle class="text-sm">
                    Documentos obligatorios
                  </CardTitle>
                </CardHeader>
                <CardContent class="space-y-3">
                  <Badge :variant="required.complete ? 'default' : 'destructive'">
                    {{ required.complete ? 'Completo' : 'Incompleto' }}
                  </Badge>
                  <ul v-if="required.missing.length" class="space-y-1 text-sm text-destructive">
                    <li v-for="(item, index) in required.missing" :key="`missing-${index}-${item.doc_document_type_id}`">
                      <span class="font-medium">Falta: {{ item.label }}</span>
                      <span
                        v-if="item.document_type_code || item.document_type_name"
                        class="block text-xs font-normal text-destructive/80"
                      >
                        Tipo documental:
                        {{ item.document_type_code ? `${item.document_type_code} — ` : '' }}{{ item.document_type_name ?? '' }}
                      </span>
                    </li>
                  </ul>
                  <ul v-if="required.fulfilled.length" class="space-y-1 text-sm text-muted-foreground">
                    <li v-for="item in required.fulfilled" :key="`ok-${item.doc_document_type_id}`">
                      ✓ {{ item.label }}
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <div id="closure-readiness-card">
                <ArchivalFileClosureReadinessCard
                  v-if="canClose"
                  :readiness="closureReadiness"
                  :loading="loading"
                />
              </div>

              <Card v-if="alerts.length">
                <CardHeader class="pb-2">
                  <CardTitle class="text-sm">
                    Alertas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ArchivalFileAlertsPanel
                    :alerts="alerts"
                    :can-transfer="canTransfer"
                    compact
                    @transfer="openTransferDialog"
                  />
                </CardContent>
              </Card>

              <Card v-if="canTransferToDisposed && file">
                <CardHeader class="pb-2">
                  <CardTitle class="text-sm">
                    Disposición final
                  </CardTitle>
                </CardHeader>
                <CardContent class="space-y-3">
                  <div class="space-y-2">
                    <Label for="disposition-reason">Motivo (opcional)</Label>
                    <Textarea
                      id="disposition-reason"
                      v-model="dispositionReason"
                      rows="2"
                      placeholder="Acta, resolución o referencia..."
                    />
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    :disabled="transferring"
                    @click="handleDisposition"
                  >
                    {{ transferring ? 'Procesando…' : 'Registrar disposición final' }}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="metadatos" class="mt-0 min-h-0 flex-1 overflow-y-auto p-4 data-[state=inactive]:hidden">
              <ArchivalFileMetadataForm :file="file" :tree="tree" @updated="loadAll" />
            </TabsContent>

            <TabsContent
              v-if="canAttachDocument"
              value="adjuntar"
              class="mt-0 min-h-0 flex-1 overflow-y-auto p-4 data-[state=inactive]:hidden"
            >
              <ArchivalFileDocumentUploadForm
                :file="file"
                :tree="tree"
                :required="required"
                @uploaded="loadAll"
              />
            </TabsContent>

            <TabsContent value="auditoria" class="mt-0 min-h-0 flex-1 overflow-y-auto p-4 data-[state=inactive]:hidden">
              <ArchivalFileEventsTimeline :file-id="file.id" />
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      <div class="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t bg-background px-1 py-2">
        <Button variant="outline" size="sm" as-child>
          <NuxtLink to="/expedientes">
            <Icon name="i-lucide-arrow-left" class="size-4" />
            Volver al listado
          </NuxtLink>
        </Button>
        <Button
          v-if="canClose"
          size="sm"
          class="bg-emerald-600 text-white hover:bg-emerald-600/90"
          :disabled="closureReadiness !== null && !closureReadiness.ready"
          title="Da por terminada la gestión documental. No sale de esta pantalla."
          @click="requestComplete"
        >
          <Icon name="i-lucide-circle-check-big" class="size-4" />
          Completar expediente
        </Button>
      </div>

      <ArchivalFileDocumentReferenceDialog
        v-model:open="referenceDialogOpen"
        :file-id="file.id"
        :tree="tree"
        :target-node="selectedTreeNode"
        :entity-key="file.entity_key"
        :entity-label="file.entity_label"
        :org-unit-id="file.org_unit_id"
        :required="required"
        @created="loadAll"
      />

      <ArchivalFileDocumentVersionDialog
        v-model:open="versionDialogOpen"
        :file-id="file.id"
        :document-node="selectedTreeNode"
        @replaced="loadAll"
      />

      <ArchivalInstitutionalLibraryPublishDialog
        v-model:open="publishDialogOpen"
        :file-id="file.id"
        :document-id="selectedTreeNode?.archival_file_document_id ?? null"
        :document-title="selectedTreeNode?.name ?? ''"
        @published="loadAll"
      />

      <ArchivalFileTransferDialog
        v-model:open="transferDialogOpen"
        :file-id="file.id"
        :eligible-next-phase="file.eligible_next_phase"
        :can-transfer-to-next-phase="file.can_transfer_to_next_phase"
        :transfer-blocked-reason="file.transfer_blocked_reason"
        :alert-type="transferAlertType"
        :suggested-phase="transferSuggestedPhase"
        @transferred="loadAll"
      />

      <ArchivalFileStatusTransitionDialog
        v-model:open="statusTransitionDialogOpen"
        :file-id="file.id"
        :action="selectedStatusAction"
        @updated="loadAll"
      />

      <AlertDialog :open="completeConfirmOpen" @update:open="completeConfirmOpen = $event">
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Completar expediente</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción da por terminada la gestión documental y deja el expediente como completado.
              No sale de esta pantalla: para salir use <span class="font-medium">Volver al listado</span> en la parte inferior.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel :disabled="completing">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction :disabled="completing" @click.prevent="handleClose">
              {{ completing ? 'Completando…' : 'Sí, completar' }}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </template>
  </div>
</template>
