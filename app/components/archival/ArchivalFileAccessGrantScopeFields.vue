<script setup lang="ts">
import type { DocDocumentTypeRow, DocSeriesRow, DocSubseriesRow } from '~/types/archival-catalog'
import type { ArchivalFile, ArchivalFileType } from '~/types/archival-file'

export interface ArchivalAccessGrantScopeState {
  archival_file_type_id: string
  doc_series_id: string
  doc_subseries_id: string
  doc_document_type_id: string
  archival_file_id: string
  starts_at: string
  ends_at: string
}

const props = defineProps<{
  scope: ArchivalAccessGrantScopeState
  fileTypes: ArchivalFileType[]
  lockFileTypeId?: number | null
  orgUnitId?: number | null
  showFileTypeSelect?: boolean
  showFilePicker?: boolean
  disabled?: boolean
}>()

const archivalApi = useArchivalFileApi()
const catalogApi = useArchivalCatalogApi()

const seriesList = ref<DocSeriesRow[]>([])
const subseriesList = ref<DocSubseriesRow[]>([])
const documentTypes = ref<DocDocumentTypeRow[]>([])
const fileSearch = ref('')
const fileOptions = ref<ArchivalFile[]>([])
const loadingFiles = ref(false)

const selectedFileType = computed(() => {
  const typeId = props.lockFileTypeId ?? (props.scope.archival_file_type_id ? Number(props.scope.archival_file_type_id) : null)

  if (!typeId) {
    return null
  }

  return props.fileTypes.find(type => type.id === typeId) ?? null
})

const orgUnitId = computed(() => {
  if (props.orgUnitId) {
    return props.orgUnitId
  }

  return selectedFileType.value?.org_unit_id ?? null
})

function nullableId(value: string): number | null {
  return value ? Number(value) : null
}

async function loadSeries() {
  seriesList.value = await catalogApi.fetchSeries(300, orgUnitId.value ?? undefined)
}

async function loadSubseries() {
  const seriesId = nullableId(props.scope.doc_series_id)
  subseriesList.value = seriesId ? await catalogApi.fetchSubseries(seriesId) : []
}

async function loadDocumentTypes() {
  const subseriesId = nullableId(props.scope.doc_subseries_id)
  documentTypes.value = subseriesId ? await catalogApi.fetchDocumentTypes(subseriesId) : []
}

async function searchFiles(term: string) {
  if (!props.showFilePicker || term.trim().length < 2) {
    fileOptions.value = []
    return
  }

  loadingFiles.value = true

  try {
    const result = await archivalApi.fetchFiles({
      search: term.trim(),
      per_page: 10,
      ...(props.scope.archival_file_type_id
        ? { archival_file_type_id: Number(props.scope.archival_file_type_id) }
        : {}),
    })
    fileOptions.value = result.data
  }
  catch {
    fileOptions.value = []
  }
  finally {
    loadingFiles.value = false
  }
}

let fileSearchTimer: ReturnType<typeof setTimeout> | null = null

function onFileSearchInput(value: string | number) {
  fileSearch.value = String(value)

  if (fileSearchTimer) {
    clearTimeout(fileSearchTimer)
  }

  fileSearchTimer = setTimeout(() => {
    void searchFiles(fileSearch.value)
  }, 300)
}

watch(
  () => props.lockFileTypeId,
  (lockedId) => {
    if (lockedId) {
      props.scope.archival_file_type_id = String(lockedId)
    }
  },
  { immediate: true },
)

watch(
  () => props.scope.archival_file_type_id,
  async (next, prev) => {
    if (prev !== undefined && next !== prev) {
      props.scope.doc_series_id = ''
      props.scope.doc_subseries_id = ''
      props.scope.doc_document_type_id = ''
      subseriesList.value = []
      documentTypes.value = []
    }

    await loadSeries()

    if (props.scope.doc_series_id) {
      await loadSubseries()
    }

    if (props.scope.doc_subseries_id) {
      await loadDocumentTypes()
    }
  },
  { immediate: true },
)

watch(
  () => props.scope.doc_series_id,
  async () => {
    props.scope.doc_subseries_id = ''
    props.scope.doc_document_type_id = ''
    documentTypes.value = []
    await loadSubseries()
  },
)

watch(
  () => props.scope.doc_subseries_id,
  async () => {
    props.scope.doc_document_type_id = ''
    await loadDocumentTypes()
  },
)

