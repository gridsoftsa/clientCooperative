<script setup lang="ts">
import { toast } from 'vue-sonner'
import { ARCHIVAL_FILE_MODEL_LABELS } from '~/constants/archival-file'
import { suggestArchivalFileTypeKey } from '~/utils/archival-file-type-key'
import type { ArchivalMetadataSchemaRow } from '~/composables/useArchivalMetadataApi'
import type { OrgUnitRow } from '~/composables/useOrgStructureApi'
import type { DocSeriesRow, DocSubseriesRow } from '~/types/archival-catalog'
import type { ArchivalFileModel, ArchivalFileType } from '~/types/archival-file'
import type { TrdTableRow } from '~/types/archival-trd'
import {
  archivalInputWarningClass,
  focusArchivalFieldById,
} from '~/utils/archival-form-validation'

const props = defineProps<{
  initial?: ArchivalFileType | null
  isCreate?: boolean
}>()

const emit = defineEmits<{
  saved: [type: ArchivalFileType]
  cancel: []
}>()

const archivalApi = useArchivalFileApi()
const catalogApi = useArchivalCatalogApi()
const trdApi = useTrdApi()
const metaApi = useArchivalMetadataApi()
const orgApi = useOrgStructureApi()

const loading = ref(true)
const saving = ref(false)
const submitAttempted = ref(false)
/** Evita que los watchers de cascada borren subserie/tipo tras `applyInitial` (cola de watchers post-async). */
const suppressCascadeWatch = ref(false)

const orgUnits = ref<OrgUnitRow[]>([])
const trdTables = ref<TrdTableRow[]>([])
const metadataSchemas = ref<ArchivalMetadataSchemaRow[]>([])
const seriesList = ref<DocSeriesRow[]>([])
const subseriesList = ref<DocSubseriesRow[]>([])

const form = reactive({
  type_key: '',
  name: '',
  description: '',
  model: 'entity_case' as ArchivalFileModel,
  org_unit_id: '',
  doc_series_id: '',
  doc_subseries_id: '',
  trd_table_id: '',
  archival_metadata_schema_id: '',
  allows_master_documents: false,
  is_active: true,
  sort_order: 0,
})

const isSystem = computed(() => props.initial?.is_system === true)

const effectiveTypeKey = computed(() => {
  if (props.isCreate) {
    return suggestArchivalFileTypeKey(form.name)
  }

  return form.type_key.trim()
})

const filteredTrdTables = computed(() => {
  if (!form.org_unit_id) {
    return trdTables.value
  }

  return trdTables.value.filter(table => String(table.org_unit_id) === form.org_unit_id)
})

