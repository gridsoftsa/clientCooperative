<script setup lang="ts">
import type { ArchivalFileTreeNode } from '~/types/archival-file'

const props = defineProps<{
  node: ArchivalFileTreeNode
  depth?: number
  canManageDocuments?: boolean
  canDownload?: boolean
  fileId?: number
}>()

const emit = defineEmits<{
  reference: [node: ArchivalFileTreeNode]
  replaceVersion: [node: ArchivalFileTreeNode]
  clickFile: [node: ArchivalFileTreeNode]
}>()

const depth = computed(() => props.depth ?? 0)
const expanded = ref(depth.value < 2)

const hasChildren = computed(() => (props.node.children?.length ?? 0) > 0)
const isDocument = computed(() => props.node.type === 'document' || props.node.type === 'document_reference')
const isVersionableDocument = computed(() => props.node.type === 'document')

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

function handleNodeClick() {
  if (isFileNode.value && props.node.archival_file_id) {
    emit('clickFile', props.node)
  }
}

const downloadHref = computed(() => {
  if (!props.canDownload || !props.fileId || !props.node.archival_file_document_id) {
    return props.node.download_url
  }

  return `/api/archival-files/${props.fileId}/documents/${props.node.archival_file_document_id}/download`
})
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
        @click="expanded = !expanded"
      >
        <Icon :name="expanded ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'" class="size-4" />
      </button>
      <span v-else class="w-4" />

      <Icon :name="iconName" class="size-4 shrink-0 text-muted-foreground" />

      <span class="min-w-0 flex-1 truncate text-sm">{{ node.name }}</span>

      <Badge v-if="node.is_reference" variant="secondary" class="text-xs">
        Referencia
      </Badge>
      <Badge v-if="node.status_label" variant="outline" class="text-xs">
        {{ node.status_label }}
      </Badge>

      <div v-if="isDocument" class="flex items-center gap-1">
        <a
          v-if="downloadHref"
          :href="downloadHref"
          class="text-xs text-primary hover:underline"
          @click.stop
        >
          Descargar
        </a>

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
      </div>
    </div>

    <div v-if="expanded && hasChildren">
      <ArchivalFileTreeItem
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :depth="depth + 1"
        :can-manage-documents="canManageDocuments"
        :can-download="canDownload"
        :file-id="fileId"
        @reference="emit('reference', $event)"
        @replace-version="emit('replaceVersion', $event)"
        @click-file="emit('clickFile', $event)"
      />
    </div>
  </div>
</template>
