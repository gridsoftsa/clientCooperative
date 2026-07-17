<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { ArchivalFile, ArchivalMasterDocumentSearchResult } from '~/types/archival-file'
import { ARCHIVAL_FILE_STATUS_LABELS } from '~/types/archival-file'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'expedientes_ver',
})

const router = useRouter()
const archivalApi = useArchivalFileApi()
const trdApi = useTrdApi()
const { $api } = useNuxtApp()
const api = $api as <T>(url: string, options?: Record<string, unknown>) => Promise<T>

const activeTab = ref<'files' | 'documents'>('files')
const loading = ref(true)
const searching = ref(false)

const masterFiles = ref<ArchivalFile[]>([])
const masterDocuments = ref<ArchivalMasterDocumentSearchResult[]>([])

const fileSearch = ref('')
const documentSearch = ref('')
const debouncedDocumentSearch = refDebounced(documentSearch, 300)
const documentTypeId = ref<number | null>(null)
const docTypeOptions = ref<Array<{ id: number, label: string }>>([])

const filesMeta = ref({ current_page: 1, last_page: 1, total: 0 })
const documentsMeta = ref({ current_page: 1, last_page: 1, total: 0 })

function statusLabel(status: string): string {
  return ARCHIVAL_FILE_STATUS_LABELS[status as keyof typeof ARCHIVAL_FILE_STATUS_LABELS] ?? status
}

async function loadDocTypes() {
  try {
    const units = await api<{ data: Array<{ id: number }> }>('/organizational-structure/org-units')
    const orgUnitId = units.data?.[0]?.id
    if (!orgUnitId) {
      docTypeOptions.value = []
      return
    }

    const tree = await trdApi.fetchCatalogTree(orgUnitId, true)
    docTypeOptions.value = tree.flatMap(series =>
      (series.subseries ?? []).flatMap(sub =>
        (sub.document_types ?? []).map(type => ({
          id: type.id,
          label: `${type.code} — ${type.name}`,
        })),
      ),
    ).sort((a, b) => a.label.localeCompare(b.label, 'es'))
  }
  catch {
    docTypeOptions.value = []
  }
}

async function loadMasterFiles(page = 1) {
  loading.value = true

  try {
    const query: Record<string, string | number> = {
      page,
      per_page: 15,
      is_master_file: 1,
    }
    if (fileSearch.value.trim()) {
      query.search = fileSearch.value.trim()
    }

    const response = await archivalApi.fetchFiles(query)
    masterFiles.value = response.data
    filesMeta.value = response.meta
  }
  catch {
    toast.error('No se pudieron cargar los expedientes maestros.')
    masterFiles.value = []
  }
  finally {
    loading.value = false
  }
}

async function loadMasterDocuments(page = 1) {
  searching.value = true

  try {
    const response = await archivalApi.searchMasterDocuments({
      search: debouncedDocumentSearch.value.trim() || undefined,
      doc_document_type_id: documentTypeId.value ?? undefined,
      page,
      per_page: 20,
    })
    masterDocuments.value = response.data ?? []
    documentsMeta.value = response.meta
  }
  catch {
    toast.error('No se pudieron cargar los documentos maestros.')
    masterDocuments.value = []
  }
  finally {
    searching.value = false
  }
}

watch(activeTab, async (tab) => {
  if (tab === 'files') {
    await loadMasterFiles()
  }
  else {
    await loadMasterDocuments()
  }
})

watch(debouncedDocumentSearch, () => {
  if (activeTab.value === 'documents') {
    void loadMasterDocuments()
  }
})

watch(documentTypeId, () => {
  if (activeTab.value === 'documents') {
    void loadMasterDocuments()
  }
})

