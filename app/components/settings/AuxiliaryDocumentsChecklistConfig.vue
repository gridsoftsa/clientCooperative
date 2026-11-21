<script setup lang="ts">
import { computed, onMounted, reactive, watch } from 'vue'
import { toast } from 'vue-sonner'
import {
  generateAuxiliaryChecklistItemKey,
  type AuxiliaryChecklistItem,
} from '~/constants/auxiliary-documents-checklist'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '~/components/ui/collapsible'
import type { TalentTrdSeries } from '~/types/talent-party'
import type { CatalogTreeSeries } from '~/types/archival-trd'

const props = defineProps<{
  editedData: Record<string, unknown>
  editing: boolean
  canEdit: boolean
}>()

const emit = defineEmits<{
  'update:field': [payload: { key: string, value: unknown }]
}>()

const {
  options: activityCatalogOptions,
  loading: loadingActivityCatalog,
  fetchOptions: fetchActivityCatalog,
} = useTemplateFlatCatalogOptions('actividad-economica', [])

const { hasModule } = usePermissions()
const showApplicantTrdAssignment = computed(() => hasModule('gestion_documental'))
const talentApi = useTalentPartyApi()
const applicantTrdLabel = ref('')
const applicantTrdReady = ref(false)
const applicantTrdSeries = ref<TalentTrdSeries[]>([])
const loadingApplicantTrd = ref(true)

async function loadApplicantTrdCatalog(): Promise<void> {
  if (!showApplicantTrdAssignment.value) {
    return
  }
  loadingApplicantTrd.value = true
  try {
    const settings = await talentApi.settings()
    const tableId = settings.data.applicant_trd_table_id
    applicantTrdLabel.value = settings.data.applicant_trd?.label ?? ''
    const allowedSubseries = new Set(settings.data.applicant_doc_subseries_ids ?? [])
    if (tableId == null || tableId < 1) {
      applicantTrdReady.value = false
      applicantTrdSeries.value = []
      return
    }
    const tree = await talentApi.trdSubseries(tableId)
    applicantTrdSeries.value = (tree.data ?? [])
      .map((series) => ({
        ...series,
        subseries: (series.subseries ?? []).filter(ss => allowedSubseries.size === 0 || allowedSubseries.has(ss.id)),
      }))
      .filter(series => series.subseries.length > 0)
    applicantTrdReady.value = applicantTrdSeries.value.length > 0
  } catch {
    applicantTrdReady.value = false
    applicantTrdSeries.value = []
    applicantTrdLabel.value = ''
  } finally {
    loadingApplicantTrd.value = false
  }
}

const applicantTrdCatalogTree = computed((): CatalogTreeSeries[] =>
  applicantTrdSeries.value.map(series => ({
    id: series.id,
    code: series.code,
    name: series.name,
    is_active: true,
    subseries: series.subseries.map(subseries => ({
      id: subseries.id,
      doc_series_id: series.id,
      code: subseries.code,
      name: subseries.name,
      is_active: true,
      document_types: subseries.document_types.map(type => ({
        id: type.id,
        doc_subseries_id: subseries.id,
        code: type.code,
        name: type.name,
        is_active: true,
      })),
    })),
  })) as CatalogTreeSeries[],
)

function setRowDocumentType(activity: string, index: number, typeId: number | null): void {
  updateRow(activity, index, { docDocumentTypeId: typeId })
}

const canBulkAssignTrd = computed(() =>
  showApplicantTrdAssignment.value && props.editing && props.canEdit && applicantTrdReady.value,
)

const selectedRowIds = ref<Set<string>>(new Set())
const bulkDocTypeId = ref<number | null>(null)

function rowSelectionId(activity: string, row: AuxiliaryChecklistItem, index: number): string {
  return `${activity}::${row.key || `idx-${index}`}`
}

function isRowSelected(activity: string, row: AuxiliaryChecklistItem, index: number): boolean {
  return selectedRowIds.value.has(rowSelectionId(activity, row, index))
}

function setRowSelected(activity: string, row: AuxiliaryChecklistItem, index: number, selected: boolean): void {
  const id = rowSelectionId(activity, row, index)
  const next = new Set(selectedRowIds.value)
  if (selected) {
    next.add(id)
  }
  else {
    next.delete(id)
  }
  selectedRowIds.value = next
}

function activitySelectionState(activity: string): boolean | 'indeterminate' {
  const rows = rowsFor(activity)
  if (rows.length === 0) {
    return false
  }
  const selectedCount = rows.filter((row, index) => isRowSelected(activity, row, index)).length
  if (selectedCount === 0) {
    return false
  }
  if (selectedCount === rows.length) {
    return true
  }
  return 'indeterminate'
}

