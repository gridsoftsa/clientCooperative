<script setup lang="ts">
import type { ArchivalFileTreeNode } from '~/types/archival-file'
import type { ArchivalAreaFolderExpansion } from '~/utils/archival-area-repository'
import {
  archivalAreaDocumentRecordId,
  archivalAreaNodeHasOverdueTransfer,
  archivalAreaNodeIcon,
  archivalAreaNodeTypeLabel,
  canOpenArchivalAreaDocument,
  canViewArchivalAreaDocument,
  countArchivalAreaDescendants,
  filterArchivalAreaChildren,
  filterArchivalAreaChildrenByUploadedDate,
  filterArchivalAreaTrdNavTree,
  findArchivalTreeNode,
  findArchivalTreeNodeByArchivalFileId,
  findArchivalTreePath,
  formatArchivalRetentionPreview,
  archivalAreaNodeIsFeaturedInLibrary,
  archivalAreaNodeIsPublishedToLibrary,
  isArchivalAreaManualFolder,
  partitionArchivalAreaChildren,
} from '~/utils/archival-area-repository'
import { toast } from 'vue-sonner'
import DocumentInlinePreviewDialog from '~/components/radicacion/DocumentInlinePreviewDialog.vue'

const props = withDefaults(defineProps<{
  tree: ArchivalFileTreeNode | null
  orgUnitId: number
  loading?: boolean
  allowUpload?: boolean
  navTitle?: string
  emptyTreeMessage?: string
}>(), {
  loading: false,
  allowUpload: true,
  navTitle: 'Carpetas TRD',
  emptyTreeMessage: 'Seleccione un área para consultar su documentación.',
})

const emit = defineEmits<{
  uploaded: []
}>()

const router = useRouter()
const { hasPermission } = usePermissions()
const { fetchDocumentViewBlob } = useArchivalDocumentBlob()
const {
  open: inlinePreviewOpen,
  title: inlinePreviewTitle,
  previewUrl: inlinePreviewUrl,
  previewKind: inlinePreviewKind,
  presentBlob,
} = useInlineFilePreview()
const viewingDocumentId = ref<string | null>(null)

const selectedNodeId = ref('')
const selectedDocument = ref<ArchivalFileTreeNode | null>(null)
const searchQuery = ref('')
const classificationQuery = ref('')
const filterDateFrom = ref('')
const filterDateTo = ref('')
const navCollapsed = ref(false)
const folderExpansion = ref<ArchivalAreaFolderExpansion>('default')
const folderExpansionTick = ref(0)
const manualFolderOpen = ref(false)
const pendingSelectFileId = ref<number | null>(null)

const canDownload = computed(() =>
  hasPermission('expedientes_documentos_descargar') || hasPermission('documentacion_ver'),
)
const canOpenExpediente = computed(() => hasPermission('expedientes_ver'))
const canUpload = computed(() =>
  props.allowUpload
  && (hasPermission('expedientes_editar') || hasPermission('expedientes_documentos_adjuntar')),
)

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
  const byDate = filterArchivalAreaChildrenByUploadedDate(
    children,
    filterDateFrom.value,
    filterDateTo.value,
  )

  return partitionArchivalAreaChildren(filterArchivalAreaChildren(byDate, searchQuery.value))
})

const visibleChildrenCount = computed(() =>
  partitionedChildren.value.folders.length
  + partitionedChildren.value.documents.length
  + partitionedChildren.value.files.length,
)

const hasDateFilter = computed(() =>
  Boolean(filterDateFrom.value?.trim() || filterDateTo.value?.trim()),
)

function clearDateFilter() {
  filterDateFrom.value = ''
  filterDateTo.value = ''
}

watch([filterDateFrom, filterDateTo], ([from, to]) => {
  if (from?.trim() && to?.trim() && from > to) {
    toast.error('La fecha inicial no puede ser posterior a la fecha final')
  }
})

const currentDocTypeId = computed(() => {
  if (currentNode.value?.type === 'document_type' || currentNode.value?.type === 'filing' || currentNode.value?.type === 'folder') {
    return currentNode.value.doc_document_type_id
  }

  if (selectedDocument.value?.doc_document_type_id) {
    return selectedDocument.value.doc_document_type_id
  }

  return undefined
})

const selectedFileId = computed(() =>
  selectedDocument.value?.archival_file_id
  ?? (isArchivalAreaManualFolder(currentNode.value) ? currentNode.value?.archival_file_id ?? null : null),
)

const isDocumentTypeContext = computed(() => currentNode.value?.type === 'document_type')

