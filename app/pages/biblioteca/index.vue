<script setup lang="ts">
import { toast } from 'vue-sonner'
import type {
  InstitutionalLibraryCategory,
  InstitutionalLibraryDocument,
  InstitutionalLibraryHome,
  InstitutionalLibrarySection,
} from '~/types/institutional-library'

const FILTER_ALL_ORG_UNITS = 'all'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'expedientes_biblioteca_ver',
})

const libraryApi = useInstitutionalLibraryApi()
const archivalApi = useArchivalFileApi()
const { viewDocumentInNewTab } = useArchivalDocumentBlob()
const { hasPermission } = usePermissions()

const loading = ref(false)
const listLoading = ref(false)
const search = ref('')
const selectedCategory = ref('')
const selectedOrgUnitId = ref(FILTER_ALL_ORG_UNITS)
const viewMode = ref<'portal' | 'list'>('portal')
const listPage = ref(1)

const home = ref<InstitutionalLibraryHome | null>(null)
const listDocuments = ref<InstitutionalLibraryDocument[]>([])
const listPagination = ref({ current_page: 1, last_page: 1, total: 0 })

const detailOpen = ref(false)
const previewing = ref(false)
const selectedDocument = ref<InstitutionalLibraryDocument | null>(null)
const documentDetail = ref<InstitutionalLibraryDocument | null>(null)

const canDownload = computed(() => hasPermission('expedientes_documentos_descargar'))

function homeQueryParams() {
  return {
    search: search.value || undefined,
    category: selectedCategory.value || undefined,
    org_unit_id: selectedOrgUnitId.value !== FILTER_ALL_ORG_UNITS
      ? Number(selectedOrgUnitId.value)
      : undefined,
  }
}

async function loadHome() {
  loading.value = true

  try {
    home.value = await libraryApi.fetchHome(homeQueryParams())
  }
  catch {
    toast.error('No se pudo cargar la biblioteca institucional.')
  }
  finally {
    loading.value = false
  }
}

async function loadList() {
  listLoading.value = true

  try {
    const list = await libraryApi.fetchDocuments({
      ...homeQueryParams(),
      page: listPage.value,
      per_page: 12,
    })

    listDocuments.value = list.data ?? []
    listPagination.value = {
      current_page: list.current_page,
      last_page: list.last_page,
      total: list.total,
    }
  }
  catch {
    toast.error('No se pudieron cargar los documentos.')
  }
  finally {
    listLoading.value = false
  }
}

async function refreshLibrary() {
  if (viewMode.value === 'list') {
    await loadList()
  }
  else {
    await loadHome()
  }
}

function openCategoryList(category: InstitutionalLibraryCategory) {
  selectedCategory.value = category.value
  viewMode.value = 'list'
  listPage.value = 1
  void loadList()
}

function openSectionList(section: InstitutionalLibrarySection) {
  selectedCategory.value = section.category ?? ''
  if (section.org_unit?.id) {
    selectedOrgUnitId.value = String(section.org_unit.id)
  }
  viewMode.value = 'list'
  listPage.value = 1
  void loadList()
}

function backToPortal() {
  viewMode.value = 'portal'
  selectedCategory.value = ''
  listPage.value = 1
  void loadHome()
}

async function onSearch() {
  listPage.value = 1

  if (viewMode.value === 'list') {
    await loadList()
  }
  else {
    await loadHome()
  }
}

async function onListPage(page: number) {
  listPage.value = page
  await loadList()
}

async function openDocument(document: InstitutionalLibraryDocument) {
  selectedDocument.value = document
  detailOpen.value = true

  try {
    documentDetail.value = await libraryApi.fetchDocument(document.id)
  }
  catch {
    toast.error('No se pudo cargar el detalle del documento.')
    documentDetail.value = document
  }
}

async function openPreview(document: InstitutionalLibraryDocument) {
  if (!document.archival_file_id) {
    toast.error('No se pudo abrir el documento.')
    return
  }

  previewing.value = true

  try {
    await viewDocumentInNewTab(document.archival_file_id, document.id)
  }
  catch (error) {
    toast.error(error instanceof Error ? error.message : 'No se pudo abrir el documento.')
  }
  finally {
    previewing.value = false
  }
}

