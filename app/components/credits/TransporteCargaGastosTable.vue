<script setup lang="ts">
/**
 * Tabla editable de Gastos por Viaje Redondo (plantilla transporte-carga).
 * Estilo según formato Excel: encabezado amarillo, filas con bordes, total en amarillo.
 */
import type { TransporteCargaGastosRow } from '~/constants/transporte-carga-gastos-table'

const props = defineProps<{
  formData: Record<string, unknown>
  tableRows: TransporteCargaGastosRow[]
}>()

const emit = defineEmits<{
  'update:field': [payload: { key: string; value: unknown }]
}>()

function setField(key: string, value: unknown) {
  emit('update:field', { key, value })
}

function getValue(formData: Record<string, unknown>, key: string): number | null {
  const v = formData[key]
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
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

const totalGastos = computed(() => {
  let sum = 0
  for (const row of props.tableRows) {
    const v = getValue(props.formData, row.key)
    if (v != null && Number.isFinite(v)) sum += v
  }
  return sum
})
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
            GASTOS POR VIAJE REDONDO
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
              :model-value="(formData[row.key] as number | null) ?? null"
              placeholder="0"
              @update:model-value="setField(row.key, $event)"
            />
          </td>
        </tr>
        <tr class="bg-[#f4d03f] font-bold">
          <td class="border border-black px-3 py-2 text-left uppercase text-black">
            TOTAL GASTOS POR VIAJE
          </td>
          <td class="border border-black px-3 py-2 text-right tabular-nums text-black">
            {{ formatMoney(totalGastos) }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
