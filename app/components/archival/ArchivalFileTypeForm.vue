<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { ProducerAreaDraft } from '~/components/archival/ArchivalFileTypeProducerAreasEditor.vue'
import { ARCHIVAL_FILE_MODEL_LABELS } from '~/constants/archival-file'
import { suggestArchivalFileTypeKey } from '~/utils/archival-file-type-key'
import type { ArchivalMetadataSchemaRow } from '~/composables/useArchivalMetadataApi'
import type { OrgUnitRow } from '~/composables/useOrgStructureApi'
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
const trdApi = useTrdApi()
const metaApi = useArchivalMetadataApi()
const orgApi = useOrgStructureApi()

const loading = ref(true)
const saving = ref(false)
const submitAttempted = ref(false)
const producerAreasEditorRef = ref<{ hydrateAllRows: () => Promise<void> } | null>(null)

const orgUnits = ref<OrgUnitRow[]>([])
const trdTables = ref<TrdTableRow[]>([])
const metadataSchemas = ref<ArchivalMetadataSchemaRow[]>([])
const producerAreas = ref<ProducerAreaDraft[]>([])

const form = reactive({
  type_key: '',
  name: '',
  description: '',
  model: 'entity_case' as ArchivalFileModel,
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

function mapProducerAreasFromType(type: ArchivalFileType | null | undefined): ProducerAreaDraft[] {
  return (type?.producer_areas ?? []).map((area, index) => ({
    org_unit_id: area.org_unit_id,
    trd_table_id: area.trd_table_id ?? null,
    doc_series_id: area.doc_series_id ?? null,
    doc_subseries_id: area.doc_subseries_id ?? null,
    doc_document_type_id: area.doc_document_type_id ?? null,
    sort_order: area.sort_order ?? index,
    org_unit: area.org_unit ?? null,
    doc_series: area.doc_series ?? null,
    doc_subseries: area.doc_subseries ?? null,
    doc_document_type: area.doc_document_type ?? null,
  }))
}

function applyInitial(type: ArchivalFileType | null | undefined) {
  form.type_key = type?.type_key ?? ''
  form.name = type?.name ?? ''
  form.description = type?.description ?? ''
  form.model = type?.model ?? 'entity_case'
  form.archival_metadata_schema_id = type?.archival_metadata_schema_id ? String(type.archival_metadata_schema_id) : ''
  form.allows_master_documents = type?.allows_master_documents ?? false
  form.is_active = type?.is_active ?? true
  form.sort_order = type?.sort_order ?? 0
  producerAreas.value = mapProducerAreasFromType(type)
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
    await nextTick()
    await producerAreasEditorRef.value?.hydrateAllRows()
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
    producer_areas: producerAreas.value
      .filter(row => row.org_unit_id != null && row.doc_series_id != null && row.doc_subseries_id != null)
      .map((row, index) => ({
        org_unit_id: row.org_unit_id,
        trd_table_id: row.trd_table_id,
        doc_series_id: row.doc_series_id,
        doc_subseries_id: row.doc_subseries_id,
        doc_document_type_id: row.doc_document_type_id,
        sort_order: index,
      })),
    archival_metadata_schema_id: form.archival_metadata_schema_id ? Number(form.archival_metadata_schema_id) : null,
    allows_master_documents: form.allows_master_documents,
    is_active: form.is_active,
    sort_order: Number(form.sort_order) || 0,
  }

  if (!props.isCreate) {
    payload.type_key = form.type_key.trim()
  }

  return payload
}

function validateProducerAreas(): boolean {
  const incomplete = producerAreas.value.find(
    row => row.org_unit_id == null || row.doc_series_id == null || row.doc_subseries_id == null,
  )

  if (incomplete) {
    toast.error('Complete área, serie y subserie en cada fila de áreas productoras, o elimine la fila incompleta.')
    return false
  }

  return true
}

async function submit() {
  submitAttempted.value = true

  if (!form.name.trim()) {
    toast.error('Complete el nombre del tipo.')
    await nextTick()
    focusArchivalFieldById('file_type_name')
    return
  }

  if (!validateProducerAreas()) {
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

watch(() => props.initial, async (value) => {
  if (loading.value) {
    return
  }

  applyInitial(value)
  await nextTick()
  await producerAreasEditorRef.value?.hydrateAllRows()
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

        <div class="min-w-0 space-y-4 rounded-lg border bg-muted/20 p-4">
          <ArchivalFileTypeProducerAreasEditor
            ref="producerAreasEditorRef"
            v-model="producerAreas"
            :org-units="orgUnits"
            :trd-tables="trdTables"
            :disabled="saving"
          />
          <p
            v-if="form.model === 'org_area'"
            class="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground"
          >
            Tipos <span class="font-medium text-foreground">por área</span>: configure la TRD de cada dependencia que
            usará este tipo. Al adjuntar documentos se aplicará la fila que coincida con el área del expediente.
          </p>
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