function downloadUrl(document: InstitutionalLibraryDocument | null) {
  if (!document || !canDownload.value) {
    return null
  }

  return archivalApi.documentDownloadUrl(document.archival_file_id, document.id)
}

function formatDate(value?: string | null) {
  if (!value) {
    return '—'
  }

  return new Date(value).toLocaleDateString('es-CO')
}

watch(selectedOrgUnitId, () => {
  listPage.value = 1
  void refreshLibrary()
})

onMounted(() => loadHome())
</script>

<template>
  <div class="mx-auto max-w-7xl space-y-6">
    <div>
      <h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">
        Biblioteca institucional
      </h1>
      <p class="mt-1 max-w-3xl text-sm text-muted-foreground">
        Documentación oficial por área y categoría. Filtre por área productora para ver políticas, formatos y procedimientos de cada dependencia.
      </p>
    </div>

    <ArchivalInstitutionalLibraryPortal
      :loading="loading"
      :home="home"
      :list-documents="listDocuments"
      :list-loading="listLoading"
      :list-pagination="listPagination"
      :view-mode="viewMode"
      :search="search"
      :selected-org-unit-id="selectedOrgUnitId"
      :selected-category="selectedCategory"
      :can-download="canDownload"
      @update:search="search = $event"
      @update:selected-org-unit-id="selectedOrgUnitId = $event"
      @update:selected-category="selectedCategory = $event"
      @search="onSearch"
      @view-document="openDocument"
      @open-category="openCategoryList"
      @open-section="openSectionList"
      @back-to-portal="backToPortal"
      @list-page="onListPage"
    />

    <Dialog v-model:open="detailOpen">
      <DialogContent class="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{{ documentDetail?.title ?? selectedDocument?.title }}</DialogTitle>
          <DialogDescription>
            Versión {{ documentDetail?.version_number ?? selectedDocument?.version_number }}
            <span v-if="documentDetail?.effective_from">
              · Vigente desde {{ formatDate(documentDetail.effective_from) }}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div v-if="documentDetail" class="space-y-4">
          <div class="flex flex-wrap gap-2">
            <Badge v-if="documentDetail.institutional_category_label" variant="outline">
              {{ documentDetail.institutional_category_label }}
            </Badge>
            <Badge v-if="documentDetail.is_effective !== false" class="bg-emerald-50 text-emerald-700">
              Vigente
            </Badge>
            <Badge v-if="documentDetail.org_unit" variant="secondary">
              {{ documentDetail.org_unit.name }}
            </Badge>
          </div>

          <div class="grid gap-3 text-sm sm:grid-cols-2">
            <div><span class="text-muted-foreground">Publicado:</span> {{ formatDate(documentDetail.published_at) }}</div>
            <div><span class="text-muted-foreground">Aprobado:</span> {{ formatDate(documentDetail.approved_at) }}</div>
            <div v-if="documentDetail.effective_to">
              <span class="text-muted-foreground">Vigente hasta:</span> {{ formatDate(documentDetail.effective_to) }}
            </div>
            <div v-if="documentDetail.published_by">
              <span class="text-muted-foreground">Publicado por:</span> {{ documentDetail.published_by.name }}
            </div>
          </div>

          <div v-if="documentDetail.versions?.length" class="space-y-2">
            <h3 class="font-medium">
              Historial de versiones
            </h3>
            <div class="rounded-md border">
              <div
                v-for="version in documentDetail.versions"
                :key="version.id"
                class="flex items-center justify-between border-b px-3 py-2 text-sm last:border-b-0"
              >
                <div>
                  Versión {{ version.version_number }}
                  <span v-if="version.is_current_version" class="text-muted-foreground">(vigente)</span>
                </div>
                <Badge :variant="version.is_effective ? 'secondary' : 'outline'">
                  {{ version.is_effective ? 'Vigente' : 'Histórica' }}
                </Badge>
              </div>
            </div>
          </div>

          <div class="flex flex-wrap gap-2">
            <Button type="button" :disabled="previewing" @click="openPreview(documentDetail)">
              Visualizar
            </Button>
            <a
              v-if="downloadUrl(documentDetail)"
              :href="downloadUrl(documentDetail)!"
              class="inline-flex"
            >
              <Button variant="outline" type="button">
                Descargar
              </Button>
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>
