<script setup lang="ts">
/**
 * Tabla editable de Otros Gastos Anuales (plantilla transporte-carga).
 * Imagen 1: SOAT, Tecnomecánica, Llantas, Repuestos, # Cambios aceite + Precio c/u, Bajadas rueda + TOTAL.
 */
const props = defineProps<{
  formData: Record<string, unknown>
}>()

const formData = toRef(props, 'formData')

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

const rowsBeforeAceite = [
  { key: 'seguro_soat', label: 'SEGURO SOAT' },
  { key: 'tecnomecanica', label: 'TECNOMECANICA' },
  { key: 'llantas_anual', label: 'LLANTAS EN EL AÑO' },
  { key: 'repuestos', label: 'COMPRA DE REPUESTOS' },
]

const rowsAfterAceite = [
  { key: 'bajadas_rueda_anual', label: 'BAJADAS DE RUEDA AL AÑO' },
]

const totalCambiosAceite = computed(() => {
  const cantidad = Number(props.formData.cambios_aceite_cantidad ?? 0)
  const precio = Number(props.formData.precio_cambio_aceite ?? 0)
  if (!Number.isFinite(cantidad) || !Number.isFinite(precio)) return null
  return cantidad * precio
})

const totalOtrosGastosAnuales = computed(() => {
  let sum = 0
  for (const row of rowsBeforeAceite) {
    const v = Number(props.formData[row.key] ?? 0)
    if (Number.isFinite(v)) sum += v
  }
  const aceite = totalCambiosAceite.value ?? 0
  if (Number.isFinite(aceite)) sum += aceite
  for (const row of rowsAfterAceite) {
    const v = Number(props.formData[row.key] ?? 0)
    if (Number.isFinite(v)) sum += v
  }
  return Number.isFinite(sum) ? sum : null
})
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full min-w-[320px] table-fixed border-collapse text-sm">
      <colgroup>
        <col>
        <col style="width: 8rem">
        <col style="width: 8rem">
      </colgroup>
      <thead>
        <tr>
          <th
            colspan="3"
            class="border border-black bg-[#f4d03f] px-3 py-2 text-center font-bold uppercase text-black"
          >
            OTROS GASTOS (ANUALES)
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in rowsBeforeAceite"
          :key="row.key"
          class="bg-white"
        >
          <td class="border border-black px-3 py-2 text-left font-medium text-black">
            {{ row.label }}
          </td>
          <td class="border border-black p-1" colspan="2">
            <CreditsBaseMoneyInput
              :model-value="(formData[row.key] as number | null) ?? null"
              placeholder="0"
              @update:model-value="setField(row.key, $event)"
            />
          </td>
        </tr>
        <tr class="bg-white">
          <td class="border border-black px-3 py-2 text-left font-medium text-black">
            # CAMBIOS DE ACEITE
          </td>
          <td class="border border-black p-1">
            <input
              type="number"
              step="1"
              min="0"
              :value="formData.cambios_aceite_cantidad ?? ''"
              class="h-9 w-full rounded border border-input bg-transparent px-2 py-1 text-right text-sm"
              placeholder="0"
              @input="setField('cambios_aceite_cantidad', ($event.target as HTMLInputElement).value === '' ? null : Number(($event.target as HTMLInputElement).value))"
            >
          </td>
          <td
            rowspan="2"
            class="border border-black px-3 py-2 text-right align-middle tabular-nums text-black"
          >
            {{ formatMoney(totalCambiosAceite) }}
          </td>
        </tr>
        <tr class="bg-white">
          <td class="border border-black px-3 py-2 text-left font-medium text-black">
            PRECIO DE C/U
          </td>
          <td class="border border-black p-1">
            <CreditsBaseMoneyInput
              :model-value="(formData.precio_cambio_aceite as number | null) ?? null"
              placeholder="0"
              @update:model-value="setField('precio_cambio_aceite', $event)"
            />
          </td>
        </tr>
        <tr
          v-for="row in rowsAfterAceite"
          :key="row.key"
          class="bg-white"
        >
          <td class="border border-black px-3 py-2 text-left font-medium text-black">
            {{ row.label }}
          </td>
          <td class="border border-black p-1" colspan="2">
            <CreditsBaseMoneyInput
              :model-value="(formData[row.key] as number | null) ?? null"
              placeholder="0"
              @update:model-value="setField(row.key, $event)"
            />
          </td>
        </tr>
        <tr class="bg-[#f4d03f] font-bold">
          <td class="border border-black px-3 py-2 text-left uppercase text-black" colspan="2">
            TOTAL OTROS GASTOS (ANUALES)
          </td>
          <td class="border border-black px-3 py-2 text-right tabular-nums text-black">
            {{ formatMoney(totalOtrosGastosAnuales) }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
