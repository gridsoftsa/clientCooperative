<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { ArchivalMetadataFieldRow } from '~/composables/useArchivalMetadataApi'
import type { ArchivalFileTreeNode } from '~/types/archival-file'

const props = defineProps<{
  node: ArchivalFileTreeNode
  depth?: number
  canManageDocuments?: boolean
  canView?: boolean
  canDownload?: boolean
  canOpenFile?: boolean
  canPublishToLibrary?: boolean
  fileId?: number
  metadataFields?: ArchivalMetadataFieldRow[]
  fileMetadataValues?: Record<string, unknown> | null
}>()

const emit = defineEmits<{
  reference: [node: ArchivalFileTreeNode]
  replaceVersion: [node: ArchivalFileTreeNode]
  clickFile: [node: ArchivalFileTreeNode]
  publishToLibrary: [node: ArchivalFileTreeNode]
}>()

const archivalApi = useArchivalFileApi()
const { viewDocumentInNewTab } = useArchivalDocumentBlob()
const router = useRouter()

const depth = computed(() => props.depth ?? 0)
const expanded = ref(depth.value < 2)
const detailsExpanded = ref(false)
const viewing = ref(false)

const hasChildren = computed(() => (props.node.children?.length ?? 0) > 0)
const isDocument = computed(() => props.node.type === 'document' || props.node.type === 'document_reference')
const isVersionableDocument = computed(() => props.node.type === 'document')
const isFolder = computed(() => props.node.type === 'folder')
const isFileRoot = computed(() => props.node.type === 'file')

const iconName = computed(() => {
  switch (props.node.type) {
    case 'folder':
      return expanded.value ? 'i-lucide-folder-open' : 'i-lucide-folder'
    case 'document':
      return 'i-lucide-file-text'
    case 'document_reference':
      return 'i-lucide-link-2'
    case 'child_file':
      return 'i-lucide-briefcase'
    default:
      return 'i-lucide-archive'
  }
})

const isFileNode = computed(() => props.node.type === 'file' || props.node.type === 'child_file')

const canShowDetails = computed(() =>
  isDocument.value
  || isFolder.value
  || isFileRoot.value
  || (props.node.metadata_values != null && Object.keys(props.node.metadata_values).length > 0),
)

const documentFileId = computed(() => props.fileId ?? props.node.archival_file_id ?? null)
const documentId = computed(() => props.node.archival_file_document_id ?? null)

const downloadHref = computed(() => {
  if (!props.canDownload || documentFileId.value === null || documentId.value === null) {
    return props.node.download_url
  }

  return archivalApi.documentDownloadUrl(documentFileId.value, documentId.value)
})

const canViewDocument = computed(() =>
  props.canView && documentFileId.value != null && documentId.value != null,
)

function handleNodeClick() {
  if (isFileNode.value && props.node.archival_file_id) {
    emit('clickFile', props.node)
  }
}

function toggleDetails() {
  detailsExpanded.value = !detailsExpanded.value
}

async function openDocumentView() {
  if (!canViewDocument.value || documentFileId.value == null || documentId.value == null) {
    return
  }

  viewing.value = true

  try {
    await viewDocumentInNewTab(documentFileId.value, documentId.value)
  }
  catch (error) {
    toast.error(error instanceof Error ? error.message : 'No se pudo abrir el documento.')
  }
  finally {
    viewing.value = false
  }
}

function openExpediente() {
  if (props.node.archival_file_id) {
    router.push(`/expedientes/${props.node.archival_file_id}`)
  }
}
</script>

