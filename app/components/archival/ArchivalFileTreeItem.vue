<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { ArchivalMetadataFieldRow } from '~/composables/useArchivalMetadataApi'
import type { ArchivalFileTreeNode } from '~/types/archival-file'
import DocumentInlinePreviewDialog from '~/components/radicacion/DocumentInlinePreviewDialog.vue'

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
  /** Columna lateral estrecha: menos badges y acciones compactas */
  compact?: boolean
}>()

const emit = defineEmits<{
  reference: [node: ArchivalFileTreeNode]
  replaceVersion: [node: ArchivalFileTreeNode]
  clickFile: [node: ArchivalFileTreeNode]
  publishToLibrary: [node: ArchivalFileTreeNode]
}>()

const archivalApi = useArchivalFileApi()
const { fetchDocumentViewBlob } = useArchivalDocumentBlob()
const {
  open: inlinePreviewOpen,
  title: inlinePreviewTitle,
  previewUrl: inlinePreviewUrl,
  previewKind: inlinePreviewKind,
  presentBlob,
} = useInlineFilePreview()
const router = useRouter()

const depth = computed(() => props.depth ?? 0)
const indentPx = computed(() => (props.compact ? 12 : 16) * depth.value + (props.compact ? 6 : 8))
const expanded = ref(depth.value < 2)
const detailsExpanded = ref(false)
const viewing = ref(false)

const hasChildren = computed(() => (props.node.children?.length ?? 0) > 0)
const isDocument = computed(() => props.node.type === 'document' || props.node.type === 'document_reference')
const isVersionableDocument = computed(() => props.node.type === 'document')
const canAccessDocumentContent = computed(() => props.node.can_view_content !== false)

const canPublishThisDocument = computed(() =>
  props.canPublishToLibrary
  && isVersionableDocument.value
  && canAccessDocumentContent.value
  && props.node.doc_series_publishable_to_institutional_library === true,
)
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
  || Boolean(props.node.trd?.path)
  || (props.node.metadata_values != null && Object.keys(props.node.metadata_values).length > 0),
)

const nodeMetadataFields = computed(() =>
  (props.node.metadata_fields?.length ? props.node.metadata_fields : props.metadataFields) ?? [],
)

const documentFileId = computed(() => props.fileId ?? props.node.archival_file_id ?? null)
const documentId = computed(() => props.node.archival_file_document_id ?? null)

const downloadHref = computed(() => {
  if (
    !props.canDownload
    || !canAccessDocumentContent.value
    || props.node.can_download_content === false
    || documentFileId.value === null
    || documentId.value === null
  ) {
    return null
  }

  return archivalApi.documentDownloadUrl(documentFileId.value, documentId.value)
})

