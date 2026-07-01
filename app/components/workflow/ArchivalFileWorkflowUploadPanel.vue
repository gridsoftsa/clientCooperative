<script setup lang="ts">
import type { ArchivalFile, ArchivalFileTreeNode } from '~/types/archival-file'
import type { WorkflowArchivalFileContext } from '~/types/workflow'

const props = defineProps<{
  archivalContext: WorkflowArchivalFileContext
}>()

const emit = defineEmits<{
  uploaded: []
}>()

const { hasPermission } = usePermissions()
const archivalApi = useArchivalFileApi()

const loading = ref(true)
const loadError = ref<string | null>(null)
const file = ref<ArchivalFile | null>(null)
const tree = ref<ArchivalFileTreeNode | null>(null)

const canUpload = computed(() =>
  hasPermission('expedientes_documentos_adjuntar') || hasPermission('expedientes_editar'),
)

const stageMissing = computed(() => props.archivalContext.required_documents_stage?.missing ?? [])

async function load() {
  loading.value = true
  loadError.value = null

  try {
    const [fileData, treeData] = await Promise.all([
      archivalApi.fetchFile(props.archivalContext.id),
      archivalApi.fetchTree(props.archivalContext.id),
    ])
    file.value = fileData
    tree.value = treeData
  }
  catch {
    loadError.value = 'No se pudo cargar el expediente.'
    file.value = null
    tree.value = null
  }
  finally {
    loading.value = false
  }
}

function onUploaded() {
  emit('uploaded')
  load()
}

onMounted(() => load())

watch(() => props.archivalContext.id, () => load())
</script>

<template>
  <div class="space-y-3 rounded-lg border bg-muted/20 p-4">
    <div class="flex flex-wrap items-start justify-between gap-2">
      <div class="space-y-1">
        <p class="text-sm font-medium">
          Expediente {{ archivalContext.file_number }}
        </p>
        <p class="text-xs text-muted-foreground">
          {{ archivalContext.title }}
        </p>
        <p v-if="archivalContext.stage_folder_name" class="text-xs text-muted-foreground">
          Carpeta de etapa: {{ archivalContext.stage_folder_name }}
        </p>
      </div>
      <NuxtLink
        :to="`/expedientes/${archivalContext.id}`"
        class="text-xs text-primary underline-offset-4 hover:underline"
      >
        Ver expediente
      </NuxtLink>
    </div>

    <div v-if="stageMissing.length" class="space-y-1">
      <p class="text-xs font-medium text-amber-800 dark:text-amber-200">
        Pendientes en esta etapa
      </p>
      <ul class="list-inside list-disc text-xs text-muted-foreground">
        <li v-for="item in stageMissing" :key="item.doc_document_type_id">
          {{ item.label }}
        </li>
      </ul>
    </div>

    <p v-if="loading" class="text-sm text-muted-foreground">
      Cargando expediente…
    </p>

    <p v-else-if="loadError" class="text-sm text-destructive">
      {{ loadError }}
    </p>

    <ArchivalFileDocumentUploadForm
      v-else-if="file && archivalContext.can_upload && canUpload"
      :file="file"
      :tree="tree"
      :required="archivalContext.required_documents_stage"
      :workflow-task-id="archivalContext.workflow_task_id"
      :preset-node-id="archivalContext.archival_file_node_id"
      :preset-doc-type-id="archivalContext.default_doc_document_type_id"
      lock-folder
      @uploaded="onUploaded"
    />

    <p v-else-if="!archivalContext.can_upload" class="text-xs text-muted-foreground">
      El expediente no admite nuevos documentos en su estado actual.
    </p>

    <p v-else-if="!canUpload" class="text-xs text-muted-foreground">
      No tiene permiso para adjuntar documentos al expediente.
    </p>
  </div>
</template>
