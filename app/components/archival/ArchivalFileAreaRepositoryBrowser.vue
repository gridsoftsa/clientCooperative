<script setup lang="ts">
import type { ArchivalFileTreeNode } from '~/types/archival-file'
import {
  archivalAreaNodeIcon,
  archivalAreaNodeTypeLabel,
  countArchivalAreaDescendants,
  filterArchivalAreaChildren,
  findArchivalTreeNode,
  findArchivalTreePath,
  isArchivalAreaDocumentNode,
  isArchivalAreaFolderNode,
  partitionArchivalAreaChildren,
} from '~/utils/archival-area-repository'

const props = defineProps<{
  tree: ArchivalFileTreeNode | null
  orgUnitId: number
  loading?: boolean
}>()

const emit = defineEmits<{
  uploaded: []
}>()

const router = useRouter()
const { hasPermission } = usePermissions()

const selectedNodeId = ref('')
const selectedDocument = ref<ArchivalFileTreeNode | null>(null)
const searchQuery = ref('')

const canDownload = computed(() => hasPermission('expedientes_documentos_descargar'))

const currentNode = computed(() => {
  if (!props.tree) {
    return null
  }

  const targetId = selectedNodeId.value || props.tree.id

  return findArchivalTreeNode(props.tree, targetId) ?? props.tree
})

const breadcrumb = computed(() => {
  if (!props.tree || !currentNode.value) {
    return []
  }

  return findArchivalTreePath(props.tree, currentNode.value.id) ?? [props.tree]
})

const partitionedChildren = computed(() => {
  const children = currentNode.value?.children ?? []

  return partitionArchivalAreaChildren(filterArchivalAreaChildren(children, searchQuery.value))
})

const currentDocTypeId = computed(() => {
  if (currentNode.value?.type === 'document_type') {
    return currentNode.value.doc_document_type_id
  }

  if (selectedDocument.value?.doc_document_type_id) {
    return selectedDocument.value.doc_document_type_id
  }

  return undefined
})

const selectedFileId = computed(() => selectedDocument.value?.archival_file_id ?? null)

watch(
  () => props.tree,
  (tree) => {
    selectedNodeId.value = tree?.id ?? ''
    selectedDocument.value = null
    searchQuery.value = ''
  },
  { immediate: true },
)

function selectFolder(node: ArchivalFileTreeNode) {
  selectedNodeId.value = node.id
  selectedDocument.value = null
}

function openFolder(node: ArchivalFileTreeNode) {
  selectFolder(node)
}

function selectDocument(node: ArchivalFileTreeNode) {
  selectedDocument.value = node
  if (node.archival_file_id) {
    // Keep upload context tied to the document's expediente.
  }
}

function openExpediente(fileId: number) {
  router.push(`/expedientes/${fileId}`)
}

