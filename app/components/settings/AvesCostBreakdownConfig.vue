<script setup lang="ts">
/**
 * Tabla de desglose de costos SIPSA para configuración de plantilla Aves Ponedoras.
 * Misma estructura visual que en radicación para facilitar identificación.
 */
import {
  AVES_COST_BREAKDOWN,
  AVES_MORTALITY_KEY,
  AVES_MORTALITY_PCT,
  getAvesCostBreakdownFieldKeys,
} from '~/constants/aves-cost-breakdown'
import { formatDecimalDisplay, parseDecimalInput, onKeydownPesosOnly } from '~/composables/usePesosFormat'

const { editedData } = defineProps<{
  editedData: Record<string, unknown>
  editing: boolean
  canEdit: boolean
}>()

const emit = defineEmits<{
  'update:field': [payload: { key: string; value: unknown }]
}>()

const ALL_PCT_KEYS = getAvesCostBreakdownFieldKeys()

function getDefaultPct(key: string): number {
  if (key === AVES_MORTALITY_KEY) return AVES_MORTALITY_PCT
  for (const g of AVES_COST_BREAKDOWN) {
    const item = g.items.find(i => i.key === key)
    if (item) return item.pct
  }
  return 0
}

function setField(key: string, value: unknown) {
  let finalValue = value
  if (value != null && typeof value === 'number' && Number.isFinite(value)) {
    const sumOthers = ALL_PCT_KEYS.filter(k => k !== key).reduce(
      (acc, k) => acc + safePct(editedData[k], getDefaultPct(k)),
      0,
    )
    const maxAllowed = Math.max(0, 100 - sumOthers)
    finalValue = Math.min(value, maxAllowed)
  }
  emit('update:field', { key, value: finalValue })
}

function safePct(val: unknown, defaultPct: number): number {
  const n = Number(val)
  return Number.isFinite(n) ? n : defaultPct
}

function groupPctSum(group: { items: { key: string; pct: number }[] }): number {
  return group.items.reduce((acc, item) => acc + safePct(editedData[item.key], item.pct), 0)
}

function totalPctSum(): number {
  return ALL_PCT_KEYS.reduce((acc, k) => acc + safePct(editedData[k], getDefaultPct(k)), 0)
}
</script>

<template>
  <div class="overflow-x-auto rounded-lg border border-border">
    <table class="w-full min-w-[320px] table-fixed border-collapse text-sm">
      <colgroup>
        <col>
        <col style="width: 5rem">
      </colgroup>
      <thead>
        <tr>
          <th class="border border-border bg-muted/50 px-3 py-2 text-left font-semibold">
            Costos
          </th>
          <th class="border border-border bg-muted/50 px-2 py-2 text-right font-semibold text-muted-foreground">
            % Part.
          </th>
        </tr>
      </thead>
      <tbody>
        <template v-for="group in AVES_COST_BREAKDOWN" :key="group.section">
          <!-- Grupo con un solo ítem: fila única con color (ej. Pollita de 1 día) -->
          <tr
            v-if="group.items.length === 1"
            :class="group.headerClass"
          >
            <td class="border border-border px-3 py-2 font-semibold">
              {{ group.items[0]!.label }}
            </td>
            <td class="border border-border p-1">
              <input
                type="text"
                inputmode="decimal"
                :value="formatDecimalDisplay((editedData[group.items[0]!.key] ?? group.items[0]!.pct) as number)"
                class="h-8 w-full min-w-0 rounded border border-input bg-background px-2 py-1 text-right text-sm tabular-nums"
                :disabled="!editing || !canEdit"
                @input="(e) => setField(group.items[0]!.key, parseDecimalInput((e.target as HTMLInputElement).value))"
                @keydown="onKeydownPesosOnly"
              >
            </td>
          </tr>
          <!-- Grupo con varios ítems: encabezado + filas (ej. Instalación, Fase de Levante) -->
          <template v-else>
            <tr :class="group.headerClass">
              <td class="border border-border px-3 py-1.5 font-semibold">
                {{ group.section }}
              </td>
              <td class="border border-border px-3 py-1.5 text-right tabular-nums font-bold">
                {{ groupPctSum(group).toFixed(2) }}%
              </td>
            </tr>
            <tr
              v-for="item in group.items"
              :key="`${group.section}-${item.key}`"
              class="bg-emerald-50/50 dark:bg-emerald-950/10"
            >
              <td class="border border-border pl-6 pr-3 py-1.5">
                {{ item.label }}
                <span
                  v-if="item.meta"
                  class="ml-1 text-xs text-muted-foreground"
                >
                  ({{ item.meta }})
                </span>
              </td>
              <td class="border border-border p-1">
                <input
                  type="text"
                  inputmode="decimal"
                  :value="formatDecimalDisplay((editedData[item.key] ?? item.pct) as number)"
                  class="h-8 w-full min-w-0 rounded border border-input bg-background px-2 py-1 text-right text-sm tabular-nums"
                  :disabled="!editing || !canEdit"
                  @input="(e) => setField(item.key, parseDecimalInput((e.target as HTMLInputElement).value))"
                  @keydown="onKeydownPesosOnly"
                >
              </td>
            </tr>
          </template>
        </template>
        <tr class="bg-emerald-100 dark:bg-emerald-900/40">
          <td class="border border-border px-3 py-2 font-semibold">
            Ajuste de mortalidad
          </td>
          <td class="border border-border p-1">
            <input
              type="text"
              inputmode="decimal"
              :value="formatDecimalDisplay((editedData[AVES_MORTALITY_KEY] ?? AVES_MORTALITY_PCT) as number)"
              class="h-8 w-full min-w-0 rounded border border-input bg-background px-2 py-1 text-right text-sm tabular-nums"
              :disabled="!editing || !canEdit"
              @input="(e) => setField(AVES_MORTALITY_KEY, parseDecimalInput((e.target as HTMLInputElement).value))"
              @keydown="onKeydownPesosOnly"
            >
          </td>
        </tr>
        <tr class="bg-emerald-200 dark:bg-emerald-900/60 font-bold">
          <td class="border border-border px-3 py-2">
            TOTAL
          </td>
          <td class="border border-border px-3 py-2 text-right tabular-nums">
            {{ Math.min(totalPctSum(), 100).toFixed(2) }}%
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
