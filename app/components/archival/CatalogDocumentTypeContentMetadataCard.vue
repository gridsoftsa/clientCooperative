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

interface DraftFieldOption {
  value: string
  label: string
}

interface DraftField {
  name: string
  data_type: string
  is_required: boolean
  is_searchable: boolean
  is_reportable: boolean
  is_ocr_extractable: boolean
  is_reusable: boolean
  options: DraftFieldOption[]
}

const enabled = ref(false)
const fields = ref<DraftField[]>([])
const saving = ref(false)
const warningNameIndexes = ref<number[]>([])
const editingIndexes = ref<number[]>([])
const fieldSnapshots = ref<Record<number, DraftField>>({})
const optionDraftByIndex = ref<Record<number, string>>({})

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
      options: [],
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
      options: [],
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
      options: [],
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
    options: [],
  }
}

function cloneField(field: DraftField): DraftField {
  return {
    ...field,
    options: field.options.map(option => ({ ...option })),
  }
}

function normalizeOptions(raw: unknown): DraftFieldOption[] {
  if (!Array.isArray(raw)) {
    return []
  }

  return raw.flatMap((item) => {
    if (!item || typeof item !== 'object') {
      return []
    }
    const row = item as { value?: unknown, label?: unknown }
    const label = String(row.label ?? '').trim()
    const value = String(row.value ?? '').trim()
    if (!label && !value) {
      return []
    }

    return [{ value: value || slugOptionValue(label), label: label || value }]
  })
}

function slugOptionValue(label: string): string {
  const ascii = label
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
  const slug = ascii.replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')

  return slug || 'opcion'
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
    options: normalizeOptions(field.options),
  }))
  warningNameIndexes.value = []
  editingIndexes.value = []
  fieldSnapshots.value = {}
  optionDraftByIndex.value = {}
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
  fields.value = [...fields.value, preset ? cloneField(preset) : emptyField()]
  const index = fields.value.length - 1
  editingIndexes.value = [...editingIndexes.value, index]
  void nextTick(() => focusArchivalFieldById(fieldNameId(index)))
}

function editField(index: number): void {
  const field = fields.value[index]
  if (!field) {
    return
  }

  fieldSnapshots.value = {
    ...fieldSnapshots.value,
    [index]: cloneField(field),
  }
  if (!editingIndexes.value.includes(index)) {
    editingIndexes.value = [...editingIndexes.value, index]
  }
  void nextTick(() => focusArchivalFieldById(fieldNameId(index)))
}

function cancelEdit(index: number): void {
  const snapshot = fieldSnapshots.value[index]
  if (snapshot) {
    fields.value[index] = cloneField(snapshot)
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
    optionDraftByIndex.value = {}
  }
}

function confirmField(index: number): void {
  const field = fields.value[index]
  if (!field) {
    return
  }

  if (!field.name.trim()) {
    void highlightAndFocusFields([index])
    toast.error('Escriba el nombre del campo.')
    return
  }

  if (field.data_type === 'select' && field.options.length === 0) {
    toast.error('Añada al menos una opción para la lista de valores.')
    return
  }

  const nextSnapshots = { ...fieldSnapshots.value }
  delete nextSnapshots[index]
  fieldSnapshots.value = nextSnapshots
  editingIndexes.value = editingIndexes.value.filter(current => current !== index)
  clearNameWarning(index)
}

function setFieldDataType(index: number, value: string | number | null): void {
  const field = fields.value[index]
  if (!field) {
    return
  }

  const next = String(value ?? 'text')
  field.data_type = next
  if (next !== 'select') {
    field.options = []
  }
}

function setOptionDraft(index: number, value: string | number): void {
  optionDraftByIndex.value = {
    ...optionDraftByIndex.value,
    [index]: String(value ?? ''),
  }
}

function addListOption(index: number): void {
  const field = fields.value[index]
  if (!field) {
    return
  }

  const label = (optionDraftByIndex.value[index] ?? '').trim()
  if (!label) {
    return
  }

  const used = new Set(field.options.map(option => option.value.toLowerCase()))
  let value = slugOptionValue(label)
  let suffix = 2
  while (used.has(value.toLowerCase())) {
    value = `${slugOptionValue(label)}_${suffix}`
    suffix += 1
  }

  field.options = [...field.options, { value, label }]
  optionDraftByIndex.value = { ...optionDraftByIndex.value, [index]: '' }
}

function removeListOption(index: number, optionIndex: number): void {
  const field = fields.value[index]
  if (!field) {
    return
  }

  field.options = field.options.filter((_, current) => current !== optionIndex)
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

  const missingOptions = fields.value.flatMap((field, index) => (
    field.data_type === 'select' && field.options.length === 0 ? [index] : []
  ))
  if (missingOptions.length > 0) {
    editingIndexes.value = [...new Set([...editingIndexes.value, ...missingOptions])]
    toast.error('Los campos de lista de valores necesitan al menos una opción.')
    await nextTick()

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
                options: field.data_type === 'select' ? field.options : null,
              }))
            : [],
        },
      },
    )
    emit('updated', res.data.content_metadata)
    warningNameIndexes.value = []
    editingIndexes.value = []
    fieldSnapshots.value = {}
    optionDraftByIndex.value = {}
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

