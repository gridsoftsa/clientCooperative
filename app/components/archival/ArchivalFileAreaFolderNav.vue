<script setup lang="ts">
import type { ArchivalFileTreeNode } from '~/types/archival-file'
import {
  archivalAreaNodeIcon,
  isArchivalAreaFolderNode,
} from '~/utils/archival-area-repository'

const props = defineProps<{
  node: ArchivalFileTreeNode
  selectedId: string
  depth?: number
}>()

const emit = defineEmits<{
  select: [node: ArchivalFileTreeNode]
}>()

const depth = computed(() => props.depth ?? 0)
const isFolder = computed(() => isArchivalAreaFolderNode(props.node))
const isSelected = computed(() => props.node.id === props.selectedId)
const hasFolderChildren = computed(() =>
  (props.node.children ?? []).some(child => isArchivalAreaFolderNode(child)),
)
const expanded = ref(depth.value < 2 || isSelected.value)

watch(isSelected, (selected) => {
  if (selected) {
    expanded.value = true
  }
})

function handleSelect() {
  emit('select', props.node)
}

function toggleExpanded(event: Event) {
  event.stopPropagation()
  expanded.value = !expanded.value
}
</script>

<template>
  <div>
    <div
      class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted/70"
      :class="isSelected ? 'bg-primary/10 text-primary font-medium' : 'text-foreground'"
      :style="{ paddingLeft: `${depth * 12 + 8}px` }"
    >
      <button
        v-if="hasFolderChildren"
        type="button"
        class="text-muted-foreground"
        @click="toggleExpanded"
      >
        <Icon
          :name="expanded ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
          class="size-3.5"
        />
      </button>
      <span v-else class="w-3.5" />

      <button
        type="button"
        class="flex min-w-0 flex-1 items-center gap-2 text-left"
        @click="handleSelect"
      >
        <Icon
          :name="archivalAreaNodeIcon(node, expanded && isFolder)"
          class="size-4 shrink-0 text-muted-foreground"
        />
        <span class="truncate">{{ node.name }}</span>
      </button>
    </div>

    <div v-if="expanded && hasFolderChildren">
      <ArchivalFileAreaFolderNav
        v-for="child in node.children.filter(item => isArchivalAreaFolderNode(item))"
        :key="child.id"
        :node="child"
        :selected-id="selectedId"
        :depth="depth + 1"
        @select="emit('select', $event)"
      />
    </div>
  </div>
</template>
