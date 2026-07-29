<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { ArchivalMetadataFieldRow } from '~/composables/useArchivalMetadataApi'
import type {
  ArchivalFile,
  ArchivalFileAlert,
  ArchivalFileClosureReadiness,
  ArchivalFileRequiredDocumentsEvaluation,
  ArchivalFileTreeNode,
  ArchivalPhaseTarget,
} from '~/types/archival-file'
import { ARCHIVAL_FILE_STATUS_LABELS } from '~/types/archival-file'
import {
  archivalFileStatusActions,
  archivalFileStatusBadgeVariant,
  archivalFileStatusBanner,
  isArchivalFileEditable,
  isArchivalFileOperational,
  type ArchivalFileStatusActionOption,
} from '~/utils/archival-file-status'

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
const selectedStatusAction = ref<ArchivalFileStatusActionOption | null>(null)
const selectedTreeNode = ref<ArchivalFileTreeNode | null>(null)
const transferAlertType = ref<string | null>(null)
const transferSuggestedPhase = ref<ArchivalPhaseTarget | null>(null)
const workspaceTab = ref<'resumen' | 'gestion' | 'metadatos' | 'adjuntar' | 'auditoria'>('resumen')

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
  && file.value?.status === 'historical_archive'
  && file.value?.archival_phase === 'historical',
)
const canDownloadConsolidated = computed(() =>
  hasPermission('expedientes_documentos_descargar') && !!file.value?.consolidated_path,
)
const canTransfer = computed(() =>
  hasPermission('expedientes_transferir')
  && (file.value?.status === 'closed'
    || file.value?.status === 'management_archive'
    || file.value?.status === 'central_archive'
    || file.value?.status === 'historical_archive'),
)
const consolidating = ref(false)

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