function setActivitySelected(activity: string, selected: boolean): void {
  const next = new Set(selectedRowIds.value)
  for (const [index, row] of rowsFor(activity).entries()) {
    const id = rowSelectionId(activity, row, index)
    if (selected) {
      next.add(id)
    }
    else {
      next.delete(id)
    }
  }
  selectedRowIds.value = next
  if (selected) {
    openByActivity[activity] = true
  }
}

function selectAllDocuments(): void {
  const next = new Set<string>()
  for (const activity of orderedActivityKeys.value) {
    for (const [index, row] of rowsFor(activity).entries()) {
      next.add(rowSelectionId(activity, row, index))
    }
  }
  selectedRowIds.value = next
}

function clearDocumentSelection(): void {
  selectedRowIds.value = new Set()
}

const selectedDocumentCount = computed(() => selectedRowIds.value.size)

const documentGridClass = computed(() => {
  const withActions = props.editing && props.canEdit
  if (canBulkAssignTrd.value) {
    return withActions
      ? 'grid-cols-[2rem_minmax(0,1fr)_5.5rem_5.5rem] sm:grid-cols-[2rem_minmax(0,1fr)_5.5rem_5.5rem_4.5rem]'
      : 'grid-cols-[2rem_minmax(0,1fr)_5.5rem_5.5rem]'
  }
  return withActions
    ? 'grid-cols-[minmax(0,1fr)_5.5rem_5.5rem] sm:grid-cols-[minmax(0,1fr)_5.5rem_5.5rem_4.5rem]'
    : 'grid-cols-[minmax(0,1fr)_5.5rem_5.5rem]'
})

function applyBulkClassification(): void {
  const typeId = bulkDocTypeId.value
  if (typeId == null || typeId < 1) {
    toast.error('Elige primero serie, subserie y tipo documental.')
    return
  }
  if (selectedRowIds.value.size === 0) {
    toast.error('Marca al menos un documento.')
    return
  }

  const iba = { ...itemsByActivity() }
  let applied = 0
  for (const activity of Object.keys(iba)) {
    const rows = iba[activity]
    if (!Array.isArray(rows)) {
      continue
    }
    iba[activity] = rows.map((row, index) => {
      if (!selectedRowIds.value.has(rowSelectionId(activity, row, index))) {
        return row
      }
      applied += 1
      return { ...row, docDocumentTypeId: typeId }
    })
  }

  emit('update:field', { key: 'itemsByActivity', value: iba })
  toast.success(applied === 1
    ? 'Clasificación aplicada a 1 documento.'
    : `Clasificación aplicada a ${applied} documentos.`)
}

watch(
  () => props.editing,
  (editing) => {
    if (!editing) {
      clearDocumentSelection()
      bulkDocTypeId.value = null
    }
  },
)

/** Collapsible open state per activity `value` (default closed). */
const openByActivity = reactive<Record<string, boolean>>({})

function itemsByActivity(): Record<string, AuxiliaryChecklistItem[]> {
  const raw = props.editedData.itemsByActivity
  if (!raw || typeof raw !== 'object') {
    return {}
  }
  return raw as Record<string, AuxiliaryChecklistItem[]>
}

/**
 * Orden: opciones del catálogo actividad-economica; si aún no cargó el catálogo,
 * se listan las claves ya guardadas en `itemsByActivity` para no bloquear edición.
 */
const orderedActivityKeys = computed(() => {
  const catalogVals = activityCatalogOptions.value.map(o => o.value)
  if (catalogVals.length > 0) {
    return catalogVals
  }
  const ibaKeys = Object.keys(itemsByActivity())
  return [...ibaKeys].sort((a, b) => a.localeCompare(b, 'es'))
})

function labelForActivityKey(activityValue: string): string {
  const o = activityCatalogOptions.value.find(x => x.value === activityValue)
  return o?.label ?? activityValue
}

function syncItemsByActivityWithCatalog(): void {
  const vals = activityCatalogOptions.value.map(o => o.value)
  if (vals.length === 0) {
    return
  }

  const iba = { ...itemsByActivity() }
  let changed = false

  for (const v of vals) {
    if (!(v in iba)) {
      iba[v] = []
      changed = true
    }
  }

  for (const k of [...Object.keys(iba)]) {
    if (!vals.includes(k)) {
      delete iba[k]
      changed = true
    }
  }

  if (changed) {
    emit('update:field', { key: 'itemsByActivity', value: iba })
  }
}

watch(
  orderedActivityKeys,
  (keys) => {
    for (const k of keys) {
      if (!(k in openByActivity)) {
        openByActivity[k] = false
      }
    }
  },
  { immediate: true },
)

watch(
  activityCatalogOptions,
  () => {
    syncItemsByActivityWithCatalog()
  },
  { deep: true },
)

