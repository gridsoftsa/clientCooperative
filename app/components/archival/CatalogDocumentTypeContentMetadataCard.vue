<script setup lang="ts">
import { toast } from 'vue-sonner'
import {
  ARCHIVAL_METADATA_FIELD_DATA_TYPE_LABELS,
  ARCHIVAL_METADATA_FIELD_DATA_TYPE_OPTIONS,
} from '~/constants/archival-metadata'
import type { DocDocumentTypeContentMetadata } from '~/types/archival-catalog'
import {
  archivalInputWarningClass,
  focusArchivalFieldById,
} from '~/utils/archival-form-validation'
import { messageFromFetchError } from '~/utils/http-error-message'

const props = withDefaults(
  defineProps<{
    documentTypeId?: number | null
    contentMetadata?: DocDocumentTypeContentMetadata | null
    disabled?: boolean
    highlight?: boolean
    /** En alta: el padre persiste al crear el tipo. */
    persistWithParent?: boolean
  }>(),
  {
    documentTypeId: null,
    persistWithParent: false,
  },
)

const emit = defineEmits<{
  updated: [value: DocDocumentTypeContentMetadata]
}>()

const { $api } = useNuxtApp()

interface DraftField {
  name: string
  data_type: string
  is_required: boolean
  is_searchable: boolean
  is_reportable: boolean
  is_ocr_extractable: boolean
  is_reusable: boolean
}

const enabled = ref(false)
const fields = ref<DraftField[]>([])
const saving = ref(false)
const warningNameIndexes = ref<number[]>([])
const editingIndexes = ref<number[]>([])
const fieldSnapshots = ref<Record<number, DraftField>>({})

const examplePresets: Array<{ label: string, field: DraftField }> = [
  {
    label: 'NIT',
    field: {
      name: 'NIT',
      data_type: 'nit',
      is_required: true,
      is_searchable: true,
      is_reportable: true,
      is_ocr_extractable: true,
      is_reusable: true,
    },
  },
  {
    label: 'Número de documento',
    field: {
      name: 'Número de documento',
      data_type: 'identifier',
      is_required: true,
      is_searchable: true,
      is_reportable: true,
      is_ocr_extractable: true,
      is_reusable: false,
    },
  },
  {
    label: 'Periodo',
    field: {
      name: 'Periodo',
      data_type: 'text',
      is_required: false,
      is_searchable: true,
      is_reportable: true,
      is_ocr_extractable: false,
      is_reusable: false,
    },
  },
]

function emptyField(): DraftField {
  return {
    name: '',
    data_type: 'text',
    is_required: false,
    is_searchable: true,
    is_reportable: false,
    is_ocr_extractable: false,
    is_reusable: false,
  }
}

function hydrateFromProps(): void {
  const meta = props.contentMetadata
  const draftList = meta?.draft?.fields ?? []
  const activeList = meta?.active?.fields ?? []
  const list = (meta?.status === 'active' && activeList.length > 0 && draftList.length === 0)
    ? activeList
    : (draftList.length > 0 ? draftList : activeList)
  enabled.value = (meta?.status ?? 'none') !== 'none' && list.length > 0
  fields.value = list.map(field => ({
    name: field.name,
    data_type: field.data_type,
    is_required: Boolean(field.is_required),
    is_searchable: Boolean(field.is_searchable),
    is_reportable: Boolean(field.is_reportable),
    is_ocr_extractable: Boolean(field.is_ocr_extractable),
    is_reusable: Boolean(field.is_reusable),
  }))
  warningNameIndexes.value = []
  editingIndexes.value = []
  fieldSnapshots.value = {}
}

watch(() => props.contentMetadata, hydrateFromProps, { immediate: true })

function fieldNameId(index: number): string {
  return `dtype_content_meta_name_${index}`
}

function isNameWarning(index: number): boolean {
  return warningNameIndexes.value.includes(index)
}

function clearNameWarning(index: number): void {
  warningNameIndexes.value = warningNameIndexes.value.filter(current => current !== index)
}

function emptyNameIndexes(): number[] {
  return fields.value.flatMap((field, index) => (field.name.trim() ? [] : [index]))
}