async function handleClose() {
  if (!file.value)
    return

  try {
    await archivalApi.closeFile(file.value.id)
    toast.success('Expediente cerrado.')
    await loadAll()
  }
  catch (error: unknown) {
    const apiError = error as { data?: { errors?: Record<string, unknown> } }
    const errors = apiError?.data?.errors
    if (errors && typeof errors === 'object') {
      const messages = Object.entries(errors)
        .filter(([key]) => !key.endsWith('_details'))
        .flatMap(([, value]) => Array.isArray(value) ? value : [String(value)])
      if (messages.length) {
        toast.error(messages.join(' '))
        await loadAll()
        return
      }
    }
    toast.error('No se pudo cerrar el expediente. Verifique los requisitos de cierre.')
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
  selectedTreeNode.value = node
  publishDialogOpen.value = true
}

function openTransferDialog(alert?: ArchivalFileAlert) {
  transferAlertType.value = alert?.alert_type ?? null
  transferSuggestedPhase.value = inferPhaseFromAlert(alert?.alert_type) ?? null
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
  <div class="flex min-h-0 flex-col gap-4 lg:gap-5">
    <div v-if="loading" class="py-16 text-center text-muted-foreground">
      Cargando expediente...
    </div>

    <template v-else-if="file">
      <div class="sticky top-0 z-20 -mx-1 space-y-3 border-b bg-background/95 px-1 pb-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0 space-y-1">
            <Button variant="ghost" size="sm" class="-ml-2 h-8 text-muted-foreground" as-child>
              <NuxtLink to="/expedientes">
                <Icon name="i-lucide-arrow-left" class="mr-1 size-4" />
                Expedientes
              </NuxtLink>
            </Button>
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

          <div class="flex max-w-full flex-wrap gap-2 sm:justify-end">
            <Button
              v-for="action in availableStatusActions"
              :key="action.target"
              size="sm"
              :variant="action.variant"
              @click="openStatusTransitionDialog(action)"
            >
              {{ action.label }}
            </Button>
            <Button
              v-if="canTransfer"
              variant="outline"
              size="sm"
              @click="openTransferDialog()"
            >
              Transferir
            </Button>
            <Button
              v-if="canReconsolidate"
              variant="default"
              size="sm"
              :disabled="consolidating"
              @click="handleReconsolidate"
            >
              {{ consolidating ? 'Reconsolidando…' : 'Reconsolidar PDF' }}
            </Button>
            <Button
              v-if="canConsolidate"
              variant="default"
              size="sm"
              :disabled="consolidating"
              @click="handleConsolidate"
            >
              {{ consolidating ? 'Consolidando…' : (file.consolidated_path ? 'Reconsolidar PDF' : 'Consolidar PDF') }}
            </Button>
            <a
              v-if="canDownloadConsolidated && file"
              :href="archivalApi.consolidatedDownloadUrl(file.id)"
              class="inline-flex"
            >
              <Button variant="outline" size="sm" type="button">
                Descargar consolidado
              </Button>
            </a>
            <Button
              v-if="canClose"
              variant="outline"
              size="sm"
              :disabled="closureReadiness !== null && !closureReadiness.ready"
              @click="handleClose"
            >
              Cerrar expediente
            </Button>
            <Button
              v-if="canAttachDocument"
              variant="secondary"
              size="sm"
              @click="workspaceTab = 'adjuntar'"
            >
              Adjuntar
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

      <div class="grid min-h-0 gap-4 lg:grid-cols-2 lg:items-stretch">
        <Card class="min-h-0 min-w-0 flex flex-col overflow-hidden lg:max-h-[calc(100vh-11rem)]">
          <CardHeader class="flex shrink-0 flex-row flex-wrap items-center justify-between gap-2 space-y-0 border-b py-3">
            <div class="min-w-0">
              <CardTitle class="text-base">
                Árbol documental
              </CardTitle>
              <CardDescription class="text-xs">
                Navegue carpetas y documentos. Metadatos en cada nodo.
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
            <ArchivalFileTreeItem
              v-if="tree"
              :node="tree"
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
            />
          </CardContent>
        </Card>

        <Card class="min-h-0 min-w-0 flex flex-col overflow-hidden lg:max-h-[calc(100vh-11rem)]">
          <Tabs v-model="workspaceTab" class="flex min-h-0 min-w-0 flex-1 flex-col">
            <div class="shrink-0 border-b px-2 pt-2">
              <TabsList class="grid h-auto w-full grid-cols-2 gap-1 bg-transparent p-0 sm:grid-cols-3 lg:flex lg:flex-wrap lg:gap-1">
                <TabsTrigger value="resumen" class="text-xs sm:text-sm">
                  Resumen
                </TabsTrigger>
                <TabsTrigger value="gestion" class="text-xs sm:text-sm">
                  Gestión
                  <Badge
                    v-if="gestionAttentionCount > 0"
                    variant="destructive"
                    class="ml-1.5 h-5 min-w-5 px-1 text-[10px]"
                  >
                    {{ gestionAttentionCount }}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="metadatos" class="text-xs sm:text-sm">
                  Metadatos
                </TabsTrigger>
                <TabsTrigger
                  v-if="canAttachDocument"
                  value="adjuntar"
                  class="text-xs sm:text-sm"
                >
                  Adjuntar
                </TabsTrigger>
                <TabsTrigger value="auditoria" class="text-xs sm:text-sm">
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
                  <div v-if="file.entity_label">
                    <span class="text-muted-foreground">Entidad:</span>
                    {{ file.entity_label }}
                  </div>
                  <div v-if="file.entity_key">
                    <span class="text-muted-foreground">Identificador:</span>
                    {{ file.entity_key }}
                  </div>
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

              <ArchivalFileClosureReadinessCard
                v-if="canClose"
                :readiness="closureReadiness"
                :loading="loading"
              />

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
              <ArchivalFileMetadataForm :file="file" @updated="loadAll" />
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

      <InstitutionalLibraryPublishDialog
        v-if="file && selectedTreeNode?.archival_file_document_id"
        v-model:open="publishDialogOpen"
        :file-id="file.id"
        :document-id="selectedTreeNode.archival_file_document_id"
        :document-title="selectedTreeNode.name"
        @published="loadAll"
      />

      <ArchivalFileTransferDialog
        v-model:open="transferDialogOpen"
        :file-id="file.id"
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
    </template>
  </div>
</template>
