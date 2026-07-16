<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { InstitutionalLibraryCategory, InstitutionalLibraryDocument } from '~/types/institutional-library'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permission: 'expedientes_biblioteca_ver',
})

const libraryApi = useInstitutionalLibraryApi()
const archivalApi = useArchivalFileApi()
const { hasPermission } = usePermissions()
const { $api } = useNuxtApp()
const api = $api as <T>(url: string, options?: Record<string, unknown>) => Promise<T>

const search = ref('')
const selectedCategory = ref('')
const selectedOrgUnitId = ref('')
const loading = ref(false)
const page = ref(1)

const categories = ref<InstitutionalLibraryCategory[]>([])
const documents = ref<InstitutionalLibraryDocument[]>([])
const featured = ref<InstitutionalLibraryDocument | null>(null)
const recent = ref<InstitutionalLibraryDocument[]>([])
const mostViewed = ref<InstitutionalLibraryDocument[]>([])
const orgUnits = ref<Array<{ id: number, name: string }>>([])

const pagination = ref({ current_page: 1, last_page: 1, total: 0 })

const previewOpen = ref(false)
const detailOpen = ref(false)
const selectedDocument = ref<InstitutionalLibraryDocument | null>(null)
const documentDetail = ref<InstitutionalLibraryDocument | null>(null)

const canDownload = computed(() => hasPermission('expedientes_documentos_descargar'))

const categoryIcons: Record<string, string> = {
  policies: 'i-lucide-shield',
  procedures: 'i-lucide-list-checks',
  manuals: 'i-lucide-book-open',
  forms: 'i-lucide-file-input',
  instructions: 'i-lucide-lightbulb',
  regulations: 'i-lucide-scale',
  guidelines: 'i-lucide-compass',
}

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
        org_unit_id: selectedOrgUnitId.value ? Number(selectedOrgUnitId.value) : undefined,
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

function selectCategory(category: string) {
  selectedCategory.value = selectedCategory.value === category ? '' : category
  page.value = 1
  loadLibrary()
}