async function highlightAndFocusFields(indexes: number[]): Promise<void> {
  warningNameIndexes.value = [...new Set(indexes)]
  editingIndexes.value = [...new Set([...editingIndexes.value, ...indexes])]
  await nextTick()
  const first = indexes[0]
  if (first === undefined) {
    return
  }

  focusArchivalFieldById(fieldNameId(first))
}

function setEnabled(value: boolean | 'indeterminate'): void {
  enabled.value = value === true
  warningNameIndexes.value = []
  if (enabled.value && fields.value.length === 0) {
    fields.value = [emptyField()]
    editingIndexes.value = [0]
  }
}

function addField(preset?: DraftField): void {
  enabled.value = true
  fields.value = [...fields.value, preset ? { ...preset } : emptyField()]
  const index = fields.value.length - 1
  if (!fields.value[index]?.name.trim()) {
    editingIndexes.value = [...editingIndexes.value, index]
    void nextTick(() => focusArchivalFieldById(fieldNameId(index)))
  }
}

function editField(index: number): void {
  const field = fields.value[index]
  if (!field) {
    return
  }

  fieldSnapshots.value = {
    ...fieldSnapshots.value,
    [index]: { ...field },
  }
  if (!editingIndexes.value.includes(index)) {
    editingIndexes.value = [...editingIndexes.value, index]
  }
  void nextTick(() => focusArchivalFieldById(fieldNameId(index)))
}

function cancelEdit(index: number): void {
  const snapshot = fieldSnapshots.value[index]
  if (snapshot) {
    fields.value[index] = { ...snapshot }
    const nextSnapshots = { ...fieldSnapshots.value }
    delete nextSnapshots[index]
    fieldSnapshots.value = nextSnapshots
    editingIndexes.value = editingIndexes.value.filter(current => current !== index)
    clearNameWarning(index)
    return
  }

  if (!(fields.value[index]?.name.trim())) {
    removeField(index)
    return
  }

  editingIndexes.value = editingIndexes.value.filter(current => current !== index)
  clearNameWarning(index)
}

function reindexSet(indexes: number[], removed: number): number[] {
  return indexes
    .filter(current => current !== removed)
    .map(current => (current > removed ? current - 1 : current))
}

function reindexSnapshots(removed: number): Record<number, DraftField> {
  const next: Record<number, DraftField> = {}
  for (const [key, value] of Object.entries(fieldSnapshots.value)) {
    const current = Number(key)
    if (current === removed) {
      continue
    }

    next[current > removed ? current - 1 : current] = value
  }

  return next
}

function removeField(index: number): void {
  fields.value = fields.value.filter((_, current) => current !== index)
  warningNameIndexes.value = reindexSet(warningNameIndexes.value, index)
  editingIndexes.value = reindexSet(editingIndexes.value, index)
  fieldSnapshots.value = reindexSnapshots(index)

  if (fields.value.length === 0) {
    enabled.value = false
    warningNameIndexes.value = []
    editingIndexes.value = []
    fieldSnapshots.value = {}
  }
}

function updateFieldName(index: number, value: string | number): void {
  const field = fields.value[index]
  if (!field) {
    return
  }

  field.name = String(value)
  if (field.name.trim()) {
    clearNameWarning(index)
  }
}

async function ensureDraftValid(): Promise<boolean> {
  if (!enabled.value) {
    return true
  }

  if (fields.value.length === 0) {
    fields.value = [emptyField()]
    await highlightAndFocusFields([0])

    return false
  }

  const missingNames = emptyNameIndexes()
  if (missingNames.length > 0) {
    await highlightAndFocusFields(missingNames)

    return false
  }

  return true
}

