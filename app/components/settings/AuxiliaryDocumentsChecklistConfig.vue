<script setup lang="ts">
import { computed, onMounted, reactive, watch } from 'vue'
import {
  generateAuxiliaryChecklistItemKey,
  type AuxiliaryChecklistItem,
} from '~/constants/auxiliary-documents-checklist'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '~/components/ui/collapsible'

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
      en el servidor para coincidir con los tipos definidos. Marque obligatorio según política interna.
    </p>

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
      class="overflow-hidden rounded-lg border border-border"
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

      <CollapsibleContent>
        <div class="overflow-x-auto">
          <table class="w-full min-w-[28rem] table-fixed border-collapse text-sm">
            <thead>
              <tr class="border-b border-border bg-muted/20">
                <th class="px-3 py-2 text-left font-medium text-muted-foreground">
                  Documento
                </th>
                <th class="w-28 px-2 py-2 text-center font-medium text-muted-foreground">
                  Obligatorio
                </th>
                <th v-if="editing && canEdit" class="w-24 px-2 py-2 text-center font-medium text-muted-foreground">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, idx) in rowsFor(activity)"
                :key="`${activity}-${row.key}-${idx}`"
                class="border-b border-border/80 last:border-b-0"
              >
                <td class="px-3 py-2 align-top">
                  <Input
                    :model-value="row.label"
                    class="h-9 text-sm"
                    :disabled="!editing || !canEdit"
                    @update:model-value="updateRow(activity, idx, { label: String($event ?? '') })"
                  />
                </td>
                <td class="px-2 py-2 text-center align-middle">
                  <Checkbox
                    :model-value="Boolean(row.required)"
                    :disabled="!editing || !canEdit"
                    class="mx-auto"
                    @update:model-value="updateRow(activity, idx, { required: Boolean($event) })"
                  />
                </td>
                <td v-if="editing && canEdit" class="px-2 py-2 text-center align-middle">
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
                </td>
              </tr>
              <tr v-if="rowsFor(activity).length === 0">
                <td :colspan="editing && canEdit ? 3 : 2" class="px-3 py-6 text-center text-sm text-muted-foreground">
                  Sin documentos definidos para esta actividad.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CollapsibleContent>
    </Collapsible>
  </div>
</template>