const filteredMetadataSchemas = computed(() => {
  const typeKey = effectiveTypeKey.value

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

const orgUnitSelectOptions = computed(() =>
  orgUnits.value.map(unit => ({
    value: String(unit.id),
    label: unit.name,
  })),
)

const trdTableSelectOptions = computed(() =>
  filteredTrdTables.value.map(table => ({
    value: String(table.id),
    label: table.org_unit?.name ?? `Tabla #${table.id}`,
  })),
)

const seriesSelectOptions = computed(() =>
  ensureSeriesInList(seriesList.value).map(series => ({
    value: String(series.id),
    label: `${series.code} — ${series.name}`,
  })),
)

function ensureSeriesInList(list: DocSeriesRow[]): DocSeriesRow[] {
  const initialSeries = props.initial?.doc_series
  const selectedId = nullableId(form.doc_series_id)

  if (
    initialSeries
    && selectedId === initialSeries.id
    && !list.some(row => row.id === initialSeries.id)
  ) {
    return [
      ...list,
      {
        id: initialSeries.id,
        org_unit_id: nullableId(form.org_unit_id) ?? 0,
        code: initialSeries.code,
        name: initialSeries.name,
        is_active: true,
      } as DocSeriesRow,
    ]
  }

  return list
}

function ensureSubseriesInList(list: DocSubseriesRow[]): DocSubseriesRow[] {
  const initialSub = props.initial?.doc_subseries
  const selectedId = nullableId(form.doc_subseries_id)

  if (
    initialSub
    && selectedId === initialSub.id
    && !list.some(row => row.id === initialSub.id)
  ) {
    return [
      ...list,
      {
        id: initialSub.id,
        doc_series_id: initialSub.doc_series_id ?? nullableId(form.doc_series_id) ?? 0,
        code: initialSub.code,
        name: initialSub.name,
      } as DocSubseriesRow,
    ]
  }

  return list
}

const subseriesSelectOptions = computed(() =>
  ensureSubseriesInList(subseriesList.value).map(sub => ({
    value: String(sub.id),
    label: `${sub.code} — ${sub.name}`,
  })),
)

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

async function hydrateCatalogCascade() {
  suppressCascadeWatch.value = true

  try {
    await loadSeries()
    await loadSubseries()
  }
  finally {
    await nextTick()
    suppressCascadeWatch.value = false
  }
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
    await hydrateCatalogCascade()
  }
  catch {
    toast.error('No se pudieron cargar los catálogos.')
  }
  finally {
    loading.value = false
  }
}

function buildPayload(): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    name: form.name.trim(),
    description: form.description.trim() || null,
    model: form.model,
    org_unit_id: nullableId(form.org_unit_id),
    doc_series_id: nullableId(form.doc_series_id),
    doc_subseries_id: nullableId(form.doc_subseries_id),
    doc_document_type_id: null,
    trd_table_id: nullableId(form.trd_table_id),
    archival_metadata_schema_id: nullableId(form.archival_metadata_schema_id),
    allows_master_documents: form.allows_master_documents,
    is_active: form.is_active,
    sort_order: Number(form.sort_order) || 0,
  }

  if (!props.isCreate) {
    payload.type_key = form.type_key.trim()
  }

  return payload
}

async function submit() {
  submitAttempted.value = true

  if (!form.name.trim()) {
    toast.error('Complete el nombre del tipo.')
    await nextTick()
    focusArchivalFieldById('file_type_name')
    return
  }

  if (!form.doc_series_id || !form.doc_subseries_id) {
    toast.error('Seleccione la serie y la subserie del catálogo TRD.')
    return
  }

  if (!props.isCreate && !form.type_key.trim()) {
    toast.error('Complete la clave técnica del tipo.')
    await nextTick()
    focusArchivalFieldById('file_type_key')
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
  if (loading.value || suppressCascadeWatch.value) {
    return
  }

  if (
    form.trd_table_id
    && !filteredTrdTables.value.some(table => String(table.id) === form.trd_table_id)
  ) {
    form.trd_table_id = ''
  }

  form.doc_series_id = ''
  form.doc_subseries_id = ''
  await loadSeries()
  subseriesList.value = []
})

watch(() => form.doc_series_id, async () => {
  if (loading.value || suppressCascadeWatch.value) {
    return
  }

  form.doc_subseries_id = ''
  await loadSubseries()
})

watch(() => props.initial, async (value) => {
  if (loading.value) {
    return
  }

  applyInitial(value)
  await hydrateCatalogCascade()
})

onMounted(() => loadCatalogs())
</script>