const talentPartyNode = computed(() =>
  breadcrumb.value.find(node => node.source === 'talent_party') ?? null,
)

const insideTalentParty = computed(() => talentPartyNode.value != null)

const talentPartyHref = computed(() => {
  const node = talentPartyNode.value
  if (!node?.talent_party_id || !hasPermission('talento_ver')) {
    return null
  }

  const section = node.talent_party_kind === 'supplier' ? 'proveedores' : 'empleados'

  return `/talento-humano/${section}/${node.talent_party_id}`
})

const canCreateManualFolder = computed(() =>
  canUpload.value
  && props.tree?.type === 'area'
  && isDocumentTypeContext.value
  && !insideTalentParty.value
  && currentNode.value?.doc_document_type_id != null,
)

const targetUploadFileId = computed(() => {
  if (isArchivalAreaManualFolder(currentNode.value)) {
    return currentNode.value?.archival_file_id ?? null
  }

  return selectedFileId.value
})

const trdNavTree = computed(() => {
  if (!props.tree) {
    return null
  }

  return filterArchivalAreaTrdNavTree(props.tree, classificationQuery.value)
})

const trdNavExpansion = computed<ArchivalAreaFolderExpansion>(() =>
  classificationQuery.value.trim() ? 'all' : folderExpansion.value,
)

const retentionPreviewText = computed(() =>
  formatArchivalRetentionPreview(currentNode.value?.retention ?? null),
)

watch(
  () => props.tree,
  (tree) => {
    const pendingFileId = pendingSelectFileId.value
    if (tree && pendingFileId != null) {
      const created = findArchivalTreeNodeByArchivalFileId(tree, pendingFileId)
        selectedNodeId.value = created?.id ?? (selectedNodeId.value || tree.id)
      pendingSelectFileId.value = null
      selectedDocument.value = null
      return
    }

    if (tree && selectedNodeId.value && findArchivalTreeNode(tree, selectedNodeId.value)) {
      return
    }

    selectedNodeId.value = tree?.id ?? ''
    selectedDocument.value = null
    folderExpansion.value = 'default'
    folderExpansionTick.value = 0
  },
  { immediate: true },
)

function setFolderExpansion(mode: ArchivalAreaFolderExpansion) {
  folderExpansion.value = mode
  folderExpansionTick.value += 1
}

function selectFolder(node: ArchivalFileTreeNode) {
  selectedNodeId.value = node.id
  selectedDocument.value = null
}

function openFolder(node: ArchivalFileTreeNode) {
  selectFolder(node)
}

function folderHasOverdueTransfer(folder: ArchivalFileTreeNode): boolean {
  return archivalAreaNodeHasOverdueTransfer(folder)
}

function folderCardClass(folder: ArchivalFileTreeNode): string {
  if (folderHasOverdueTransfer(folder)) {
    return 'border-rose-400/70 bg-rose-500/5 hover:border-rose-500/80 hover:bg-rose-500/10'
  }

  return 'bg-background hover:border-primary/40 hover:bg-muted/30'
}

function folderIconWrapClass(folder: ArchivalFileTreeNode): string {
  if (folderHasOverdueTransfer(folder)) {
    return 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
  }

  return 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
}