async function persist(activate: boolean, documentTypeId = props.documentTypeId): Promise<boolean> {
  if (props.disabled) {
    return false
  }

  if (!await ensureDraftValid()) {
    return false
  }

  if (documentTypeId == null || documentTypeId <= 0) {
    return true
  }

  saving.value = true
  try {
    const res = await $api<{ data: { content_metadata: DocDocumentTypeContentMetadata }, message?: string }>(
      `/archival/catalog/document-types/${documentTypeId}/content-metadata`,
      {
        method: 'POST',
        body: {
          enabled: enabled.value,
          activate,
          fields: enabled.value
            ? fields.value.map(field => ({
                name: field.name.trim(),
                data_type: field.data_type,
                is_required: field.is_required,
                is_searchable: field.is_searchable,
                is_reportable: field.is_reportable,
                is_ocr_extractable: field.is_ocr_extractable,
                is_reusable: field.is_reusable,
              }))
            : [],
        },
      },
    )
    emit('updated', res.data.content_metadata)
    warningNameIndexes.value = []
    editingIndexes.value = []
    fieldSnapshots.value = {}
    if (!props.persistWithParent) {
      toast.success(res.message ?? 'Metadatos de contenido actualizados')
    }

    return true
  }
  catch (error: unknown) {
    toast.error(messageFromFetchError(error, 'No se pudieron guardar los campos de contenido'))

    return false
  }
  finally {
    saving.value = false
  }
}

async function persistForDocumentType(documentTypeId: number, activate: boolean): Promise<boolean> {
  if (!enabled.value) {
    return true
  }

  return persist(activate, documentTypeId)
}

defineExpose({
  ensureDraftValid,
  persistForDocumentType,
})

const statusLabel = computed(() => {
  if (props.persistWithParent) {
    if (!enabled.value) {
      return 'Opcional. Márquelo si al adjuntar un archivo de este tipo hay que pedir datos (NIT, número, periodo, etc.).'
    }

    const count = namedFields.value.length

    return count > 0
      ? `Listo para guardar con el tipo · ${count} campo(s)`
      : 'Añada al menos un campo. Se guarda junto con el tipo.'
  }

  const status = props.contentMetadata?.status ?? 'none'
  const count = namedFields.value.length
  if (status === 'active') {
    return count > 0 ? `Metadato activo · ${count} campo(s)` : 'Metadato activo'
  }
  if (status === 'draft') {
    return count > 0 ? `Metadato en borrador · ${count} campo(s)` : 'Metadato en borrador'
  }

  return 'Sin metadato'
})

const namedFields = computed(() => fields.value.filter(field => field.name.trim() !== ''))

function dataTypeLabel(value: string): string {
  return ARCHIVAL_METADATA_FIELD_DATA_TYPE_LABELS[value] ?? value
}

function fieldFlagLabels(field: DraftField): string[] {
  const labels: string[] = []
  if (field.is_required) {
    labels.push('Obligatorio')
  }
  if (field.is_searchable) {
    labels.push('Búsqueda')
  }
  if (field.is_reportable) {
    labels.push('Reportes')
  }
  if (field.is_ocr_extractable) {
    labels.push('OCR')
  }
  if (field.is_reusable) {
    labels.push('Reutilizar')
  }

  return labels
}

function isNewField(index: number): boolean {
  return editingIndexes.value.includes(index)
    || (fields.value[index]?.name.trim() ?? '') === ''
    || isNameWarning(index)
}
</script>

