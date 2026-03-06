<script setup lang="ts">
/**
 * Tabla FINAGRO dinámica: rangos de edad configurables por producto.
 * Cacao: Año 1, 2, 3, 4, 5-17, 18-20. Café: Año 1, 2, 3, 4, 5-7, 8 y 9.
 */
import { formatDecimalDisplay, parseDecimalInput, onKeydownPesosOnly } from '~/composables/usePesosFormat'

interface FinagroRange {
  edad_min: number
  edad_max: number
  label: string
  pct_costos: number
  kg_hectarea: number | null
}

const props = defineProps<{
  editedData: Record<string, unknown>
  editing: boolean
  canEdit: boolean
}>()

const emit = defineEmits<{
  'update:field': [payload: { key: string; value: unknown }]
}>()

const ranges = computed(() => {
  const arr = (props.editedData.finagro_ranges ?? []) as FinagroRange[]
  return Array.isArray(arr) ? arr : []
})

function setRanges(newRanges: FinagroRange[]) {
  emit('update:field', { key: 'finagro_ranges', value: newRanges })
}

function updateRange(index: number, field: keyof FinagroRange, value: unknown) {
  const next = [...ranges.value]
  const item = { ...(next[index] ?? { edad_min: 1, edad_max: 1, label: '', pct_costos: 0, kg_hectarea: null }) }
  ;(item as Record<string, unknown>)[field] = value
  if (field === 'edad_min' || field === 'edad_max') {
    const min = Number(item.edad_min) || 1
    const max = Number(item.edad_max) || 1
    item.label = min === max ? `Año ${min}` : `Año ${min} - ${max}`
  }
  next[index] = item
  setRanges(next)
}

function addRow() {
  const last = ranges.value[ranges.value.length - 1]
  const edadMin = last ? (last.edad_max ?? last.edad_min ?? 1) + 1 : 1
  setRanges([...ranges.value, { edad_min: edadMin, edad_max: edadMin, label: `Año ${edadMin}`, pct_costos: 45, kg_hectarea: null }])
}

function removeRow(index: number) {
  if (ranges.value.length <= 1) return
  setRanges(ranges.value.filter((_, i) => i !== index))
}
</script>

<template>
  <div class="space-y-3">
    <div class="overflow-x-auto rounded-lg border border-border">
      <table class="w-full min-w-[320px] border-collapse text-sm">
        <thead>
          <tr class="bg-muted">
            <th class="border border-border px-2 py-2 text-left font-semibold">
              Edad (desde - hasta)
            </th>
            <th class="border border-border px-2 py-2 text-left font-semibold">
              Etiqueta
            </th>
            <th class="border border-border px-2 py-2 text-right font-semibold">
              % Costo x HA
            </th>
            <th class="border border-border px-2 py-2 text-right font-semibold">
              Productividad (kg/ha)
            </th>
            <th v-if="editing && canEdit" class="w-10 border border-border" />
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, idx) in ranges"
            :key="idx"
            class="bg-background"
          >
            <td class="border border-border p-1">
              <div class="flex items-center gap-1">
                <input
                  type="number"
                  min="1"
                  :value="row.edad_min"
                  class="h-8 w-14 rounded border border-input bg-background px-1 text-center text-sm tabular-nums"
                  :disabled="!editing || !canEdit"
                  @input="updateRange(idx, 'edad_min', ($event.target as HTMLInputElement).value === '' ? 1 : Number(($event.target as HTMLInputElement).value))"
                >
                <span class="text-muted-foreground">-</span>
                <input
                  type="number"
                  min="1"
                  :value="row.edad_max"
                  class="h-8 w-14 rounded border border-input bg-background px-1 text-center text-sm tabular-nums"
                  :disabled="!editing || !canEdit"
                  @input="updateRange(idx, 'edad_max', ($event.target as HTMLInputElement).value === '' ? 1 : Number(($event.target as HTMLInputElement).value))"
                >
              </div>
            </td>
            <td class="border border-border px-2 py-2 text-sm">
              {{ row.label || `Año ${row.edad_min}-${row.edad_max}` }}
            </td>
            <td class="border border-border p-1">
              <input
                type="text"
                inputmode="decimal"
                :value="formatDecimalDisplay(row.pct_costos as number)"
                class="h-8 w-16 rounded border border-input bg-background px-2 py-1 text-right text-sm tabular-nums"
                :disabled="!editing || !canEdit"
                @input="(e) => updateRange(idx, 'pct_costos', parseDecimalInput((e.target as HTMLInputElement).value))"
                @keydown="onKeydownPesosOnly"
              >
            </td>
            <td class="border border-border p-1">
              <input
                type="text"
                inputmode="decimal"
                :value="row.kg_hectarea != null ? formatDecimalDisplay(row.kg_hectarea as number) : ''"
                class="h-8 w-20 rounded border border-input bg-background px-2 py-1 text-right text-sm tabular-nums"
                :disabled="!editing || !canEdit"
                placeholder="—"
                @input="(e) => updateRange(idx, 'kg_hectarea', parseDecimalInput((e.target as HTMLInputElement).value))"
                @keydown="onKeydownPesosOnly"
              >
            </td>
            <td v-if="editing && canEdit" class="border border-border p-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                class="h-7 w-7 text-destructive hover:text-destructive"
                :disabled="ranges.length <= 1"
                @click="removeRow(idx)"
              >
                <Icon name="i-lucide-trash-2" class="h-4 w-4" />
              </Button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <Button
      v-if="editing && canEdit"
      variant="outline"
      size="sm"
      @click="addRow"
    >
      <Icon name="i-lucide-plus" class="mr-1 h-4 w-4" />
      Agregar rango de edad
    </Button>
  </div>
</template>