<template>
  <div>
    <div
      class="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/60"
      :class="{ 'cursor-pointer': isFileNode }"
      :style="{ paddingLeft: `${depth * 16 + 8}px` }"
      @click="handleNodeClick"
    >
      <button
        v-if="hasChildren"
        type="button"
        class="text-muted-foreground"
        @click.stop="expanded = !expanded"
      >
        <Icon :name="expanded ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'" class="size-4" />
      </button>
      <span v-else class="w-4" />

      <Icon :name="iconName" class="size-4 shrink-0 text-muted-foreground" />

      <span class="min-w-0 flex-1 truncate text-sm">{{ node.name }}</span>

      <Badge v-if="node.is_reference" variant="secondary" class="text-xs">
        Ref. v{{ node.referenced_version_number ?? '?' }}
      </Badge>
      <Badge
        v-if="isDocument && node.version_number"
        :variant="node.is_current_version === false ? 'outline' : 'secondary'"
        class="text-xs"
      >
        v{{ node.version_number }}
        <span v-if="node.is_current_version !== false" class="sr-only"> vigente</span>
      </Badge>
      <Badge
        v-if="isDocument && node.source_label"
        variant="outline"
        class="text-xs"
        :title="node.source ? `Origen: ${node.source}` : undefined"
      >
        {{ node.source_label }}
      </Badge>
      <Badge v-if="node.status_label" variant="outline" class="text-xs">
        {{ node.status_label }}
      </Badge>

      <Button
        v-if="canShowDetails"
        variant="ghost"
        size="sm"
        type="button"
        class="h-7 shrink-0 gap-1 px-2 text-xs text-muted-foreground"
        :class="{ 'text-primary': detailsExpanded }"
        :title="detailsExpanded ? 'Ocultar metadatos' : 'Ver metadatos'"
        @click.stop="toggleDetails"
      >
        <Icon :name="detailsExpanded ? 'i-lucide-chevron-up' : 'i-lucide-info'" class="size-3.5" />
        <span class="hidden sm:inline">{{ detailsExpanded ? 'Ocultar' : 'Metadatos' }}</span>
      </Button>

      <div v-if="isDocument" class="flex flex-wrap items-center justify-end gap-1">
        <Button
          v-if="canViewDocument"
          variant="ghost"
          size="sm"
          class="h-7 px-2 text-xs"
          type="button"
          :disabled="viewing"
          @click.stop="openDocumentView"
        >
          Ver
        </Button>
        <a
          v-if="canDownload && downloadHref"
          :href="downloadHref"
          class="inline-flex h-7 items-center px-2 text-xs text-primary hover:underline"
          @click.stop
        >
          Descargar
        </a>
        <Button
          v-if="canOpenFile && node.archival_file_id"
          variant="ghost"
          size="sm"
          class="h-7 px-2 text-xs"
          type="button"
          @click.stop="openExpediente"
        >
          Expediente
        </Button>

        <template v-if="canManageDocuments">
          <Button
            variant="ghost"
            size="sm"
            class="h-7 px-2 text-xs"
            type="button"
            @click.stop="emit('reference', node)"
          >
            Referenciar
          </Button>
          <Button
            v-if="isVersionableDocument"
            variant="ghost"
            size="sm"
            class="h-7 px-2 text-xs"
            type="button"
            @click.stop="emit('replaceVersion', node)"
          >
            Nueva versión
          </Button>
        </template>
        <Button
          v-if="canPublishToLibrary && isVersionableDocument"
          variant="ghost"
          size="sm"
          class="h-7 px-2 text-xs"
          type="button"
          @click.stop="emit('publishToLibrary', node)"
        >
          Publicar
        </Button>
      </div>
    </div>

    <div
      v-if="detailsExpanded && canShowDetails"
      class="mb-1 rounded-md border border-border/60 bg-muted/30 py-2 pr-3"
      :style="{ marginLeft: `${depth * 16 + 32}px` }"
    >
      <ArchivalFileTreeNodeDetails
        :node="node"
        :metadata-fields="metadataFields"
        :file-metadata-values="isFileRoot ? fileMetadataValues : undefined"
        :file-id="fileId"
        :can-view-documents="canView"
        :can-download-documents="canDownload"
      />
    </div>

    <div v-if="expanded && hasChildren">
      <ArchivalFileTreeItem
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :depth="depth + 1"
        :can-manage-documents="canManageDocuments"
        :can-view="canView"
        :can-download="canDownload"
        :can-open-file="canOpenFile"
        :can-publish-to-library="canPublishToLibrary"
        :file-id="fileId"
        :metadata-fields="metadataFields"
        :file-metadata-values="fileMetadataValues"
        @reference="emit('reference', $event)"
        @replace-version="emit('replaceVersion', $event)"
        @click-file="emit('clickFile', $event)"
        @publish-to-library="emit('publishToLibrary', $event)"
      />
    </div>
  </div>
</template>
