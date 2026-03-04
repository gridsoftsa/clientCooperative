<script setup lang="ts">
/**
 * Tabla de clasificación de huevos y precios.
 * Layout tipo hoja de cálculo: CLASIFICACIÓN | PRECIO CUBETA | CANTIDAD DIARIA | TOTAL
 */
import type { EggsTableRowSchema } from '~/types/credits'
import { computeFormula } from '~/constants/credits-financial-templates'

defineProps<{
  formData: Record<string, unknown>
  tableRows: EggsTableRowSchema[]
}>()

const emit = defineEmits<{
  'update:field': [payload: { key: string; value: unknown }]
}>()

function setField(key: string, value: unknown) {
  emit('update:field', { key, value })
}

function formatMoney(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '$ -'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function getTotalFormulaKey(suffix: string): string {
  return `aves_total_clasificacion_${suffix}`
}

function getComputedTotal(formData: Record<string, unknown>, suffix: string): number | null {
  return computeFormula(getTotalFormulaKey(suffix), formData)
}
</script>

<template>
  <div class="overflow-x-auto rounded-lg border border-border">
    <table class="w-full min-w-[420px] table-fixed border-collapse text-sm">
      <colgroup>
        <col>
        <col style="width: 7rem">
        <col style="width: 5rem">
        <col>
      </colgroup>
      <thead>
        <tr class="bg-yellow-100 dark:bg-yellow-900/30">
          <th class="border border-border px-3 py-2 text-left font-semibold">
            CLASIFICACIÓN DE HUEVO
          </th>
          <th class="border border-border px-2 py-2 text-left font-semibold">
            PRECIO CUBETA
          </th>
          <th class="border border-border px-2 py-2 text-left font-semibold">
            CANTIDAD DIARIA
          </th>
          <th class="border border-border px-3 py-2 text-left font-semibold">
            TOTAL
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in tableRows"
          :key="row.suffix"
          class="bg-background"
        >
          <td class="border border-border px-3 py-2 font-medium" :class="row.textClass">
            {{ row.label }}
          </td>
          <td class="border border-border bg-yellow-50 p-1 dark:bg-yellow-950/20">
            <CreditsBaseMoneyInput
              :model-value="(formData[`precio_cubeta_${row.suffix}`] as number | null) ?? null"
              :placeholder="'0'"
              @update:model-value="setField(`precio_cubeta_${row.suffix}`, $event)"
            />
          </td>
          <td class="border border-border bg-yellow-50 p-1 dark:bg-yellow-950/20">
            <input
              type="number"
              step="any"
              :value="formData[`cantidad_diaria_${row.suffix}`] ?? ''"
              class="h-8 w-full rounded border border-input bg-transparent px-2 py-1 text-right text-sm"
              @input="setField(`cantidad_diaria_${row.suffix}`, ($event.target as HTMLInputElement).value === '' ? null : Number(($event.target as HTMLInputElement).value))"
            >
          </td>
          <td class="border border-border px-3 py-2 text-right tabular-nums">
            {{ formatMoney(getComputedTotal(formData, row.suffix)) }}
          </td>
        </tr>
        <tr class="bg-background">
          <td colspan="2" class="border border-border px-3 py-2 font-semibold">
            TOTAL DIARIO
          </td>
          <td class="border border-border px-3 py-2 text-right tabular-nums">
            <span class="inline-flex min-h-[2rem] items-center justify-end rounded bg-emerald-100 px-2 dark:bg-emerald-900/40">
              {{ (computeFormula('aves_total_cantidad_diaria', formData) ?? '—') }}
            </span>
          </td>
          <td class="border border-border px-3 py-2 text-right tabular-nums">
            <span class="inline-flex min-h-[2rem] items-center justify-end rounded bg-emerald-100 px-2 dark:bg-emerald-900/40">
              {{ formatMoney(computeFormula('aves_total_valor_diario', formData)) }}
            </span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
