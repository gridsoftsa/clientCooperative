<script setup lang="ts">
/**
 * Tabla editable de Pasajes (plantilla transporte-pasajeros).
 * Estilo según formato usado en otras tablas: encabezado amarillo, bordes.
 */
import type { TransportePasajerosPasajesRow } from '~/constants/transporte-pasajeros-pasajes-table'
import { computeFormula } from '~/constants/credits-financial-templates'

const props = defineProps<{
  formData: Record<string, unknown>
  tableRows: TransportePasajerosPasajesRow[]
}>()

const emit = defineEmits<{
  'update:field': [payload: { key: string; value: unknown }]
}>()

function setField(key: string, value: unknown) {
  emit('update:field', { key, value })
}

function formatComputed(formulaKey: string): string {
  const v = computeFormula(formulaKey, props.formData)
  if (v == null) return '—'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v)
}
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full min-w-[320px] table-fixed border-collapse text-sm">
      <colgroup>
        <col>
        <col style="width: 10rem">
      </colgroup>
      <thead>
        <tr>
          <th
            colspan="2"
            class="border border-black bg-[#f4d03f] px-3 py-2 text-center font-bold uppercase text-black"
          >
            PASAJES
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in tableRows"
          :key="row.key"
          class="bg-white"
        >
          <td class="border border-black px-3 py-2 text-left font-medium text-black">
            {{ row.label }}
          </td>
          <td class="border border-black p-1">
            <CreditsBaseMoneyInput
              v-if="row.type === 'money'"
              :model-value="(formData[row.key] as number | null) ?? null"
              placeholder="0"
              @update:model-value="setField(row.key, $event)"
            />
            <input
              v-else-if="row.type === 'number'"
              type="number"
              step="1"
              min="0"
              max="100"
              :value="formData[row.key] ?? ''"
              class="h-9 w-full rounded border border-input bg-transparent px-2 py-1 text-right text-sm"
              placeholder="Ej: 80"
              @input="setField(row.key, ($event.target as HTMLInputElement).value === '' ? null : Number(($event.target as HTMLInputElement).value))"
            >
            <div
              v-else-if="row.type === 'computed' && row.formulaKey"
              class="flex h-9 min-h-9 w-full items-center justify-end rounded border border-input bg-muted/50 px-3 py-2 text-right text-sm tabular-nums"
            >
              {{ formatComputed(row.formulaKey) }}
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