const canViewDocument = computed(() =>
  props.canView
  && canAccessDocumentContent.value
  && documentFileId.value != null
  && documentId.value != null,
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
    const blob = await fetchDocumentViewBlob(documentFileId.value, documentId.value)
    presentBlob(blob, props.node.name || 'documento', props.node.mime_type)
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
  <div class="min-w-0">
    <div
      class="flex min-w-0 flex-col gap-1 rounded-md px-1 py-1.5 hover:bg-muted/60 sm:px-2"
      :class="{ 'cursor-pointer': isFileNode }"
      :style="{ paddingLeft: `${indentPx}px` }"
      @click="handleNodeClick"
    >
      <div class="flex min-w-0 items-center gap-1.5">
        <button
          v-if="hasChildren"
          type="button"
          class="text-muted-foreground"
          :title="expanded ? 'Contraer' : 'Expandir'"
          :aria-label="expanded ? `Contraer ${node.name}` : `Expandir ${node.name}`"
          :aria-expanded="expanded"
          @click.stop="expanded = !expanded"
        >
          <Icon :name="expanded ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'" class="size-4" aria-hidden="true" />
        </button>
        <span v-else class="w-4 shrink-0" />

        <Icon :name="iconName" class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />

        <span
          class="min-w-0 flex-1 truncate text-sm"
          :title="node.name"
        >{{ node.name }}</span>

        <Badge
          v-if="!isDocument && node.status_label"
          variant="outline"
          class="shrink-0 text-[10px] sm:text-xs"
          :title="`Estado: ${node.status_label}`"
        >
          {{ node.status_label }}
        </Badge>
      </div>

      <div
        v-if="isDocument || node.trd || canShowDetails"
        class="flex min-w-0 flex-wrap items-center gap-1 pl-9"
      >
        <ArchivalTrdPlacementDropdown
          v-if="node.trd"
          :trd="node.trd"
          :compact="compact"
        />

        <Badge
          v-if="node.is_reference"
          variant="secondary"
          class="text-[10px] sm:text-xs"
          :title="`Referencia a la versión ${node.referenced_version_number ?? '?'}`"
        >
          Ref. v{{ node.referenced_version_number ?? '?' }}
        </Badge>
        <Badge
          v-if="isDocument && node.version_number"
          :variant="node.is_current_version === false ? 'outline' : 'secondary'"
          class="text-[10px] sm:text-xs"
          :title="node.is_current_version === false ? `Versión ${node.version_number} histórica` : `Versión ${node.version_number} vigente`"
        >
          v{{ node.version_number }}
          <span v-if="node.is_current_version !== false" class="sr-only"> vigente</span>
        </Badge>
        <Badge
          v-if="isDocument && !canAccessDocumentContent"
          variant="secondary"
          class="text-[10px] sm:text-xs"
          title="Contenido restringido por clasificación. La TRD y los metadatos sí se pueden consultar."
        >
          Restringido
        </Badge>
        <Badge
          v-if="isDocument && node.is_institutional_published"
          variant="secondary"
          class="text-[10px] sm:text-xs"
          title="Publicado en la biblioteca institucional"
        >
          Biblioteca
        </Badge>
        <Badge
          v-if="isDocument && node.is_institutional_published && node.is_featured"
          variant="outline"
          class="text-[10px] sm:text-xs"
          title="Destacado en el banner de la biblioteca institucional"
        >
          Destacado
        </Badge>

        <div class="ml-auto flex shrink-0 items-center gap-0.5">
          <Button
            v-if="canShowDetails"
            variant="ghost"
            size="icon"
            type="button"
            class="size-7 text-muted-foreground"
            :class="{ 'text-primary': detailsExpanded }"
            :title="detailsExpanded ? 'Ocultar metadatos' : 'Ver metadatos'"
            :aria-label="detailsExpanded ? `Ocultar metadatos de ${node.name}` : `Ver metadatos de ${node.name}`"
            :aria-expanded="detailsExpanded"
            @click.stop="toggleDetails"
          >
            <Icon :name="detailsExpanded ? 'i-lucide-chevron-up' : 'i-lucide-info'" class="size-3.5" />
          </Button>
          <Button
            v-if="canViewDocument"
            variant="ghost"
            size="icon"
            class="size-7"
            type="button"
            :disabled="viewing"
            title="Ver documento"
            :aria-label="`Ver ${node.name}`"
            @click.stop="openDocumentView"
          >
            <Icon name="i-lucide-eye" class="size-3.5" />
          </Button>
          <a
            v-if="canDownload && downloadHref"
            :href="downloadHref"
            class="inline-flex size-7 items-center justify-center rounded-md text-primary hover:bg-muted"
            title="Descargar"
            :aria-label="`Descargar ${node.name}`"
            @click.stop
          >
            <Icon name="i-lucide-download" class="size-3.5" />
          </a>
          <Button
            v-if="canOpenFile && node.archival_file_id"
            variant="ghost"
            size="icon"
            class="size-7"
            type="button"
            title="Abrir expediente"
            :aria-label="`Abrir expediente ${node.name}`"
            @click.stop="openExpediente"
          >
            <Icon name="i-lucide-briefcase" class="size-3.5" />
          </Button>
          <Button
            v-if="canManageDocuments && canAccessDocumentContent && isDocument"
            variant="ghost"
            size="icon"
            class="size-7"
            type="button"
            title="Referenciar"
            :aria-label="`Referenciar ${node.name}`"
            @click.stop="emit('reference', node)"
          >
            <Icon name="i-lucide-link-2" class="size-3.5" />
          </Button>
          <Button
            v-if="canManageDocuments && canAccessDocumentContent && isVersionableDocument"
            variant="ghost"
            size="icon"
            class="size-7"
            type="button"
            title="Nueva versión"
            :aria-label="`Nueva versión de ${node.name}`"
            @click.stop="emit('replaceVersion', node)"
          >
            <Icon name="i-lucide-files" class="size-3.5" />
          </Button>
          <Button
            v-if="canPublishThisDocument"
            variant="outline"
            size="sm"
            class="h-7 gap-1 px-2 text-xs"
            type="button"
            :title="node.is_institutional_published ? 'Editar publicación en biblioteca' : 'Publicar en biblioteca'"
            :aria-label="node.is_institutional_published ? `Editar publicación de ${node.name}` : `Publicar ${node.name} en biblioteca`"
            @click.stop="emit('publishToLibrary', node)"
          >
            <Icon
              :name="node.is_institutional_published ? 'i-lucide-square-pen' : 'i-lucide-library'"
              class="size-3.5"
            />
            {{ node.is_institutional_published ? 'Editar publicación' : 'Publicar' }}
          </Button>
        </div>
      </div>
    </div>

    <div
      v-if="detailsExpanded && canShowDetails"
      class="mb-1 min-w-0 rounded-md border border-border/60 bg-muted/30 py-2 pr-2 sm:pr-3"
      :style="{ marginLeft: `${indentPx + (compact ? 20 : 24)}px` }"
    >
      <ArchivalFileTreeNodeDetails
        :node="node"
        :metadata-fields="nodeMetadataFields"
        :file-metadata-values="isFileRoot ? fileMetadataValues : undefined"
        :file-id="fileId"
        :can-view-documents="canView && canAccessDocumentContent"
        :can-download-documents="canDownload && canAccessDocumentContent"
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
        :compact="compact"
        @reference="emit('reference', $event)"
        @replace-version="emit('replaceVersion', $event)"
        @click-file="emit('clickFile', $event)"
        @publish-to-library="emit('publishToLibrary', $event)"
      />
    </div>
    <DocumentInlinePreviewDialog
      v-model:open="inlinePreviewOpen"
      :title="inlinePreviewTitle"
      :preview-url="inlinePreviewUrl"
      :preview-kind="inlinePreviewKind"
    />
  </div>
</template>