watch(
  () => props.editedData.itemsByActivity,
  () => {
    syncItemsByActivityWithCatalog()
  },
  { deep: true },
)

onMounted(async () => {
  await fetchActivityCatalog()
  syncItemsByActivityWithCatalog()
  await loadApplicantTrdCatalog()
})

function rowsFor(activity: string): AuxiliaryChecklistItem[] {
  const iba = itemsByActivity()
  const list = iba[activity]
  return Array.isArray(list) ? list : []
}

function patchItems(activity: string, nextRows: AuxiliaryChecklistItem[]): void {
  const iba = { ...itemsByActivity() }
  iba[activity] = nextRows
  emit('update:field', { key: 'itemsByActivity', value: iba })
}

function updateRow(activity: string, index: number, patch: Partial<AuxiliaryChecklistItem>): void {
  const rows = [...rowsFor(activity)]
  const cur = rows[index]
  if (!cur) {
    return
  }
  rows[index] = { ...cur, ...patch }
  patchItems(activity, rows)
}

function addRow(activity: string): void {
  const rows = [
    ...rowsFor(activity),
    {
      key: generateAuxiliaryChecklistItemKey(),
      label: 'Nuevo documento',
      required: false,
      master: false,
      docDocumentTypeId: null,
    },
  ]
  patchItems(activity, rows)
  openByActivity[activity] = true
}

function removeRow(activity: string, index: number): void {
  const rows = rowsFor(activity).filter((_, i) => i !== index)
  patchItems(activity, rows)
}
</script>