<template>
  <form class="space-y-6" @submit.prevent="submit">
    <div v-if="loading" class="py-8 text-center text-sm text-muted-foreground">
      Cargando configuración…
    </div>

    <template v-else>
      <div class="grid gap-8 xl:grid-cols-2 xl:items-start">
        <div class="space-y-6">
          <div class="grid gap-4 md:grid-cols-2">
            <div v-if="isCreate" class="space-y-2 md:col-span-2">
              <p class="text-sm text-muted-foreground leading-relaxed">
                La <span class="font-medium text-foreground">clave técnica</span> se generará automáticamente al crear
                (por ejemplo, a partir del nombre:
                <span class="font-mono text-xs">{{ effectiveTypeKey || 'expediente_contrato_file' }}</span>).
              </p>
            </div>

            <div v-else class="space-y-2 md:col-span-2">
              <Label for="file_type_key">Clave técnica</Label>
              <Input
                id="file_type_key"
                v-model="form.type_key"
                :disabled="isSystem || saving"
                placeholder="credit_file"
                class="font-mono"
                :class="archivalInputWarningClass(submitAttempted && !form.type_key.trim())"
              />
              <p v-if="isSystem" class="text-xs text-muted-foreground">
                La clave de tipos del sistema no se puede modificar.
              </p>
            </div>

            <div class="space-y-2 md:col-span-2">
              <Label for="file_type_name">Nombre *</Label>
              <Input
                id="file_type_name"
                v-model="form.name"
                :disabled="saving"
                :class="archivalInputWarningClass(submitAttempted && !form.name.trim())"
              />
            </div>
          </div>

          <div class="space-y-2">
            <Label for="file_type_description">Descripción</Label>
            <Textarea id="file_type_description" v-model="form.description" rows="3" :disabled="saving" />
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
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
          </div>

          <div class="flex flex-wrap gap-x-6 gap-y-3 rounded-lg border bg-muted/20 p-4">
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

        <div class="space-y-6">
          <div class="min-w-0 space-y-4 rounded-lg border bg-muted/20 p-4">
            <div>
              <p class="text-sm font-medium">
                Catálogo documental y TRD
              </p>
              <p class="text-xs text-muted-foreground">
                Ubicación del expediente en el catálogo TRD (serie y subserie). Los tipos documentales se definen en la pestaña Obligatorios.
              </p>
              <p
                v-if="form.model === 'org_area'"
                class="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground"
              >
                Tipos <span class="font-medium text-foreground">por área</span> (repositorio, auditoría): la TRD aquí es
                <span class="font-medium text-foreground">referencia por defecto</span> para el área seleccionada.
                Cada expediente puede usar otra área productora; al adjuntar se usa la TRD del área del expediente.
                Para biblioteca institucional suele bastar serie <span class="font-mono">005-54</span> / subserie
                <span class="font-mono">54</span> cuando exista en esa área.
              </p>
            </div>

            <div class="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-1">
              <div class="min-w-0 space-y-2">
                <Label for="file_type_org_unit">Área productora</Label>
                <ArchivalCatalogSearchSelect
                  id="file_type_org_unit"
                  :model-value="form.org_unit_id || null"
                  :options="orgUnitSelectOptions"
                  placeholder="Buscar área…"
                  no-options-text="Sin áreas disponibles"
                  :disabled="saving"
                  @update:model-value="form.org_unit_id = $event ?? ''"
                />
              </div>

              <div class="min-w-0 space-y-2">
                <Label for="file_type_trd_table">Tabla TRD</Label>
                <ArchivalCatalogSearchSelect
                  id="file_type_trd_table"
                  :model-value="form.trd_table_id || null"
                  :options="trdTableSelectOptions"
                  placeholder="Buscar tabla TRD…"
                  no-options-text="Sin tablas para el área"
                  :disabled="saving"
                  @update:model-value="form.trd_table_id = $event ?? ''"
                />
              </div>
            </div>

            <div class="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-1">
              <div class="min-w-0 space-y-2">
                <Label for="file_type_series">Serie *</Label>
                <ArchivalCatalogSearchSelect
                  id="file_type_series"
                  :model-value="form.doc_series_id || null"
                  :options="seriesSelectOptions"
                  placeholder="Buscar serie…"
                  no-options-text="Seleccione un área primero"
                  :disabled="saving || !form.org_unit_id"
                  @update:model-value="form.doc_series_id = $event ?? ''"
                />
              </div>

              <div class="min-w-0 space-y-2">
                <Label for="file_type_subseries">Subserie *</Label>
                <ArchivalCatalogSearchSelect
                  id="file_type_subseries"
                  :model-value="form.doc_subseries_id || null"
                  :options="subseriesSelectOptions"
                  placeholder="Buscar subserie…"
                  no-options-text="Seleccione una serie primero"
                  :disabled="saving || !form.doc_series_id"
                  @update:model-value="form.doc_subseries_id = $event ?? ''"
                />
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
        </div>
      </div>

      <div class="flex flex-wrap justify-end gap-2 border-t pt-6">
        <Button
          v-if="!isCreate"
          type="button"
          variant="outline"
          :disabled="saving"
          @click="emit('cancel')"
        >
          Cancelar
        </Button>
        <Button type="submit" :disabled="saving">
          {{ saving ? 'Guardando…' : (isCreate ? 'Crear tipo' : 'Guardar cambios') }}
        </Button>
      </div>
    </template>
  </form>
</template>
