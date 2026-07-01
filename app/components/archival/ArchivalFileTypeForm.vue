<script setup lang="ts">
import { toast } from 'vue-sonner'
import { ARCHIVAL_FILE_MODEL_LABELS } from '~/constants/archival-file'
import type { ArchivalMetadataSchemaRow } from '~/composables/useArchivalMetadataApi'
import type { OrgUnitRow } from '~/composables/useOrgStructureApi'
import type { DocDocumentTypeRow, DocSeriesRow, DocSubseriesRow } from '~/types/archival-catalog'
import type { ArchivalFileModel, ArchivalFileType } from '~/types/archival-file'
import type { TrdTableRow } from '~/types/archival-trd'

const props = defineProps<{
  initial?: ArchivalFileType | null
  isCreate?: boolean
}>()

const emit = defineEmits<{
  saved: [type: ArchivalFileType]
}>()

const archivalApi = useArchivalFileApi()
const catalogApi = useArchivalCatalogApi()
const trdApi = useTrdApi()
const metaApi = useArchivalMetadataApi()
const orgApi = useOrgStructureApi()

const loading = ref(true)
const saving = ref(false)

const orgUnits = ref<OrgUnitRow[]>([])
const trdTables = ref<TrdTableRow[]>([])
const metadataSchemas = ref<ArchivalMetadataSchemaRow[]>([])
const seriesList = ref<DocSeriesRow[]>([])
const subseriesList = ref<DocSubseriesRow[]>([])
const documentTypes = ref<DocDocumentTypeRow[]>([])

const form = reactive({
  type_key: '',
  name: '',
  description: '',
  model: 'entity_case' as ArchivalFileModel,
  org_unit_id: '',
  doc_series_id: '',
  doc_subseries_id: '',
  doc_document_type_id: '',
  trd_table_id: '',
  archival_metadata_schema_id: '',
  allows_master_documents: false,
  is_active: true,
  sort_order: 0,
})

const isSystem = computed(() => props.initial?.is_system === true)

const filteredTrdTables = computed(() => {
  if (!form.org_unit_id) {
    return trdTables.value
  }

  return trdTables.value.filter(table => String(table.org_unit_id) === form.org_unit_id)
})

const filteredMetadataSchemas = computed(() => {
  const typeKey = form.type_key.trim()

  return metadataSchemas.value.filter((schema) => {
    if (schema.status !== 'active') {
      return false
    }

    if (!typeKey) {
      return true
    }

    return !schema.file_type_key || schema.file_type_key === typeKey
  })
})

function nullableId(value: string): number | null {
  return value ? Number(value) : null
}

function applyInitial(type: ArchivalFileType | null | undefined) {
  form.type_key = type?.type_key ?? ''
  form.name = type?.name ?? ''
  form.description = type?.description ?? ''
  form.model = type?.model ?? 'entity_case'
  form.org_unit_id = type?.org_unit_id ? String(type.org_unit_id) : ''
  form.doc_series_id = type?.doc_series_id ? String(type.doc_series_id) : ''
  form.doc_subseries_id = type?.doc_subseries_id ? String(type.doc_subseries_id) : ''
  form.doc_document_type_id = type?.doc_document_type_id ? String(type.doc_document_type_id) : ''
  form.trd_table_id = type?.trd_table_id ? String(type.trd_table_id) : ''
  form.archival_metadata_schema_id = type?.archival_metadata_schema_id ? String(type.archival_metadata_schema_id) : ''
  form.allows_master_documents = type?.allows_master_documents ?? false
  form.is_active = type?.is_active ?? true
  form.sort_order = type?.sort_order ?? 0
}

async function loadSeries() {
  const orgUnitId = nullableId(form.org_unit_id)
  seriesList.value = await catalogApi.fetchSeries(300, orgUnitId ?? undefined)
}

async function loadSubseries() {
  const seriesId = nullableId(form.doc_series_id)
  subseriesList.value = seriesId ? await catalogApi.fetchSubseries(seriesId) : []
}

