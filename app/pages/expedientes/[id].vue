<script setup lang="ts">
import { toast } from 'vue-sonner'
import type {
  ArchivalFile,
  ArchivalFileAlert,
  ArchivalFileClosureReadiness,
  ArchivalFileRequiredDocumentsEvaluation,
  ArchivalFileTreeNode,
  ArchivalPhaseTarget,
} from '~/types/archival-file'
import { ARCHIVAL_FILE_STATUS_LABELS } from '~/types/archival-file'

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
const transferDialogOpen = ref(false)
const selectedTreeNode = ref<ArchivalFileTreeNode | null>(null)
const transferAlertType = ref<string | null>(null)
const transferSuggestedPhase = ref<ArchivalPhaseTarget | null>(null)

const canAttachDocument = computed(() =>
  (hasPermission('expedientes_editar') || hasPermission('expedientes_documentos_adjuntar'))
  && !file.value?.is_frozen
  && file.value?.status !== 'closed',
)
const canManageDocuments = computed(() =>
  (hasPermission('expedientes_editar') || hasPermission('expedientes_documentos_adjuntar'))
  && !file.value?.is_frozen
  && file.value?.status !== 'closed',
)
const canDownloadDocuments = computed(() => hasPermission('expedientes_documentos_descargar'))
const canClose = computed(() => hasPermission('expedientes_cerrar') && file.value?.status !== 'closed')
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