function folderOverdueHint(folder: ArchivalFileTreeNode): string | undefined {
  if (!folderHasOverdueTransfer(folder)) {
    return undefined
  }

  return 'Hay documentos con plazo de retención cumplido y sin transferencia.'
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

async function openDocumentView(document: ArchivalFileTreeNode) {
  const documentId = archivalAreaDocumentRecordId(document)

  if (!document.archival_file_id || documentId == null) {
    toast.error('No se pudo abrir el documento.')
    return
  }

  if (!canViewArchivalAreaDocument(document)) {
    toast.error('Este documento está restringido. No tiene permiso para verlo.')
    return
  }

  viewingDocumentId.value = document.id

  try {
    const blob = await fetchDocumentViewBlob(document.archival_file_id, documentId)
    presentBlob(blob, document.name || 'documento', document.mime_type)
  }
  catch (error) {
    toast.error(error instanceof Error ? error.message : 'No se pudo abrir el documento.')
  }
  finally {
    viewingDocumentId.value = null
  }
}

function clearTrdFolderSearch() {
  classificationQuery.value = ''
}

function onManualFolderCreated(archivalFileId: number) {
  pendingSelectFileId.value = archivalFileId
  emit('uploaded')
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
      {{ emptyTreeMessage }}
    </div>

    <div
      v-else
      class="flex min-h-[32rem]"
    >
      <aside
        v-if="navCollapsed"
        class="flex w-16 shrink-0 flex-col items-center border-r bg-muted/20 py-3"
      >
        <Button
          type="button"
          variant="outline"
          size="icon"
          class="size-12"
          :title="`Mostrar ${navTitle.toLowerCase()}`"
          :aria-label="`Mostrar ${navTitle.toLowerCase()}`"
          @click="navCollapsed = false"
        >
          <Icon name="i-lucide-panel-left-open" class="size-6" />
        </Button>
        <span
          class="mt-4 origin-center rotate-180 text-xs font-semibold uppercase tracking-wide text-muted-foreground [writing-mode:vertical-rl]"
        >
          {{ navTitle }}
        </span>
      </aside>

      <ResizablePanelGroup
        id="archival-area-repository"
        direction="horizontal"
        class="min-h-[32rem] min-w-0 flex-1"
      >
      <ResizablePanel
        v-if="!navCollapsed"
        id="archival-area-nav"
        :default-size="28"
        :min-size="20"
        :max-size="40"
        class="border-r bg-muted/20"
      >
        <div class="flex h-full flex-col">
          <div class="border-b px-3 py-3">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {{ navTitle }}
                </p>
                <p class="mt-1 text-sm font-medium leading-snug break-words">
                  {{ tree.name }}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                class="size-11 shrink-0"
                title="Ocultar menú de carpetas"
                aria-label="Ocultar menú de carpetas"
                @click="navCollapsed = true"
              >
                <Icon name="i-lucide-panel-left-close" class="size-5" />
              </Button>
            </div>
            <div class="mt-2 flex flex-wrap gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                class="h-8 px-2.5 text-xs"
                title="Mostrar solo series"
                @click="setFolderExpansion('collapsed')"
              >
                <Icon name="i-lucide-chevrons-up-down" class="mr-1 size-4" />
                Contraer
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                class="h-8 px-2.5 text-xs"
                title="Abrir todas las carpetas"
                @click="setFolderExpansion('all')"
              >
                <Icon name="i-lucide-chevrons-down-up" class="mr-1 size-4" />
                Expandir
              </Button>
            </div>
            <div class="relative mt-2">
              <Icon name="i-lucide-search" class="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                v-model="classificationQuery"
                placeholder="Buscar serie, subserie o tipo…"
                class="h-9 pl-8 pr-8"
              />
              <Button
                v-if="classificationQuery.trim()"
                type="button"
                variant="ghost"
                size="icon"
                class="absolute right-0.5 top-0.5 size-8"
                title="Limpiar búsqueda"
                aria-label="Limpiar búsqueda"
                @click="clearTrdFolderSearch"
              >
                <Icon name="i-lucide-x" class="size-3.5" />
              </Button>
            </div>
          </div>

          <div class="flex-1 overflow-y-auto p-2">
            <ArchivalFileAreaFolderNav
              v-if="trdNavTree"
              :node="trdNavTree"
              :selected-id="currentNode?.id ?? tree.id"
              :expansion="trdNavExpansion"
              :expansion-tick="folderExpansionTick"
              @select="selectFolder"
            />
            <p
              v-else
              class="px-2 py-6 text-center text-xs leading-relaxed text-muted-foreground"
            >
              No hay series, subseries o tipos documentales que coincidan.
            </p>
          </div>
        </div>
      </ResizablePanel>

      <ResizableHandle v-if="!navCollapsed" with-handle />

      <ResizablePanel id="archival-area-content" :default-size="navCollapsed ? 100 : 72" :min-size="45">
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

            <div class="flex min-w-0 items-start justify-between gap-3">
              <div class="min-w-0 space-y-1">
                <h2
                  class="truncate text-lg font-semibold tracking-tight"
                  :title="currentNode?.name"
                >
                  {{ currentNode?.name }}
                </h2>
                <p class="truncate text-sm text-muted-foreground">
                  {{ archivalAreaNodeTypeLabel(currentNode!) }}
                  · {{ visibleChildrenCount }} elementos en esta carpeta
                </p>
              </div>
              <Button
                v-if="canCreateManualFolder"
                type="button"
                class="h-9 shrink-0"
                @click="manualFolderOpen = true"
              >
                <Icon name="i-lucide-folder-plus" class="mr-1.5 size-4" />
                Nueva carpeta
              </Button>
            </div>

            <p
              v-if="insideTalentParty"
              class="rounded-md bg-muted/50 px-3 py-2 text-xs leading-relaxed text-muted-foreground"
            >
              Los archivos de esta carpeta se cargan en Talento humano.
              <NuxtLink
                v-if="talentPartyHref"
                :to="talentPartyHref"
                class="font-medium text-foreground underline-offset-4 hover:underline"
              >
                Abrir carpeta
              </NuxtLink>
            </p>

            <p
              v-if="isDocumentTypeContext && retentionPreviewText"
              class="rounded-md bg-muted/50 px-3 py-2 text-xs leading-relaxed text-muted-foreground"
            >
              {{ retentionPreviewText }}
            </p>

            <div class="flex min-w-0 flex-wrap items-center gap-2">
              <div class="min-w-[14rem] max-w-md flex-1">
                <DateRangeStringPicker
                  id="area-repo-date-range"
                  v-model:from="filterDateFrom"
                  v-model:to="filterDateTo"
                  placeholder-text="Fecha de carga"
                  compact
                  full-width
                />
              </div>
              <Button
                type="button"
                variant="outline"
                class="h-9 shrink-0"
                :disabled="!hasDateFilter"
                @click="clearDateFilter"
              >
                Limpiar fechas
              </Button>
              <div class="relative min-w-[12rem] max-w-xs flex-1">
                <Icon name="i-lucide-search" class="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  v-model="searchQuery"
                  placeholder="Buscar en esta carpeta..."
                  class="pl-8"
                />
              </div>
            </div>
            <p class="text-xs text-muted-foreground">
              Fechas y búsqueda aplican solo a esta carpeta (fecha de carga del documento).
            </p>
          </div>

          <div class="flex-1 overflow-y-auto p-4">
            <div
              v-if="partitionedChildren.folders.length === 0
                && partitionedChildren.documents.length === 0
                && partitionedChildren.files.length === 0"
              class="flex min-h-[12rem] flex-col items-center justify-center rounded-lg border border-dashed px-4 text-center text-sm text-muted-foreground"
            >
              <span>No hay elementos en esta carpeta con los filtros actuales.</span>
              <Button
                v-if="canCreateManualFolder"
                type="button"
                class="mt-4"
                @click="manualFolderOpen = true"
              >
                Crear carpeta y cargar archivos
              </Button>
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
                    class="group min-w-0 overflow-hidden rounded-xl border p-4 text-left transition-colors"
                    :class="folderCardClass(folder)"
                    :title="folderOverdueHint(folder)"
                    @click="openFolder(folder)"
                    @dblclick="openFolder(folder)"
                  >
                    <div class="flex items-start gap-3">
                      <div
                        class="rounded-lg p-2"
                        :class="folderIconWrapClass(folder)"
                      >
                        <Icon :name="archivalAreaNodeIcon(folder)" class="size-5" />
                      </div>
                      <div class="min-w-0 flex-1">
                        <p class="truncate font-medium">
                          {{ folder.name }}
                        </p>
                        <p class="mt-1 text-xs text-muted-foreground">
                          {{ archivalAreaNodeTypeLabel(folder) }}
                          <span v-if="folder.file_number"> · {{ folder.file_number }}</span>
                        </p>
                        <div
                          v-if="archivalAreaNodeIsPublishedToLibrary(folder)"
                          class="mt-2 flex flex-wrap gap-1"
                        >
                          <Badge variant="secondary" class="text-xs">
                            Publicado en biblioteca
                          </Badge>
                          <Badge
                            v-if="archivalAreaNodeIsFeaturedInLibrary(folder)"
                            variant="outline"
                            class="text-xs"
                          >
                            Destacado
                          </Badge>
                        </div>
                        <p class="mt-2 text-xs text-muted-foreground">
                          {{ folder.children?.length ?? 0 }} elementos
                          <span v-if="countArchivalAreaDescendants(folder) > (folder.children?.length ?? 0)">
                            · {{ countArchivalAreaDescendants(folder) }} en total
                          </span>
                        </p>
                        <p
                          v-if="folderHasOverdueTransfer(folder)"
                          class="mt-2 text-xs font-medium text-rose-700 dark:text-rose-300"
                        >
                          Transferencia pendiente
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
                    class="min-w-0 overflow-hidden rounded-xl border bg-background p-4 transition-colors"
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
                          <Badge v-if="!canViewArchivalAreaDocument(document)" variant="secondary" class="text-xs">
                            Restringido
                          </Badge>
                          <Badge
                            v-if="document.retention?.label"
                            :variant="document.retention.transfer_status === 'due' ? 'destructive' : 'secondary'"
                            class="text-xs"
                          >
                            {{ document.retention.label }}
                          </Badge>
                          <Badge
                            v-if="document.is_institutional_published"
                            variant="secondary"
                            class="text-xs"
                          >
                            Publicado en biblioteca
                          </Badge>
                          <Badge
                            v-if="document.is_institutional_published && document.is_featured"
                            variant="outline"
                            class="text-xs"
                          >
                            Destacado
                          </Badge>
                        </div>
                        <p
                          v-if="document.retention?.final_disposition_label"
                          class="mt-2 text-xs leading-snug text-muted-foreground wrap-break-word"
                        >
                          {{ document.retention.final_disposition_label }}
                          <template v-if="document.retention.inherited_from_label">
                            · {{ document.retention.inherited_from_label }}
                          </template>
                        </p>
                        <p class="mt-2 text-xs text-muted-foreground">
                          {{ formatBytes(document.size_bytes) }}
                          <span v-if="document.uploaded_at">
                            · {{ new Date(document.uploaded_at).toLocaleDateString('es-CO') }}
                          </span>
                        </p>
                        <p
                          v-if="document.retention?.management_ends_at"
                          class="mt-1 text-xs text-muted-foreground"
                        >
                          Archivo de gestión hasta {{ document.retention.management_ends_at }}
                        </p>
                      </div>
                    </div>

                    <div class="mt-3 flex flex-wrap items-center gap-1.5">
                      <Button
                        v-if="canOpenExpediente && document.archival_file_id"
                        variant="outline"
                        size="sm"
                        @click.stop="openExpediente(document.archival_file_id)"
                      >
                        Ver expediente
                      </Button>
                      <Button
                        v-if="canOpenArchivalAreaDocument(document) && canViewArchivalAreaDocument(document)"
                        variant="outline"
                        size="icon"
                        class="size-8"
                        :disabled="viewingDocumentId === document.id"
                        title="Ver documento"
                        aria-label="Ver documento"
                        @click.stop="openDocumentView(document)"
                      >
                        <Icon
                          :name="viewingDocumentId === document.id ? 'i-lucide-loader-2' : 'i-lucide-eye'"
                          class="size-4"
                          :class="{ 'animate-spin': viewingDocumentId === document.id }"
                        />
                      </Button>
                      <Button
                        v-else-if="canOpenArchivalAreaDocument(document)"
                        variant="outline"
                        size="icon"
                        class="size-8"
                        disabled
                        title="Documento restringido"
                        aria-label="Documento restringido"
                        @click.stop
                      >
                        <Icon name="i-lucide-lock" class="size-4" />
                      </Button>
                      <a
                        v-if="canDownload && document.can_download_content !== false && document.download_url"
                        :href="document.download_url"
                        class="inline-flex"
                        title="Descargar"
                        aria-label="Descargar"
                        @click.stop
                      >
                        <Button variant="ghost" size="icon" class="size-8">
                          <Icon name="i-lucide-download" class="size-4" />
                        </Button>
                      </a>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>

          <div
            v-if="targetUploadFileId && canUpload"
            class="border-t bg-muted/20 p-4"
          >
            <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p class="text-sm font-medium">
                  Carpeta / expediente #{{ targetUploadFileId }}
                </p>
                <p class="text-xs text-muted-foreground">
                  {{ currentNode?.name }}
                </p>
              </div>
              <Button
                v-if="canOpenExpediente"
                variant="outline"
                size="sm"
                @click="openExpediente(targetUploadFileId)"
              >
                Abrir expediente completo
              </Button>
            </div>

            <ArchivalFileAreaDocumentUploadForm
              :org-unit-id="orgUnitId"
              :archival-file-id="targetUploadFileId"
              :default-doc-type-id="currentDocTypeId"
              @uploaded="emit('uploaded')"
            />
          </div>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
    </div>
    <DocumentInlinePreviewDialog
      v-model:open="inlinePreviewOpen"
      :title="inlinePreviewTitle"
      :preview-url="inlinePreviewUrl"
      :preview-kind="inlinePreviewKind"
    />
    <ArchivalFileAreaManualFolderDialog
      v-if="currentNode?.doc_document_type_id"
      :open="manualFolderOpen"
      :org-unit-id="orgUnitId"
      :doc-document-type-id="currentNode.doc_document_type_id"
      :document-type-name="currentNode.name"
      :retention="currentNode.retention"
      :publishable-to-library="Boolean(currentNode.doc_series_publishable_to_institutional_library)"
      @update:open="manualFolderOpen = $event"
      @created="onManualFolderCreated"
    />
  </div>
</template>
