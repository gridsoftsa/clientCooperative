<script setup lang="ts">
/**
 * Tabla editable de Ingresos por Servicio.
 * Columnas: Tipo de día | Valor | Cantidad/semana | Total
 */
import type { ServiciosIngresosRow } from '~/constants/servicios-ingresos-table'

const props = defineProps<{
  formData: Record<string, unknown>
  tableRows: ServiciosIngresosRow[]
}>()

const emit = defineEmits<{
  'update:field': [payload: { key: string; value: unknown }]
}>()

function setField(key: string, value: unknown) {
  emit('update:field', { key, value })
}

function getValorKey(suffix: string): string {
  return `dia_${suffix}_valor`
}

function getCantidadKey(suffix: string): string {
  return `dia_${suffix}_cantidad`
}

function getTotal(formData: Record<string, unknown>, suffix: string): number | null {
  const valor = Number(formData[getValorKey(suffix)] ?? 0)
  const cantidad = Number(formData[getCantidadKey(suffix)] ?? 0)
  if (!Number.isFinite(valor) || !Number.isFinite(cantidad)) return null
  const total = valor * cantidad
  return Number.isFinite(total) ? total : null
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

const totalSemana = computed(() => {
  let sum = 0
  for (const row of props.tableRows) {
    const t = getTotal(props.formData, row.suffix)
    if (t != null && Number.isFinite(t)) sum += t
  }
  return sum
})
</script>

<template>
  <div class="overflow-x-auto rounded-lg border border-border">
    <table class="w-full min-w-[480px] table-fixed border-collapse text-sm">
      <colgroup>
        <col>
        <col style="width: 8rem">
        <col style="width: 6rem">
        <col style="width: 8rem">
      </colgroup>
      <thead>
        <tr class="bg-muted">
          <th class="border border-border px-3 py-2 text-left font-semibold">
            Tipo de día
          </th>
          <th class="border border-border px-2 py-2 text-left font-semibold">
            Valor ($)
          </th>
          <th class="border border-border px-2 py-2 text-left font-semibold">
            Cantidad/semana
          </th>
          <th class="border border-border px-3 py-2 text-left font-semibold">
            Total
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in tableRows"
          :key="row.suffix"
          class="bg-background"
        >
          <td class="border border-border px-3 py-2 font-medium">
            {{ row.label }}
          </td>
          <td class="border border-border p-1">
            <CreditsBaseMoneyInput
              :model-value="(formData[getValorKey(row.suffix)] as number | null) ?? null"
              placeholder="0"
              @update:model-value="setField(getValorKey(row.suffix), $event)"
            />
          </td>
          <td class="border border-border p-1">
            <input
              type="number"
              step="1"
              min="0"
              :value="formData[getCantidadKey(row.suffix)] ?? ''"
              class="h-8 w-full rounded border border-input bg-transparent px-2 py-1 text-right text-sm"
              placeholder="0"
              @input="setField(getCantidadKey(row.suffix), ($event.target as HTMLInputElement).value === '' ? null : Number(($event.target as HTMLInputElement).value))"
            >
          </td>
          <td class="border border-border px-3 py-2 text-right tabular-nums">
            {{ formatMoney(getTotal(formData, row.suffix)) }}
          </td>
        </tr>
        <tr class="bg-muted/50 font-semibold">
          <td class="border border-border px-3 py-2" colspan="2">
            Total semana
          </td>
          <td class="border border-border px-2 py-2" />
          <td class="border border-border px-3 py-2 text-right tabular-nums">
            {{ formatMoney(totalSemana) }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