function selectOrgUnit(orgUnitId: string) {
  selectedOrgUnitId.value = selectedOrgUnitId.value === orgUnitId ? '' : orgUnitId
  page.value = 1
  loadLibrary()
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

function openPreview(document: InstitutionalLibraryDocument) {
  selectedDocument.value = document
  previewOpen.value = true
}

function viewUrl(document: InstitutionalLibraryDocument | null) {
  if (!document) {
    return null
  }

  return archivalApi.documentViewUrl(document.archival_file_id, document.id)
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
  <div class="space-y-8">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 class="text-3xl font-semibold tracking-tight">
          Biblioteca Institucional
        </h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Documentación oficial organizada por categorías, áreas y vigencia.
        </p>
      </div>

      <div class="w-full max-w-xl">
        <div class="relative">
          <Icon name="i-lucide-search" class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            v-model="search"
            class="pl-10"
            placeholder="Buscar documentos, procedimientos, formatos..."
            @keyup.enter="page = 1; loadLibrary()"
          />
        </div>
      </div>
    </div>

    <Card
      v-if="featured"
      class="overflow-hidden border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-background"
    >
      <CardContent class="flex flex-col gap-6 p-6 lg:flex-row lg:items-center lg:justify-between">
        <div class="space-y-3">
          <Badge variant="secondary">
            Destacado
          </Badge>
          <div>
            <h2 class="text-2xl font-semibold">
              {{ featured.title }}
            </h2>
            <p class="mt-1 text-sm text-muted-foreground">
              Versión {{ featured.version_number }}
              <span v-if="featured.effective_from"> · Vigente desde {{ formatDate(featured.effective_from) }}</span>
            </p>
          </div>
          <p v-if="featured.org_unit" class="text-sm text-muted-foreground">
            {{ featured.org_unit.name }}
          </p>
        </div>
        <Button type="button" @click="openDocument(featured)">
          Ver documento
        </Button>
      </CardContent>
    </Card>

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
      <button
        v-for="category in categories"
        :key="category.value"
        type="button"
        class="rounded-xl border bg-card p-4 text-left transition hover:border-primary/40 hover:shadow-sm"
        :class="{ 'border-primary ring-1 ring-primary/20': selectedCategory === category.value }"
        @click="selectCategory(category.value)"
      >
        <div class="mb-3 flex size-10 items-center justify-center rounded-lg bg-muted">
          <Icon :name="categoryIcons[category.value] ?? 'i-lucide-file-text'" class="size-5 text-primary" />
        </div>
        <div class="font-medium">
          {{ category.label }}
        </div>
        <div class="mt-1 text-sm text-muted-foreground">
          {{ category.count ?? 0 }} documentos
        </div>
      </button>
    </div>

    <div class="flex flex-wrap gap-2">
      <Button
        size="sm"
        :variant="selectedOrgUnitId === '' ? 'default' : 'outline'"
        type="button"
        @click="selectOrgUnit('')"
      >
        Todas las áreas
      </Button>
      <Button
        v-for="unit in orgUnits"
        :key="unit.id"
        size="sm"
        :variant="selectedOrgUnitId === String(unit.id) ? 'default' : 'outline'"
        type="button"
        @click="selectOrgUnit(String(unit.id))"
      >
        {{ unit.name }}
      </Button>
    </div>

    <div class="grid gap-6 xl:grid-cols-[1fr_320px]">
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">
            Documentos
            <span class="text-sm font-normal text-muted-foreground">({{ pagination.total }})</span>
          </h2>
          <Button variant="outline" size="sm" :disabled="loading" @click="loadLibrary">
            Actualizar
          </Button>
        </div>

        <div v-if="loading" class="py-16 text-center text-muted-foreground">
          Cargando biblioteca...
        </div>
        <div v-else-if="documents.length === 0" class="rounded-xl border border-dashed py-16 text-center text-muted-foreground">
          No hay documentos publicados con los filtros seleccionados.
        </div>
        <div v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <InstitutionalLibraryCard
            v-for="document in documents"
            :key="document.id"
            :document="document"
            :can-download="canDownload"
            @view="openDocument"
            @download="() => {}"
          />
        </div>

        <div v-if="pagination.last_page > 1" class="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            :disabled="page <= 1 || loading"
            @click="page--; loadLibrary()"
          >
            Anterior
          </Button>
          <span class="text-sm text-muted-foreground">
            Página {{ pagination.current_page }} de {{ pagination.last_page }}
          </span>
          <Button
            variant="outline"
            size="sm"
            :disabled="page >= pagination.last_page || loading"
            @click="page++; loadLibrary()"
          >
            Siguiente
          </Button>
        </div>
      </div>

      <div class="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle class="text-base">
              Documentos actualizados
            </CardTitle>
          </CardHeader>
          <CardContent class="space-y-3">
            <button
              v-for="document in recent"
              :key="`recent-${document.id}`"
              type="button"
              class="block w-full rounded-md px-2 py-2 text-left hover:bg-muted/60"
              @click="openDocument(document)"
            >
              <div class="text-sm font-medium line-clamp-2">
                {{ document.title }}
              </div>
              <div class="text-xs text-muted-foreground">
                Versión {{ document.version_number }}
              </div>
            </button>
            <p v-if="recent.length === 0" class="text-sm text-muted-foreground">
              Sin actualizaciones recientes.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle class="text-base">
              Más consultados
            </CardTitle>
          </CardHeader>
          <CardContent class="space-y-3">
            <button
              v-for="document in mostViewed"
              :key="`viewed-${document.id}`"
              type="button"
              class="block w-full rounded-md px-2 py-2 text-left hover:bg-muted/60"
              @click="openDocument(document)"
            >
              <div class="text-sm font-medium line-clamp-2">
                {{ document.title }}
              </div>
              <div class="text-xs text-muted-foreground">
                {{ document.view_count ?? 0 }} consultas
              </div>
            </button>
            <p v-if="mostViewed.length === 0" class="text-sm text-muted-foreground">
              Aún no hay consultas registradas.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>

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
            <Button type="button" @click="openPreview(documentDetail)">
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

    <ArchivalFileDocumentPreviewDialog
      v-model:open="previewOpen"
      :title="selectedDocument?.title ?? 'Documento'"
      :view-url="viewUrl(selectedDocument)"
      :mime-type="selectedDocument?.mime_type"
    />
  </div>
</template>
