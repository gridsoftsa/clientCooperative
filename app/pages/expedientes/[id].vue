<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { ArchivalFile, ArchivalFileAlert, ArchivalFileRequiredDocumentsEvaluation, ArchivalFileTreeNode } from '~/types/archival-file'
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
const alerts = ref<ArchivalFileAlert[]>([])

const canAttachDocument = computed(() =>
  (hasPermission('expedientes_editar') || hasPermission('expedientes_documentos_adjuntar'))
  && !file.value?.is_frozen
  && file.value?.status !== 'closed',
)
const canClose = computed(() => hasPermission('expedientes_cerrar') && file.value?.status !== 'closed')
const canConsolidate = computed(() =>
  hasPermission('expedientes_consolidar')
  && file.value?.status === 'closed'
  && !file.value?.consolidated_path,
)
const canDownloadConsolidated = computed(() =>
  hasPermission('expedientes_documentos_descargar') && !!file.value?.consolidated_path,
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

async function loadAll() {
  loading.value = true

  try {
    const [fileData, treeData, requiredData, alertsData] = await Promise.all([
      archivalApi.fetchFile(fileId.value),
      archivalApi.fetchTree(fileId.value),
      archivalApi.fetchRequiredDocuments(fileId.value),
      archivalApi.fetchFileAlerts(fileId.value),
    ])
    file.value = fileData
    tree.value = treeData
    required.value = requiredData
    alerts.value = alertsData
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
  catch {
    toast.error('No se pudo cerrar el expediente. Verifique documentos y metadatos obligatorios.')
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

        <div class="flex gap-2">
          <Button
            v-if="canConsolidate"
            variant="default"
            :disabled="consolidating"
            @click="handleConsolidate"
          >
            {{ consolidating ? 'Consolidando…' : 'Consolidar PDF' }}
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
            @click="handleClose"
          >
            Cerrar expediente
          </Button>
        </div>
      </div>

      <div class="grid gap-6 lg:grid-cols-3">
        <Card class="lg:col-span-2">
          <CardHeader>
            <CardTitle>Árbol documental</CardTitle>
            <CardDescription>
              Carpetas, documentos y referencias del expediente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ArchivalFileTreeItem v-if="tree" :node="tree" />
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

          <Card v-if="alerts.length">
            <CardHeader>
              <CardTitle>Alertas</CardTitle>
              <CardDescription>
                Retención, cierre, consolidación y obligatorios pendientes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ArchivalFileAlertsPanel :alerts="alerts" compact />
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
    </template>
  </div>
</template>