watch(
  () => props.scope.archival_file_id,
  async (fileId) => {
    if (!fileId || !props.showFilePicker) {
      return
    }

    try {
      const file = await archivalApi.fetchFile(Number(fileId))
      fileSearch.value = `${file.file_number} — ${file.title}`
    }
    catch {
      fileSearch.value = ''
    }
  },
  { immediate: true },
)
</script>

<template>
  <div class="space-y-4 rounded-lg border border-dashed border-primary/25 bg-muted/10 p-3">
    <p class="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
      Alcance del permiso
    </p>

    <div v-if="showFileTypeSelect !== false && !lockFileTypeId" class="space-y-2">
      <Label>Tipo de expediente (opcional)</Label>
      <Select
        :model-value="scope.archival_file_type_id || undefined"
        :disabled="disabled"
        @update:model-value="scope.archival_file_type_id = $event ? String($event) : ''"
      >
        <SelectTrigger>
          <SelectValue placeholder="Todos los tipos" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">
            Todos
          </SelectItem>
          <SelectItem
            v-for="type in fileTypes"
            :key="type.id"
            :value="String(type.id)"
          >
            {{ type.name }}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div class="grid gap-3 md:grid-cols-3">
      <div class="space-y-2">
        <Label>Serie (opcional)</Label>
        <Select
          :model-value="scope.doc_series_id || undefined"
          :disabled="disabled || seriesList.length === 0"
          @update:model-value="scope.doc_series_id = $event ? String($event) : ''"
        >
          <SelectTrigger>
            <SelectValue placeholder="Todas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">
              Todas
            </SelectItem>
            <SelectItem
              v-for="series in seriesList"
              :key="series.id"
              :value="String(series.id)"
            >
              {{ series.code }} — {{ series.name }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div class="space-y-2">
        <Label>Subserie (opcional)</Label>
        <Select
          :model-value="scope.doc_subseries_id || undefined"
          :disabled="disabled || !scope.doc_series_id"
          @update:model-value="scope.doc_subseries_id = $event ? String($event) : ''"
        >
          <SelectTrigger>
            <SelectValue placeholder="Todas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">
              Todas
            </SelectItem>
            <SelectItem
              v-for="subseries in subseriesList"
              :key="subseries.id"
              :value="String(subseries.id)"
            >
              {{ subseries.code }} — {{ subseries.name }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div class="space-y-2">
        <Label>Tipo documental (opcional)</Label>
        <Select
          :model-value="scope.doc_document_type_id || undefined"
          :disabled="disabled || !scope.doc_subseries_id"
          @update:model-value="scope.doc_document_type_id = $event ? String($event) : ''"
        >
          <SelectTrigger>
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">
              Todos
            </SelectItem>
            <SelectItem
              v-for="docType in documentTypes"
              :key="docType.id"
              :value="String(docType.id)"
            >
              {{ docType.code }} — {{ docType.name }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>

    <div v-if="showFilePicker" class="space-y-2">
      <Label>Expediente específico (opcional)</Label>
      <Input
        :model-value="fileSearch"
        :disabled="disabled"
        placeholder="Buscar por número o título…"
        @update:model-value="onFileSearchInput"
      />
      <div v-if="loadingFiles" class="text-xs text-muted-foreground">
        Buscando expedientes…
      </div>
      <div v-else-if="fileOptions.length" class="rounded-md border">
        <button
          v-for="file in fileOptions"
          :key="file.id"
          type="button"
          class="flex w-full items-start gap-2 border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted/50"
          :disabled="disabled"
          @click="scope.archival_file_id = String(file.id); fileSearch = `${file.file_number} — ${file.title}`; fileOptions = []"
        >
          <span class="font-mono text-xs text-muted-foreground">{{ file.file_number }}</span>
          <span>{{ file.title }}</span>
        </button>
      </div>
      <Button
        v-if="scope.archival_file_id"
        type="button"
        variant="ghost"
        size="sm"
        class="h-7 px-2 text-xs"
        :disabled="disabled"
        @click="scope.archival_file_id = ''; fileSearch = ''"
      >
        Quitar expediente específico
      </Button>
    </div>

    <div class="grid gap-3 md:grid-cols-2">
      <div class="space-y-2">
        <Label for="grant_starts_at">Vigencia desde (opcional)</Label>
        <Input
          id="grant_starts_at"
          v-model="scope.starts_at"
          type="date"
          :disabled="disabled"
        />
      </div>
      <div class="space-y-2">
        <Label for="grant_ends_at">Vigencia hasta (opcional)</Label>
        <Input
          id="grant_ends_at"
          v-model="scope.ends_at"
          type="date"
          :disabled="disabled"
        />
      </div>
    </div>
  </div>
</template>