function formatBytes(size?: number): string {
  if (!size || size <= 0) {
    return '—'
  }

  if (size < 1024) {
    return `${size} B`
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}
</script>

<template>
  <div class="overflow-hidden rounded-xl border bg-card">
    <div v-if="loading" class="flex min-h-[28rem] items-center justify-center text-sm text-muted-foreground">
      Cargando repositorio...
    </div>

    <div v-else-if="!tree" class="flex min-h-[28rem] items-center justify-center text-sm text-muted-foreground">
      Seleccione un área para consultar su documentación.
    </div>

    <ResizablePanelGroup
      v-else
      id="archival-area-repository"
      direction="horizontal"
      class="min-h-[32rem]"
    >
      <ResizablePanel
        id="archival-area-nav"
        :default-size="28"
        :min-size="20"
        :max-size="40"
        class="border-r bg-muted/20"
      >
        <div class="flex h-full flex-col">
          <div class="border-b px-3 py-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Carpetas TRD
            </p>
            <p class="mt-1 text-sm font-medium">
              {{ tree.name }}
            </p>
          </div>

          <div class="flex-1 overflow-y-auto p-2">
            <ArchivalFileAreaFolderNav
              :node="tree"
              :selected-id="currentNode?.id ?? tree.id"
              @select="selectFolder"
            />
          </div>
        </div>
      </ResizablePanel>

      <ResizableHandle with-handle />

      <ResizablePanel id="archival-area-content" :default-size="72" :min-size="45">
        <div class="flex h-full min-h-[32rem] flex-col">
          <div class="space-y-3 border-b px-4 py-3">
            <div class="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
              <template v-for="(crumb, index) in breadcrumb" :key="crumb.id">
                <button
                  type="button"
                  class="max-w-[14rem] truncate rounded px-1 hover:bg-muted hover:text-foreground"
                  :class="index === breadcrumb.length - 1 ? 'font-medium text-foreground' : ''"
                  @click="selectFolder(crumb)"
                >
                  {{ crumb.name }}
                </button>
                <Icon
                  v-if="index < breadcrumb.length - 1"
                  name="i-lucide-chevron-right"
                  class="size-3.5 shrink-0"
                />
              </template>
            </div>

            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 class="text-lg font-semibold tracking-tight">
                  {{ currentNode?.name }}
                </h2>
                <p class="text-sm text-muted-foreground">
                  {{ archivalAreaNodeTypeLabel(currentNode!) }}
                  · {{ (currentNode?.children?.length ?? 0) }} elementos en esta carpeta
                </p>
              </div>

              <div class="relative w-full max-w-xs">
                <Icon name="i-lucide-search" class="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  v-model="searchQuery"
                  placeholder="Buscar en esta carpeta..."
                  class="pl-8"
                />
              </div>
            </div>
          </div>

          <div class="flex-1 overflow-y-auto p-4">
            <div
              v-if="partitionedChildren.folders.length === 0
                && partitionedChildren.documents.length === 0
                && partitionedChildren.files.length === 0"
              class="flex min-h-[12rem] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground"
            >
              No hay elementos en esta carpeta con los filtros actuales.
            </div>

            <div v-else class="space-y-6">
              <section v-if="partitionedChildren.folders.length > 0" class="space-y-3">
                <h3 class="text-sm font-semibold text-muted-foreground">
                  Carpetas
                </h3>
                <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <button
                    v-for="folder in partitionedChildren.folders"
                    :key="folder.id"
                    type="button"
                    class="group rounded-xl border bg-background p-4 text-left transition-colors hover:border-primary/40 hover:bg-muted/30"
                    @click="openFolder(folder)"
                    @dblclick="openFolder(folder)"
                  >
                    <div class="flex items-start gap-3">
                      <div class="rounded-lg bg-amber-500/10 p-2 text-amber-700 dark:text-amber-300">
                        <Icon :name="archivalAreaNodeIcon(folder)" class="size-5" />
                      </div>
                      <div class="min-w-0 flex-1">
                        <p class="truncate font-medium">
                          {{ folder.name }}
                        </p>
                        <p class="mt-1 text-xs text-muted-foreground">
                          {{ archivalAreaNodeTypeLabel(folder) }}
                        </p>
                        <p class="mt-2 text-xs text-muted-foreground">
                          {{ folder.children?.length ?? 0 }} elementos
                          <span v-if="countArchivalAreaDescendants(folder) > (folder.children?.length ?? 0)">
                            · {{ countArchivalAreaDescendants(folder) }} en total
                          </span>
                        </p>
                      </div>
                      <Icon
                        name="i-lucide-chevron-right"
                        class="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                      />
                    </div>
                  </button>
                </div>
              </section>

              <section v-if="partitionedChildren.documents.length > 0" class="space-y-3">
                <h3 class="text-sm font-semibold text-muted-foreground">
                  Documentos
                </h3>
                <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <div
                    v-for="document in partitionedChildren.documents"
                    :key="document.id"
                    class="rounded-xl border bg-background p-4 transition-colors"
                    :class="selectedDocument?.id === document.id ? 'border-primary ring-1 ring-primary/30' : 'hover:border-primary/30'"
                    @click="selectDocument(document)"
                  >
                    <div class="flex items-start gap-3">
                      <div class="rounded-lg bg-sky-500/10 p-2 text-sky-700 dark:text-sky-300">
                        <Icon :name="archivalAreaNodeIcon(document)" class="size-5" />
                      </div>
                      <div class="min-w-0 flex-1">
                        <p class="line-clamp-2 font-medium">
                          {{ document.name }}
                        </p>
                        <p class="mt-1 text-xs text-muted-foreground">
                          {{ document.doc_document_type_name || 'Documento' }}
                        </p>
                        <div class="mt-2 flex flex-wrap gap-1">
                          <Badge v-if="document.is_reference" variant="secondary" class="text-xs">
                            Referencia
                          </Badge>
                          <Badge v-if="document.version_number" variant="outline" class="text-xs">
                            v{{ document.version_number }}
                          </Badge>
                          <Badge v-if="document.source_label" variant="outline" class="text-xs">
                            {{ document.source_label }}
                          </Badge>
                        </div>
                        <p class="mt-2 text-xs text-muted-foreground">
                          {{ formatBytes(document.size_bytes) }}
                          <span v-if="document.uploaded_at">
                            · {{ new Date(document.uploaded_at).toLocaleDateString('es-CO') }}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div class="mt-3 flex flex-wrap gap-2">
                      <Button
                        v-if="document.archival_file_id"
                        variant="outline"
                        size="sm"
                        @click.stop="openExpediente(document.archival_file_id)"
                      >
                        Ver expediente
                      </Button>
                      <a
                        v-if="canDownload && document.download_url"
                        :href="document.download_url"
                        class="inline-flex"
                        @click.stop
                      >
                        <Button variant="ghost" size="sm">
                          Descargar
                        </Button>
                      </a>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>

          <div
            v-if="selectedDocument && selectedFileId"
            class="border-t bg-muted/20 p-4"
          >
            <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p class="text-sm font-medium">
                  Expediente #{{ selectedFileId }}
                </p>
                <p class="text-xs text-muted-foreground">
                  {{ selectedDocument.name }}
                </p>
              </div>
              <Button variant="outline" size="sm" @click="openExpediente(selectedFileId)">
                Abrir expediente completo
              </Button>
            </div>

            <ArchivalFileAreaDocumentUploadForm
              :org-unit-id="orgUnitId"
              :archival-file-id="selectedFileId"
              :default-doc-type-id="currentDocTypeId"
              @uploaded="emit('uploaded')"
            />
          </div>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  </div>
</template>
