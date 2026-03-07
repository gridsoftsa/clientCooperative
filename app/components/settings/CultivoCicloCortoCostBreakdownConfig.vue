<script setup lang="ts">
/**
 * Tabla dinámica de discriminación de costos (configuración).
 * Similar a FINAGRO: filas configurables, agregar/eliminar.
 * MANO DE OBRA puede ser una sola fila (sin desglose) o varias.
 * Guardado en config_data.ciclo_corto_cost_breakdown (activity_template_flat_data).
 */
import type { CicloCortoCostRow, CicloCortoCostSection } from '~/constants/cultivo-ciclo-corto-cost-breakdown'
import {
  CICLO_CORTO_COST_BREAKDOWN_DEFAULT,
  CICLO_CORTO_COST_BREAKDOWN_KEY,
} from '~/constants/cultivo-ciclo-corto-cost-breakdown'
import { formatDecimalDisplay, onKeydownPesosOnly, useDecimalDraft } from '~/composables/usePesosFormat'

const decimalDraft = useDecimalDraft()

const SECTIONS: { value: CicloCortoCostSection; label: string }[] = [
  { value: 'MANO DE OBRA', label: 'MANO DE OBRA' },
  { value: 'INSUMOS', label: 'INSUMOS' },
]

const props = defineProps<{
  editedData: Record<string, unknown>
  editing: boolean
  canEdit: boolean
}>()

const emit = defineEmits<{
  'update:field': [payload: { key: string; value: unknown }]
}>()

const rows = computed(() => {
  const arr = (props.editedData[CICLO_CORTO_COST_BREAKDOWN_KEY] ?? []) as CicloCortoCostRow[]
  if (!Array.isArray(arr) || arr.length === 0) return [...CICLO_CORTO_COST_BREAKDOWN_DEFAULT]
  return arr.map(r => ({
    section: (r.section === 'MANO DE OBRA' || r.section === 'INSUMOS' ? r.section : 'MANO DE OBRA') as CicloCortoCostSection,
    label: String(r.label ?? ''),
    pct: Number.isFinite(r.pct) ? r.pct : 0,
  }))
})

function setRows(newRows: CicloCortoCostRow[]) {
  emit('update:field', { key: CICLO_CORTO_COST_BREAKDOWN_KEY, value: newRows })
}

function updateRow(index: number, field: keyof CicloCortoCostRow, value: unknown) {
  const next = rows.value.map((r, i) => (i === index ? { ...r, [field]: value } : r))
  setRows(next)
}

function addRow(section: CicloCortoCostSection) {
  setRows([...rows.value, { section, label: 'Nuevo concepto', pct: 0 }])
}

function removeRow(flatIndex: number) {
  if (rows.value.length <= 1) return
  setRows(rows.value.filter((_, i) => i !== flatIndex))
}

function totalPct(): number {
  return rows.value.reduce((acc, r) => acc + (Number.isFinite(r.pct) ? r.pct : 0), 0)
}

function subtotalPct(section: CicloCortoCostSection): number {
  return rows.value
    .filter(r => r.section === section)
    .reduce((acc, r) => acc + (Number.isFinite(r.pct) ? r.pct : 0), 0)
}

function rowClass(section: CicloCortoCostSection): string {
  return section === 'MANO DE OBRA' ? 'bg-emerald-50/50 dark:bg-emerald-950/10' : 'bg-orange-50/50 dark:bg-orange-950/10'
}

function headerClass(section: CicloCortoCostSection): string {
  return section === 'MANO DE OBRA' ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-orange-100 dark:bg-orange-900/30'
}

/** Índices planos agrupados por sección para renderizar */
const groupedRows = computed(() => {
  const manoDeObra: { row: CicloCortoCostRow; flatIndex: number }[] = []
  const insumos: { row: CicloCortoCostRow; flatIndex: number }[] = []
  rows.value.forEach((r, i) => {
    const item = { row: r, flatIndex: i }
    if (r.section === 'MANO DE OBRA') manoDeObra.push(item)
    else insumos.push(item)
  })
  return { manoDeObra, insumos }
})
</script>

