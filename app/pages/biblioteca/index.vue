<script setup lang="ts">
import { toast } from 'vue-sonner'
import InstitutionalLibraryBrowser from '~/components/archival/InstitutionalLibraryBrowser.vue'
import type { InstitutionalLibraryCategory, InstitutionalLibraryDocument } from '~/types/institutional-library'

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
const { $api } = useNuxtApp()
const api = $api as <T>(url: string, options?: Record<string, unknown>) => Promise<T>

const search = ref('')
const selectedCategory = ref('')
const selectedOrgUnitId = ref(FILTER_ALL_ORG_UNITS)
const loading = ref(false)
const page = ref(1)

const categories = ref<InstitutionalLibraryCategory[]>([])
const documents = ref<InstitutionalLibraryDocument[]>([])
const featured = ref<InstitutionalLibraryDocument | null>(null)
const recent = ref<InstitutionalLibraryDocument[]>([])
const mostViewed = ref<InstitutionalLibraryDocument[]>([])
const orgUnits = ref<Array<{ id: number, name: string }>>([])

const pagination = ref({ current_page: 1, last_page: 1, total: 0 })

const detailOpen = ref(false)
const previewing = ref(false)
const selectedDocument = ref<InstitutionalLibraryDocument | null>(null)
const documentDetail = ref<InstitutionalLibraryDocument | null>(null)

const canDownload = computed(() => hasPermission('expedientes_documentos_descargar'))

async function loadOrgUnits() {
  try {
    const res = await api<{ data: Array<{ id: number, name: string }> }>('/organizational-structure/org-units')
    orgUnits.value = res.data ?? []
  }
  catch {
    orgUnits.value = []
  }
}

async function loadLibrary() {
  loading.value = true
  try {
    const [cats, list, feat, rec, viewed] = await Promise.all([
      libraryApi.fetchCategories(),
      libraryApi.fetchDocuments({
        search: search.value || undefined,
        category: selectedCategory.value || undefined,
        org_unit_id: selectedOrgUnitId.value !== FILTER_ALL_ORG_UNITS
          ? Number(selectedOrgUnitId.value)
          : undefined,
        page: page.value,
        per_page: 12,
      }),
      libraryApi.fetchFeatured(),
      libraryApi.fetchRecent(),
      libraryApi.fetchMostViewed(),
    ])

    categories.value = cats
    documents.value = list.data ?? []
    pagination.value = {
      current_page: list.current_page,
      last_page: list.last_page,
      total: list.total,
    }
    featured.value = feat
    recent.value = rec
    mostViewed.value = viewed
  }
  catch {
    toast.error('No se pudo cargar la biblioteca institucional.')
  }
  finally {
    loading.value = false
  }
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

onMounted(async () => {
  await loadOrgUnits()
  await loadLibrary()
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">
          Biblioteca institucional
        </h1>
        <p class="mt-1 max-w-3xl text-sm text-muted-foreground">
          Consulte la documentación oficial publicada por categoría y área productora.
          Use el panel izquierdo para navegar y el panel derecho para ver y descargar documentos.
        </p>
      </div>
    </div>

    <Card>
      <CardContent class="p-0 sm:p-0">
        <InstitutionalLibraryBrowser
          :loading="loading"
          :categories="categories"
          :documents="documents"
          :featured="featured"
          :recent="recent"
          :most-viewed="mostViewed"
          :org-units="orgUnits"
          :org-unit-id="selectedOrgUnitId"
          :search="search"
          :selected-category="selectedCategory"
          :pagination="pagination"
          :can-download="canDownload"
          @update:org-unit-id="selectedOrgUnitId = $event"
          @update:search="search = $event"
          @update:selected-category="selectedCategory = $event"
          @update:page="page = $event"
          @refresh="loadLibrary"
          @view-document="openDocument"
        />
      </CardContent>
    </Card>

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