async function loadDocumentTypes() {
  const subseriesId = nullableId(form.doc_subseries_id)
  documentTypes.value = subseriesId ? await catalogApi.fetchDocumentTypes(subseriesId) : []
}

async function loadCatalogs() {
  loading.value = true

  try {
    const [units, tables, schemas] = await Promise.all([
      orgApi.fetchUnits({ activeOnly: true }),
      trdApi.fetchTables(),
      metaApi.fetchSchemas(),
    ])

    orgUnits.value = units
    trdTables.value = tables
    metadataSchemas.value = schemas

    applyInitial(props.initial)
    await loadSeries()
    await loadSubseries()
    await loadDocumentTypes()
  }
  catch {
    toast.error('No se pudieron cargar los catálogos.')
  }
  finally {
    loading.value = false
  }
}

function buildPayload(): Record<string, unknown> {
  return {
    type_key: form.type_key.trim(),
    name: form.name.trim(),
    description: form.description.trim() || null,
    model: form.model,
    org_unit_id: nullableId(form.org_unit_id),
    doc_series_id: nullableId(form.doc_series_id),
    doc_subseries_id: nullableId(form.doc_subseries_id),
    doc_document_type_id: nullableId(form.doc_document_type_id),
    trd_table_id: nullableId(form.trd_table_id),
    archival_metadata_schema_id: nullableId(form.archival_metadata_schema_id),
    allows_master_documents: form.allows_master_documents,
    is_active: form.is_active,
    sort_order: Number(form.sort_order) || 0,
  }
}

async function submit() {
  if (!form.type_key.trim() || !form.name.trim()) {
    toast.error('Complete la clave y el nombre del tipo.')
    return
  }

  saving.value = true

  try {
    const res = await archivalApi.saveFileType(buildPayload(), props.isCreate ? undefined : props.initial?.id)
    toast.success(res.message)
    emit('saved', res.data)
  }
  catch (error: unknown) {
    const err = error as { data?: { message?: string, errors?: Record<string, string[]> } }
    const first = err.data?.errors ? Object.values(err.data.errors)[0]?.[0] : null
    toast.error(first ?? err.data?.message ?? 'No se pudo guardar el tipo.')
  }
  finally {
    saving.value = false
  }
}

watch(() => form.org_unit_id, async () => {
  if (loading.value) {
    return
  }

  form.doc_series_id = ''
  form.doc_subseries_id = ''
  form.doc_document_type_id = ''
  await loadSeries()
  subseriesList.value = []
  documentTypes.value = []
})

watch(() => form.doc_series_id, async () => {
  if (loading.value) {
    return
  }

  form.doc_subseries_id = ''
  form.doc_document_type_id = ''
  await loadSubseries()
  documentTypes.value = []
})

watch(() => form.doc_subseries_id, async () => {
  if (loading.value) {
    return
  }

  form.doc_document_type_id = ''
  await loadDocumentTypes()
})

watch(() => props.initial, (value) => {
  if (!loading.value) {
    applyInitial(value)
  }
})

onMounted(() => loadCatalogs())
</script>

