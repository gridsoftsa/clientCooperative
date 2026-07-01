<script setup lang="ts">
import type { ArchivalFileTreeNode } from '~/types/archival-file'

const props = defineProps<{
  node: ArchivalFileTreeNode
  depth?: number
}>()

const depth = computed(() => props.depth ?? 0)
const expanded = ref(depth.value < 2)

const hasChildren = computed(() => (props.node.children?.length ?? 0) > 0)
const isDocument = computed(() => props.node.type === 'document' || props.node.type === 'document_reference')

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
</script>

<template>
  <div>
    <div
      class="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/60"
      :style="{ paddingLeft: `${depth * 16 + 8}px` }"
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

      <a
        v-if="isDocument && node.download_url"
        :href="node.download_url"
        class="text-xs text-primary hover:underline"
        @click.stop
      >
        Descargar
      </a>
    </div>

    <div v-if="expanded && hasChildren">
      <ArchivalFileTreeItem
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :depth="depth + 1"
      />
    </div>
  </div>
</template>