<template>
  <div class="space-y-3">
    <p class="text-sm text-muted-foreground">
      Lista de documentos del módulo auxiliar por cada tipo de actividad económica (secciones y `value` alineados con
      «Tipo de actividad económica» en parametrización). Al guardar ese catálogo, las secciones aquí se crean o eliminan
      en el servidor para coincidir con los tipos definidos. Marque obligatorio según política interna. La columna Maestro
      indica documentos que se guardan en la carpeta «Documentos maestros» del asociado y se reutilizan en radicaciones de crédito posteriores.
    </p>

    <p
      v-if="showApplicantTrdAssignment && loadingApplicantTrd"
      class="text-sm text-muted-foreground"
    >
      Cargando TRD de asociados…
    </p>
    <p
      v-else-if="showApplicantTrdAssignment && applicantTrdReady"
      class="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-950 dark:border-sky-900/50 dark:bg-sky-950/40 dark:text-sky-100"
    >
      Clasificación TRD tomada de la configuración de <span class="font-medium">asociados</span>:
      <span class="font-semibold">{{ applicantTrdLabel }}</span>.
      Solo elige serie, subserie y tipo documental de esa tabla (no se cambia la TRD aquí).
      Si varios documentos van a la misma carpeta, márcalos y aplica la clasificación una sola vez (también entre actividades).
    </p>
    <p
      v-else-if="showApplicantTrdAssignment"
      class="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100"
    >
      Gestión documental está activa, pero no hay TRD de asociados configurada (o sin subseries).
      Configúrela en Asociados / carpeta TRD para asignar dónde se guardará cada documento.
    </p>

    <div
      v-if="canBulkAssignTrd"
      class="relative z-20 space-y-2 rounded-md border border-border bg-muted/30 px-3 py-3"
    >
      <div class="flex flex-wrap items-center justify-between gap-2">
        <p class="text-sm font-medium">
          Aplicar clasificación a varios
          <span class="font-normal text-muted-foreground">
            · {{ selectedDocumentCount }} seleccionado{{ selectedDocumentCount === 1 ? '' : 's' }}
          </span>
        </p>
        <div class="flex flex-wrap gap-2">
          <Button type="button" variant="ghost" size="sm" @click="selectAllDocuments">
            Seleccionar todos
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            :disabled="selectedDocumentCount === 0"
            @click="clearDocumentSelection"
          >
            Quitar selección
          </Button>
        </div>
      </div>
      <ArchivalTrdCascadePicker
        v-model="bulkDocTypeId"
        inline
        :catalog-tree="applicantTrdCatalogTree"
      />
      <div class="flex justify-end">
        <Button
          type="button"
          size="sm"
          :disabled="selectedDocumentCount === 0 || bulkDocTypeId == null"
          @click="applyBulkClassification"
        >
          Aplicar a {{ selectedDocumentCount }} documento{{ selectedDocumentCount === 1 ? '' : 's' }}
        </Button>
      </div>
    </div>

    <p
      v-if="!loadingActivityCatalog && activityCatalogOptions.length === 0"
      class="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100"
    >
      No se pudieron cargar las opciones de actividad económica. Revise permisos de catálogo o vuelva a intentar; puede
      seguir editando las claves ya guardadas abajo.
    </p>

    <Collapsible
      v-for="activity in orderedActivityKeys"
      :key="activity"
      v-model:open="openByActivity[activity]"
      class="overflow-visible rounded-lg border border-border"
    >
      <div class="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/40 px-3 py-2">
        <CollapsibleTrigger as-child>
          <button
            type="button"
            class="flex min-w-0 flex-1 items-center gap-2 text-left text-sm font-semibold outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Icon
              name="i-lucide-chevron-down"
              class="h-4 w-4 shrink-0 transition-transform duration-200"
              :class="openByActivity[activity] ? 'rotate-180' : ''"
            />
            <span class="truncate">{{ labelForActivityKey(activity) }}</span>
            <span
              class="inline-flex shrink-0 items-center rounded-md border border-border bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums"
            >
              {{ rowsFor(activity).length }}
            </span>
          </button>
        </CollapsibleTrigger>
        <Button
          v-if="editing && canEdit"
          type="button"
          variant="outline"
          size="sm"
          class="shrink-0"
          @click.stop="addRow(activity)"
        >
          <Icon name="i-lucide-plus" class="mr-1 h-4 w-4" />
          Añadir documento
        </Button>
      </div>

      <CollapsibleContent class="overflow-visible">
        <div class="overflow-visible">
          <div
            class="grid items-center gap-x-2 border-b border-border bg-muted/20 px-3 py-2 text-sm font-medium text-muted-foreground"
            :class="documentGridClass"
          >
            <span v-if="canBulkAssignTrd" class="flex h-9 items-center justify-center">
              <label class="flex h-9 items-center justify-center">
                <Checkbox
                  bare
                  :model-value="activitySelectionState(activity)"
                  aria-label="Seleccionar todos los documentos de esta actividad"
                  @update:model-value="setActivitySelected(activity, $event === true)"
                />
              </label>
            </span>
            <span>Documento</span>
            <span class="text-center">Obligatorio</span>
            <span class="text-center">Maestro</span>
            <span v-if="editing && canEdit" class="text-center">Acciones</span>
          </div>
          <div
            v-for="(row, idx) in rowsFor(activity)"
            :key="`${activity}-${row.key}-${idx}`"
            class="border-b border-border/80 px-3 py-2 last:border-b-0"
            :class="canBulkAssignTrd && isRowSelected(activity, row, idx) ? 'bg-sky-50/80 dark:bg-sky-950/20' : ''"
          >
            <div
              class="grid items-start gap-x-2"
              :class="documentGridClass"
            >
              <div v-if="canBulkAssignTrd" class="flex h-9 items-center justify-center">
                <label class="flex h-9 items-center justify-center">
                  <Checkbox
                    bare
                    :model-value="isRowSelected(activity, row, idx)"
                    :aria-label="`Seleccionar ${row.label}`"
                    @update:model-value="setRowSelected(activity, row, idx, $event === true)"
                  />
                </label>
              </div>
              <Input
                :model-value="row.label"
                class="h-9 text-sm"
                :disabled="!editing || !canEdit"
                @update:model-value="updateRow(activity, idx, { label: String($event ?? '') })"
              />
              <div class="flex h-9 items-center justify-center">
                <label class="flex h-9 items-center justify-center">
                  <Checkbox
                    bare
                    :model-value="Boolean(row.required)"
                    :disabled="!editing || !canEdit"
                    @update:model-value="updateRow(activity, idx, { required: Boolean($event) })"
                  />
                </label>
              </div>
              <div class="flex h-9 items-center justify-center">
                <label class="flex h-9 items-center justify-center">
                  <Checkbox
                    bare
                    :model-value="Boolean(row.master)"
                    :disabled="!editing || !canEdit"
                    @update:model-value="updateRow(activity, idx, { master: Boolean($event) })"
                  />
                </label>
              </div>
              <div v-if="editing && canEdit" class="flex h-9 items-center justify-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  class="text-destructive hover:text-destructive"
                  @click="removeRow(activity, idx)"
                >
                  <Icon name="i-lucide-trash-2" class="h-4 w-4" />
                  <span class="sr-only">Quitar fila</span>
                </Button>
              </div>
            </div>
            <ArchivalTrdCascadePicker
              v-if="showApplicantTrdAssignment"
              class="mt-1.5"
              :model-value="row.docDocumentTypeId ?? null"
              inline
              :catalog-tree="applicantTrdCatalogTree"
              :disabled="!editing || !canEdit || !applicantTrdReady"
              @update:model-value="setRowDocumentType(activity, idx, $event)"
            />
          </div>
          <p
            v-if="rowsFor(activity).length === 0"
            class="px-3 py-6 text-center text-sm text-muted-foreground"
          >
            Sin documentos definidos para esta actividad.
          </p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  </div>
</template>