onMounted(async () => {
  await loadDocTypes()
  await loadMasterFiles()
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">
          Documentos maestros
        </h1>
        <p class="text-sm text-muted-foreground">
          Expedientes maestros por titular y documentos reutilizables entre expedientes.
        </p>
      </div>
      <Button variant="outline" @click="router.push('/expedientes')">
        Volver al listado
      </Button>
    </div>

    <Tabs v-model="activeTab">
      <TabsList>
        <TabsTrigger value="files">
          Expedientes maestros
        </TabsTrigger>
        <TabsTrigger value="documents">
          Documentos maestros
        </TabsTrigger>
      </TabsList>

      <TabsContent value="files" class="space-y-4">
        <div class="flex flex-wrap gap-2">
          <Input
            v-model="fileSearch"
            class="max-w-sm"
            placeholder="Buscar por titular, documento o número…"
            @keyup.enter="loadMasterFiles()"
          />
          <Button variant="outline" :disabled="loading" @click="loadMasterFiles()">
            Buscar
          </Button>
        </div>

        <Card>
          <CardContent class="pt-6">
            <div v-if="loading" class="py-8 text-center text-muted-foreground">
              Cargando expedientes maestros…
            </div>
            <div v-else-if="masterFiles.length === 0" class="py-8 text-center text-muted-foreground">
              No hay expedientes maestros registrados.
            </div>
            <Table v-else>
              <TableHeader>
                <TableRow>
                  <TableHead>Expediente</TableHead>
                  <TableHead>Titular</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Documentos maestros</TableHead>
                  <TableHead class="text-right">
                    Acción
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="file in masterFiles" :key="file.id">
                  <TableCell class="font-mono text-xs">
                    {{ file.file_number }}
                  </TableCell>
                  <TableCell>
                    <div class="text-sm">
                      {{ file.entity_label ?? '—' }}
                    </div>
                    <div v-if="file.entity_key" class="text-xs text-muted-foreground">
                      {{ file.entity_key }}
                    </div>
                  </TableCell>
                  <TableCell class="text-sm">
                    {{ file.file_type?.name ?? '—' }}
                  </TableCell>
                  <TableCell class="text-sm">
                    {{ statusLabel(file.status) }}
                  </TableCell>
                  <TableCell>
                    {{ file.master_documents_count ?? 0 }}
                  </TableCell>
                  <TableCell class="text-right">
                    <Button variant="outline" size="sm" @click="router.push(`/expedientes/${file.id}`)">
                      Abrir
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="documents" class="space-y-4">
        <div class="grid gap-3 md:grid-cols-2">
          <Input
            v-model="documentSearch"
            placeholder="Buscar por título, titular o expediente…"
          />
          <Select
            :model-value="documentTypeId != null ? String(documentTypeId) : 'all'"
            @update:model-value="documentTypeId = $event === 'all' ? null : Number($event)"
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos los tipos documentales" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                Todos los tipos documentales
              </SelectItem>
              <SelectItem
                v-for="docType in docTypeOptions"
                :key="docType.id"
                :value="String(docType.id)"
              >
                {{ docType.label }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent class="pt-6">
            <div v-if="searching" class="py-8 text-center text-muted-foreground">
              Cargando documentos maestros…
            </div>
            <div v-else-if="masterDocuments.length === 0" class="py-8 text-center text-muted-foreground">
              No hay documentos maestros vigentes.
            </div>
            <Table v-else>
              <TableHeader>
                <TableRow>
                  <TableHead>Documento</TableHead>
                  <TableHead>Tipo documental</TableHead>
                  <TableHead>Expediente origen</TableHead>
                  <TableHead>Titular</TableHead>
                  <TableHead>Versión</TableHead>
                  <TableHead class="text-right">
                    Acción
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="document in masterDocuments" :key="document.id">
                  <TableCell class="text-sm font-medium">
                    {{ document.title }}
                  </TableCell>
                  <TableCell class="text-sm">
                    {{ document.document_type_name ?? '—' }}
                  </TableCell>
                  <TableCell class="font-mono text-xs">
                    {{ document.file_number ?? '—' }}
                  </TableCell>
                  <TableCell class="text-sm">
                    {{ document.entity_label ?? '—' }}
                  </TableCell>
                  <TableCell>
                    v{{ document.version_number }}
                  </TableCell>
                  <TableCell class="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      @click="router.push(`/expedientes/${document.file_id}`)"
                    >
                      Ver expediente
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  </div>
</template>