<template>
  <section
    class="space-y-4 rounded-lg border bg-muted/40 p-4"
    :class="highlight ? 'ring-2 ring-primary/40' : undefined"
  >
    <div class="space-y-1">
      <h3 class="text-base font-semibold leading-none">
        Metadato
      </h3>
      <p class="text-sm text-muted-foreground">
        Campos de este tipo (NIT, número, periodo, etc.). No reemplaza la TRD.
      </p>
    </div>
    <div class="space-y-4">
      <p class="text-sm text-muted-foreground">
        {{ statusLabel }}
      </p>
      <Checkbox
        :model-value="enabled"
        :disabled="disabled || saving"
        @update:model-value="setEnabled"
      >
        Este tipo necesita metadato
      </Checkbox>

      <template v-if="enabled">
        <div v-if="namedFields.length" class="space-y-2">
          <p class="text-sm font-medium">
            Campos listados
          </p>
          <ul class="divide-y rounded-md border bg-background">
            <li
              v-for="(field, index) in fields"
              v-show="!isNewField(index)"
              :key="`listed-${index}`"
              class="flex flex-wrap items-start justify-between gap-2 px-3 py-2"
            >
              <div class="min-w-0 space-y-1">
                <p class="font-medium leading-none">
                  {{ field.name }}
                </p>
                <p class="text-xs text-muted-foreground">
                  {{ dataTypeLabel(field.data_type) }}
                  <template v-if="fieldFlagLabels(field).length">
                    · {{ fieldFlagLabels(field).join(' · ') }}
                  </template>
                </p>
              </div>
              <div class="flex flex-wrap items-center gap-1">
                <Button
                  type="button"
                  variant="warning"
                  size="sm"
                  class="h-8 gap-1.5 px-2 text-xs"
                  :disabled="disabled || saving"
                  @click="editField(index)"
                >
                  Editar
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  class="h-8 gap-1.5 px-2 text-xs"
                  :disabled="disabled || saving"
                  @click="removeField(index)"
                >
                  Eliminar
                </Button>
              </div>
            </li>
          </ul>
        </div>

        <div class="flex flex-wrap gap-1">
          <span class="self-center text-xs text-muted-foreground">Añadir:</span>
          <Button
            v-for="preset in examplePresets"
            :key="preset.label"
            type="button"
            variant="outline"
            size="sm"
            class="h-7 text-xs"
            :disabled="disabled || saving"
            @click="addField(preset.field)"
          >
            + {{ preset.label }}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            class="h-7 text-xs"
            :disabled="disabled || saving"
            @click="addField()"
          >
            Añadir campo
          </Button>
        </div>

        <div
          v-for="(field, index) in fields"
          v-show="isNewField(index)"
          :key="`edit-${index}`"
          class="space-y-2 rounded-md border p-3"
          :class="isNameWarning(index) ? 'border-amber-500 ring-2 ring-amber-500/30' : ''"
        >
          <div class="grid gap-3 sm:grid-cols-2">
            <div class="space-y-1">
              <Label :for="fieldNameId(index)">Nombre del campo *</Label>
              <Input
                :id="fieldNameId(index)"
                :model-value="field.name"
                :disabled="disabled || saving"
                placeholder="Ej. Número de factura"
                :class="archivalInputWarningClass(isNameWarning(index))"
                @update:model-value="updateFieldName(index, $event)"
              />
              <p v-if="isNameWarning(index)" class="text-xs text-amber-700 dark:text-amber-400">
                Este campo es obligatorio. Escriba el nombre.
              </p>
            </div>
            <div class="space-y-1">
              <Label>Tipo de dato</Label>
              <Select v-model="field.data_type" :disabled="disabled || saving">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="option in ARCHIVAL_METADATA_FIELD_DATA_TYPE_OPTIONS"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div class="flex flex-wrap gap-4 text-xs">
            <Checkbox v-model="field.is_required" :disabled="disabled || saving">
              Obligatorio
            </Checkbox>
            <Checkbox v-model="field.is_searchable" :disabled="disabled || saving">
              Búsqueda
            </Checkbox>
            <Checkbox v-model="field.is_reportable" :disabled="disabled || saving">
              Reportes
            </Checkbox>
            <Checkbox v-model="field.is_ocr_extractable" :disabled="disabled || saving">
              Sugerir con OCR
            </Checkbox>
            <Checkbox v-model="field.is_reusable" :disabled="disabled || saving">
              Reutilizar en el siguiente
            </Checkbox>
          </div>
          <div class="flex flex-wrap gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              class="h-8 gap-1.5 px-2 text-xs"
              :disabled="disabled || saving"
              @click="cancelEdit(index)"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              class="h-8 gap-1.5 px-2 text-xs"
              :disabled="disabled || saving"
              @click="removeField(index)"
            >
              Eliminar
            </Button>
          </div>
        </div>
      </template>

      <div v-if="!persistWithParent" class="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          :disabled="disabled || saving"
          @click="persist(false)"
        >
          {{ enabled ? 'Guardar borrador' : 'Guardar (sin metadato)' }}
        </Button>
        <Button
          v-if="enabled"
          type="button"
          :disabled="disabled || saving || fields.length === 0"
          @click="persist(true)"
        >
          {{
            (props.contentMetadata?.status === 'active')
              ? 'Activar cambios'
              : 'Activar para usar al adjuntar'
          }}
        </Button>
      </div>
    </div>
  </section>
</template>