<template>
  <div class="space-y-3">
    <div class="overflow-x-auto rounded-lg border border-border">
      <table class="w-full min-w-[400px] border-collapse text-sm">
        <thead>
          <tr class="bg-muted">
            <th class="border border-border px-2 py-2 text-left font-semibold">
              Concepto
            </th>
            <th class="border border-border px-2 py-2 text-right font-semibold">
              % Part.
            </th>
            <th v-if="editing && canEdit" class="w-10 border border-border" />
          </tr>
        </thead>
        <tbody>
          <!-- MANO DE OBRA -->
          <template v-if="groupedRows.manoDeObra.length > 0">
            <tr :class="headerClass('MANO DE OBRA')">
              <td class="border border-border px-3 py-1.5 font-semibold">
                MANO DE OBRA
              </td>
              <td class="border border-border px-2 py-1.5 text-right tabular-nums font-bold">
                {{ subtotalPct('MANO DE OBRA').toFixed(2) }}%
              </td>
              <td v-if="editing && canEdit" class="border border-border" />
            </tr>
            <tr
              v-for="{ row, flatIndex } in groupedRows.manoDeObra"
              :key="`mo-${flatIndex}`"
              :class="rowClass('MANO DE OBRA')"
            >
              <td class="border border-border pl-6 pr-2 py-1">
                <input
                  type="text"
                  :value="row.label"
                  class="h-8 w-full min-w-0 rounded border border-input bg-background px-2 py-1 text-sm"
                  :disabled="!editing || !canEdit"
                  placeholder="Ej: Instalación, Cosecha..."
                  @input="(e) => updateRow(flatIndex, 'label', (e.target as HTMLInputElement).value)"
                >
              </td>
              <td class="border border-border p-1">
                <input
                  type="text"
                  inputmode="decimal"
                  :value="decimalDraft.getDisplayValue(`pct-${flatIndex}`, row.pct)"
                  class="h-8 w-20 rounded border border-input bg-background px-2 py-1 text-right text-sm tabular-nums"
                  :disabled="!editing || !canEdit"
                  @focus="decimalDraft.onFocus(`pct-${flatIndex}`, row.pct)"
                  @input="(e) => decimalDraft.onInput(`pct-${flatIndex}`, (e.target as HTMLInputElement).value, (v) => updateRow(flatIndex, 'pct', v))"
                  @blur="decimalDraft.onBlur(`pct-${flatIndex}`, (v) => updateRow(flatIndex, 'pct', v))"
                  @keydown="onKeydownPesosOnly"
                >
              </td>
              <td v-if="editing && canEdit" class="border border-border p-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  class="h-7 w-7 text-destructive hover:text-destructive"
                  :disabled="rows.length <= 1"
                  @click="removeRow(flatIndex)"
                >
                  <Icon name="i-lucide-trash-2" class="h-4 w-4" />
                </Button>
              </td>
            </tr>
          </template>
          <!-- INSUMOS -->
          <template v-if="groupedRows.insumos.length > 0">
            <tr :class="headerClass('INSUMOS')">
              <td class="border border-border px-3 py-1.5 font-semibold">
                INSUMOS
              </td>
              <td class="border border-border px-2 py-1.5 text-right tabular-nums font-bold">
                {{ subtotalPct('INSUMOS').toFixed(2) }}%
              </td>
              <td v-if="editing && canEdit" class="border border-border" />
            </tr>
            <tr
              v-for="{ row, flatIndex } in groupedRows.insumos"
              :key="`in-${flatIndex}`"
              :class="rowClass('INSUMOS')"
            >
              <td class="border border-border pl-6 pr-2 py-1">
                <input
                  type="text"
                  :value="row.label"
                  class="h-8 w-full min-w-0 rounded border border-input bg-background px-2 py-1 text-sm"
                  :disabled="!editing || !canEdit"
                  placeholder="Ej: Insumos, Fertilizantes..."
                  @input="(e) => updateRow(flatIndex, 'label', (e.target as HTMLInputElement).value)"
                >
              </td>
              <td class="border border-border p-1">
                <input
                  type="text"
                  inputmode="decimal"
                  :value="decimalDraft.getDisplayValue(`pct-${flatIndex}`, row.pct)"
                  class="h-8 w-20 rounded border border-input bg-background px-2 py-1 text-right text-sm tabular-nums"
                  :disabled="!editing || !canEdit"
                  @focus="decimalDraft.onFocus(`pct-${flatIndex}`, row.pct)"
                  @input="(e) => decimalDraft.onInput(`pct-${flatIndex}`, (e.target as HTMLInputElement).value, (v) => updateRow(flatIndex, 'pct', v))"
                  @blur="decimalDraft.onBlur(`pct-${flatIndex}`, (v) => updateRow(flatIndex, 'pct', v))"
                  @keydown="onKeydownPesosOnly"
                >
              </td>
              <td v-if="editing && canEdit" class="border border-border p-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  class="h-7 w-7 text-destructive hover:text-destructive"
                  :disabled="rows.length <= 1"
                  @click="removeRow(flatIndex)"
                >
                  <Icon name="i-lucide-trash-2" class="h-4 w-4" />
                </Button>
              </td>
            </tr>
          </template>
        </tbody>
        <tfoot>
          <tr class="bg-emerald-200 dark:bg-emerald-900/60 font-bold">
            <td class="border border-border px-3 py-2">
              TOTAL
            </td>
            <td class="border border-border px-2 py-2 text-right tabular-nums">
              {{ totalPct().toFixed(2) }}%
            </td>
            <td v-if="editing && canEdit" class="border border-border" />
          </tr>
        </tfoot>
      </table>
    </div>
    <div v-if="editing && canEdit" class="flex flex-wrap gap-2">
      <Button
        variant="outline"
        size="sm"
        @click="addRow('MANO DE OBRA')"
      >
        <Icon name="i-lucide-plus" class="mr-1 h-4 w-4" />
        Agregar en MANO DE OBRA
      </Button>
      <Button
        variant="outline"
        size="sm"
        @click="addRow('INSUMOS')"
      >
        <Icon name="i-lucide-plus" class="mr-1 h-4 w-4" />
        Agregar en INSUMOS
      </Button>
    </div>
  </div>
</template>