function listedFieldSummary(field: DraftField): string {
  const parts = [dataTypeLabel(field.data_type)]
  if (field.data_type === 'select' && field.options.length > 0) {
    parts.push(`${field.options.length} valor${field.options.length === 1 ? '' : 'es'}`)
  }
  if (fieldFlagLabels(field).length) {
    parts.push(fieldFlagLabels(field).join(' · '))
  }

  return parts.join(' · ')
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
        <p class="text-sm text-muted-foreground">
          Estos datos se piden al adjuntar un archivo de este tipo. Pulse <span class="font-medium text-foreground">Añadir campo</span>, complete el formulario y pulse <span class="font-medium text-foreground">Listo</span>.
        </p>

        <div class="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            :disabled="disabled || saving"
            @click="addField()"
          >
            <Icon name="i-lucide-plus" class="mr-1 h-4 w-4" />
            Añadir campo
          </Button>
          <span class="text-xs text-muted-foreground">Atajos:</span>
          <Button
            v-for="preset in examplePresets"
            :key="preset.label"
            type="button"
            variant="outline"
            size="sm"
            class="h-8 text-xs"
            :disabled="disabled || saving"
            @click="addField(preset.field)"
          >
            {{ preset.label }}
          </Button>
        </div>

        <div v-if="fields.length === 0" class="rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground">
          Aún no hay campos. Añada uno para definir qué se captura al adjuntar.
        </div>

        <div class="space-y-2">
          <div
            v-for="(field, index) in fields"
            :key="`field-${index}`"
            class="rounded-md border bg-background p-3"
            :class="isNameWarning(index) ? 'border-amber-500 ring-2 ring-amber-500/30' : ''"
          >
            <div
              v-if="!isNewField(index)"
              class="flex flex-wrap items-start justify-between gap-2"
            >
              <div class="min-w-0 space-y-1">
                <p class="font-medium leading-none">
                  {{ field.name }}
                </p>
                <p class="text-xs text-muted-foreground">
                  {{ listedFieldSummary(field) }}
                </p>
              </div>
              <div class="flex flex-wrap items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
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
            </div>

            <div v-else class="space-y-3">
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
                  <ArchivalSingleMultiselect
                    :model-value="field.data_type"
                    :options="[...ARCHIVAL_METADATA_FIELD_DATA_TYPE_OPTIONS]"
                    :can-clear="false"
                    :disabled="disabled || saving"
                    placeholder="Tipo de dato"
                    no-options-text="Sin tipos"
                    @update:model-value="setFieldDataType(index, $event)"
                  />
                </div>
              </div>

              <div
                v-if="field.data_type === 'select'"
                class="space-y-2 rounded-md border border-dashed bg-muted/30 p-3"
              >
                <p class="text-sm font-medium">
                  Valores de la lista
                </p>
                <p class="text-xs text-muted-foreground">
                  Al adjuntar el archivo, se elige una de estas opciones (no se escribe texto libre).
                </p>
                <ul v-if="field.options.length" class="divide-y rounded-md border bg-background">
                  <li
                    v-for="(option, optionIndex) in field.options"
                    :key="`${option.value}-${optionIndex}`"
                    class="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                  >
                    <span>{{ option.label }}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      class="h-7 px-2 text-xs text-destructive"
                      :disabled="disabled || saving"
                      @click="removeListOption(index, optionIndex)"
                    >
                      Quitar
                    </Button>
                  </li>
                </ul>
                <p v-else class="text-xs text-amber-700 dark:text-amber-400">
                  Añada al menos un valor.
                </p>
                <div class="flex flex-wrap gap-2">
                  <Input
                    :model-value="optionDraftByIndex[index] ?? ''"
                    class="h-9 min-w-[12rem] flex-1"
                    :disabled="disabled || saving"
                    placeholder="Ej. Activo"
                    @update:model-value="setOptionDraft(index, $event)"
                    @keydown.enter.prevent="addListOption(index)"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    class="h-9"
                    :disabled="disabled || saving || !(optionDraftByIndex[index] ?? '').trim()"
                    @click="addListOption(index)"
                  >
                    Agregar valor
                  </Button>
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
                  size="sm"
                  class="h-8 gap-1.5 px-2 text-xs"
                  :disabled="disabled || saving"
                  @click="confirmField(index)"
                >
                  Listo
                </Button>
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
              : 'Activar para usar en radicados y al adjuntar'
          }}
        </Button>
      </div>
    </div>
  </section>
</template>