<template>
  <form class="space-y-6" @submit.prevent="submit">
    <div v-if="loading" class="py-8 text-center text-sm text-muted-foreground">
      Cargando configuración…
    </div>

    <template v-else>
      <div class="grid gap-4 md:grid-cols-2">
        <div class="space-y-2">
          <Label for="file_type_key">Clave técnica</Label>
          <Input
            id="file_type_key"
            v-model="form.type_key"
            :disabled="isSystem || saving"
            placeholder="credit_file"
            class="font-mono"
          />
          <p v-if="isSystem" class="text-xs text-muted-foreground">
            La clave de tipos del sistema no se puede modificar.
          </p>
        </div>

        <div class="space-y-2">
          <Label for="file_type_name">Nombre</Label>
          <Input id="file_type_name" v-model="form.name" :disabled="saving" />
        </div>
      </div>

      <div class="space-y-2">
        <Label for="file_type_description">Descripción</Label>
        <Textarea id="file_type_description" v-model="form.description" rows="2" :disabled="saving" />
      </div>

      <div class="grid gap-4 md:grid-cols-3">
        <div class="space-y-2">
          <Label>Modelo</Label>
          <Select v-model="form.model" :disabled="saving">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="(label, value) in ARCHIVAL_FILE_MODEL_LABELS"
                :key="value"
                :value="value"
              >
                {{ label }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="space-y-2">
          <Label>Orden</Label>
          <Input v-model.number="form.sort_order" type="number" min="0" :disabled="saving" />
        </div>

        <div class="flex flex-col justify-end gap-3 pb-1">
          <div class="flex items-center gap-2">
            <Checkbox id="file_type_active" v-model="form.is_active" :disabled="saving" />
            <Label for="file_type_active" class="font-normal">Activo</Label>
          </div>
          <div class="flex items-center gap-2">
            <Checkbox id="file_type_master" v-model="form.allows_master_documents" :disabled="saving" />
            <Label for="file_type_master" class="font-normal">Permite documentos maestros</Label>
          </div>
        </div>
      </div>

      <div class="space-y-3 rounded-lg border bg-muted/20 p-4">
        <div>
          <p class="text-sm font-medium">
            Catálogo documental y TRD
          </p>
          <p class="text-xs text-muted-foreground">
            Serie, subserie y tipo documental de referencia para expedientes de este tipo.
          </p>
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <div class="space-y-2">
            <Label>Área productora</Label>
            <Select
              :model-value="form.org_unit_id || undefined"
              :disabled="saving"
              @update:model-value="form.org_unit_id = $event ? String($event) : ''"
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccione área" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="unit in orgUnits"
                  :key="unit.id"
                  :value="String(unit.id)"
                >
                  {{ unit.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-2">
            <Label>Tabla TRD</Label>
            <Select
              :model-value="form.trd_table_id || undefined"
              :disabled="saving"
              @update:model-value="form.trd_table_id = $event ? String($event) : ''"
            >
              <SelectTrigger>
                <SelectValue placeholder="Opcional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="table in filteredTrdTables"
                  :key="table.id"
                  :value="String(table.id)"
                >
                  {{ table.org_unit?.name ?? `Tabla #${table.id}` }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div class="grid gap-4 md:grid-cols-3">
          <div class="space-y-2">
            <Label>Serie</Label>
            <Select
              :model-value="form.doc_series_id || undefined"
              :disabled="saving || !form.org_unit_id"
              @update:model-value="form.doc_series_id = $event ? String($event) : ''"
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccione serie" />
              </SelectTrigger>
              <SelectContent>
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
            <Label>Subserie</Label>
            <Select
              :model-value="form.doc_subseries_id || undefined"
              :disabled="saving || !form.doc_series_id"
              @update:model-value="form.doc_subseries_id = $event ? String($event) : ''"
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccione subserie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="sub in subseriesList"
                  :key="sub.id"
                  :value="String(sub.id)"
                >
                  {{ sub.code }} — {{ sub.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-2">
            <Label>Tipo documental</Label>
            <Select
              :model-value="form.doc_document_type_id || undefined"
              :disabled="saving || !form.doc_subseries_id"
              @update:model-value="form.doc_document_type_id = $event ? String($event) : ''"
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccione tipo" />
              </SelectTrigger>
              <SelectContent>
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
      </div>

      <div class="space-y-2">
        <Label>Esquema de metadatos</Label>
        <Select
          :model-value="form.archival_metadata_schema_id || undefined"
          :disabled="saving"
          @update:model-value="form.archival_metadata_schema_id = $event ? String($event) : ''"
        >
          <SelectTrigger>
            <SelectValue placeholder="Opcional" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem
              v-for="schema in filteredMetadataSchemas"
              :key="schema.id"
              :value="String(schema.id)"
            >
              {{ schema.name }}
              <span v-if="schema.version_number" class="text-muted-foreground"> v{{ schema.version_number }}</span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div class="flex justify-end">
        <Button type="submit" :disabled="saving">
          {{ saving ? 'Guardando…' : (isCreate ? 'Crear tipo' : 'Guardar cambios') }}
        </Button>
      </div>
    </template>
  </form>
</template>