function openTransferDialog(alert?: ArchivalFileAlert) {
  transferAlertType.value = alert?.alert_type ?? null
  transferSuggestedPhase.value = inferPhaseFromAlert(alert?.alert_type) ?? null
  transferDialogOpen.value = true
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
  <div class="space-y-6">
    <div v-if="loading" class="py-16 text-center text-muted-foreground">
      Cargando expediente...
    </div>

    <template v-else-if="file">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p class="font-mono text-sm text-muted-foreground">
            {{ file.file_number }}
          </p>
          <h1 class="text-2xl font-semibold tracking-tight">
            {{ file.title }}
          </h1>
          <div class="mt-2 flex flex-wrap gap-2">
            <Badge variant="outline">
              {{ ARCHIVAL_FILE_STATUS_LABELS[file.status] }}
            </Badge>
            <Badge v-if="file.is_frozen" variant="secondary">
              Congelado
            </Badge>
            <Badge v-if="file.consolidated_at" variant="secondary">
              Consolidado
            </Badge>
            <Badge v-if="file.is_master_file" variant="secondary">
              Expediente maestro
            </Badge>
          </div>
        </div>

        <div class="flex flex-wrap gap-2">
          <Button
            v-if="canTransfer"
            variant="outline"
            @click="openTransferDialog()"
          >
            Transferir
          </Button>
          <Button
            v-if="canReconsolidate"
            variant="default"
            :disabled="consolidating"
            @click="handleReconsolidate"
          >
            {{ consolidating ? 'Reconsolidando…' : 'Reconsolidar PDF' }}
          </Button>
          <Button
            v-if="canConsolidate"
            variant="default"
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
            <Button variant="outline" type="button">
              Descargar consolidado
            </Button>
          </a>
          <Button
            v-if="canClose"
            variant="outline"
            :disabled="closureReadiness !== null && !closureReadiness.ready"
            @click="handleClose"
          >
            Cerrar expediente
          </Button>
        </div>
      </div>

      <div class="grid gap-6 lg:grid-cols-3">
        <Card class="lg:col-span-2">
          <CardHeader class="flex flex-row flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>Árbol documental</CardTitle>
              <CardDescription>
                Carpetas, documentos, referencias y versiones del expediente.
              </CardDescription>
            </div>
            <Button
              v-if="canManageDocuments"
              variant="outline"
              size="sm"
              type="button"
              @click="openReferenceDialog()"
            >
              Referenciar documento
            </Button>
          </CardHeader>
          <CardContent>
            <ArchivalFileTreeItem
              v-if="tree"
              :node="tree"
              :file-id="file.id"
              :can-manage-documents="canManageDocuments"
              :can-download="canDownloadDocuments"
              @reference="openReferenceDialog"
              @replace-version="openVersionDialog"
            />
          </CardContent>
        </Card>

        <div class="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Datos del expediente</CardTitle>
            </CardHeader>
            <CardContent class="space-y-2 text-sm">
              <div><span class="text-muted-foreground">Tipo:</span> {{ file.file_type?.name }}</div>
              <div><span class="text-muted-foreground">Área:</span> {{ file.org_unit?.name }}</div>
              <div v-if="file.entity_label">
                <span class="text-muted-foreground">Entidad:</span> {{ file.entity_label }}
              </div>
              <div v-if="file.entity_key">
                <span class="text-muted-foreground">Identificador:</span> {{ file.entity_key }}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Metadatos del expediente</CardTitle>
              <CardDescription>
                Valores del esquema asociado al tipo de expediente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ArchivalFileMetadataForm :file="file" @updated="loadAll" />
            </CardContent>
          </Card>

          <Card v-if="canClose">
            <ArchivalFileClosureReadinessCard
              :readiness="closureReadiness"
              :loading="loading"
            />
          </Card>

          <Card v-if="alerts.length">
            <CardHeader>
              <CardTitle>Alertas</CardTitle>
              <CardDescription>
                Retención, cierre, consolidación y obligatorios pendientes.
              </CardDescription>
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

          <Card v-if="required">
            <CardHeader>
              <CardTitle>Documentos obligatorios</CardTitle>
            </CardHeader>
            <CardContent class="space-y-3">
              <Badge :variant="required.complete ? 'default' : 'destructive'">
                {{ required.complete ? 'Completo' : 'Incompleto' }}
              </Badge>
              <ul v-if="required.missing.length" class="space-y-1 text-sm text-destructive">
                <li v-for="item in required.missing" :key="item.doc_document_type_id">
                  Falta: {{ item.label }}
                </li>
              </ul>
              <ul v-if="required.fulfilled.length" class="space-y-1 text-sm text-muted-foreground">
                <li v-for="item in required.fulfilled" :key="`ok-${item.doc_document_type_id}`">
                  ✓ {{ item.label }}
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card v-if="canTransferToDisposed && file">
            <CardHeader>
              <CardTitle>Disposición final</CardTitle>
              <CardDescription>
                Transfiere el expediente a disposición final tras completar el archivo histórico.
              </CardDescription>
            </CardHeader>
            <CardContent class="space-y-3">
              <div class="space-y-2">
                <Label for="disposition-reason">Motivo (opcional)</Label>
                <Textarea
                  id="disposition-reason"
                  v-model="dispositionReason"
                  rows="2"
                  placeholder="Acta, resolución o referencia de disposición..."
                />
              </div>
              <Button
                variant="destructive"
                :disabled="transferring"
                @click="handleDisposition"
              >
                {{ transferring ? 'Procesando…' : 'Registrar disposición final' }}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Historial de auditoría</CardTitle>
              <CardDescription>
                Eventos del ciclo de vida del expediente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ArchivalFileEventsTimeline :file-id="file.id" />
            </CardContent>
          </Card>

          <Card v-if="canAttachDocument && file">
            <CardHeader>
              <CardTitle>Adjuntar documento</CardTitle>
              <CardDescription>
                Carga manual con autocompletado de metadatos reutilizables.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ArchivalFileDocumentUploadForm
                :file="file"
                :tree="tree"
                :required="required"
                @uploaded="loadAll"
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <ArchivalFileDocumentReferenceDialog
        v-model:open="referenceDialogOpen"
        :file-id="file.id"
        :tree="tree"
        :target-node="selectedTreeNode"
        @created="loadAll"
      />

      <ArchivalFileDocumentVersionDialog
        v-model:open="versionDialogOpen"
        :file-id="file.id"
        :document-node="selectedTreeNode"
        @replaced="loadAll"
      />

      <ArchivalFileTransferDialog
        v-model:open="transferDialogOpen"
        :file-id="file.id"
        :alert-type="transferAlertType"
        :suggested-phase="transferSuggestedPhase"
        @transferred="loadAll"
      />
    </template>
  </div>
</template>
