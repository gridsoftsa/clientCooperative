<script setup lang="ts">
/**
 * Tabla editable de Gastos (plantilla transporte-pasajeros).
 * GASTOS VIAJE + OTROS GASTOS (SOAT, Tecnomecánica, Llantas, Repuestos, # Cambios aceite, Precio c/u, Bajadas rueda, Seguro todo riesgos, Rodamiento).
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

const gastosViajeIdaRows = [
  { key: 'combustible_ida', label: 'COMBUSTIBLE' },
  { key: 'peajes_ida', label: 'PEAJES' },
  { key: 'otros_ida', label: 'OTROS' },
]

const gastosViajeVueltaRows = [
  { key: 'combustible_vuelta', label: 'COMBUSTIBLE' },
  { key: 'peajes_vuelta', label: 'PEAJES' },
  { key: 'otros_vuelta', label: 'OTROS' },
]

const otrosGastosBeforeAceite = [
  { key: 'seguro_soat', label: 'SEGURO SOAT' },
  { key: 'tecnomecanica', label: 'TECNOMECANICA' },
  { key: 'llantas_anual', label: 'LLANTAS EN EL AÑO' },
  { key: 'repuestos', label: 'COMPRA DE REPUESTOS' },
]

const otrosGastosAfterAceite = [
  { key: 'bajadas_rueda_anual', label: 'BAJADAS DE RUEDA AL AÑO' },
  { key: 'seguro_todo_riesgos', label: 'SEGURO TODO RIESGOS' },
]

const totalGastosViajeIda = computed(() => {
  let sum = 0
  for (const row of gastosViajeIdaRows) {
    const v = Number(props.formData[row.key] ?? 0)
    if (Number.isFinite(v)) sum += v
  }
  return Number.isFinite(sum) ? sum : null
})

const totalGastosViajeVuelta = computed(() => {
  let sum = 0
  for (const row of gastosViajeVueltaRows) {
    const v = Number(props.formData[row.key] ?? 0)
    if (Number.isFinite(v)) sum += v
  }
  return Number.isFinite(sum) ? sum : null
})

const totalGastosViajeIdaVuelta = computed(() => {
  const ida = totalGastosViajeIda.value ?? 0
  const vuelta = totalGastosViajeVuelta.value ?? 0
  const sum = ida + vuelta
  return Number.isFinite(sum) ? sum : null
})

const totalGastoViajePorMes = computed(() => {
  const totalIdaVuelta = totalGastosViajeIdaVuelta.value ?? 0
  const conductor = Number(props.formData.conductor_vuelta ?? 0)
  const viajesSemana = Number(props.formData.viajes_semana ?? 0)
  const semanasMes = Number(props.formData.semanas_mes_default ?? 4.33)
  const sm = Number.isFinite(semanasMes) ? semanasMes : 4.33
  const gastoBase = totalIdaVuelta * viajesSemana * sm
  const sum = gastoBase + (Number.isFinite(conductor) ? conductor : 0)
  return Number.isFinite(sum) ? sum : null
})

const totalCambiosAceite = computed(() => {
  const cantidad = Number(props.formData.cambios_aceite_cantidad ?? 0)
  const precio = Number(props.formData.precio_cambio_aceite ?? 0)
  if (!Number.isFinite(cantidad) || !Number.isFinite(precio)) return null
  const total = cantidad * precio
  return Number.isFinite(total) ? total : null
})

const totalOtrosGastosAnuales = computed(() => {
  let sum = 0
  for (const row of otrosGastosBeforeAceite) {
    const v = Number(props.formData[row.key] ?? 0)
    if (Number.isFinite(v)) sum += v
  }
  const aceite = totalCambiosAceite.value ?? 0
  if (Number.isFinite(aceite)) sum += aceite
  for (const row of otrosGastosAfterAceite) {
    const v = Number(props.formData[row.key] ?? 0)
    if (Number.isFinite(v)) sum += v
  }
  return Number.isFinite(sum) ? sum : null
})

const totalGastosMensuales = computed(() => {
  const anuales = totalOtrosGastosAnuales.value ?? 0
  const rodamiento = Number(props.formData.rodamiento_mensual ?? 0)
  const totalViajePorMes = totalGastoViajePorMes.value ?? 0
  const valor = (anuales / 12) + (Number.isFinite(rodamiento) ? rodamiento : 0) + totalViajePorMes
  return Number.isFinite(valor) ? valor : null
})
</script>

<template>
  <div class="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
    <!-- Columna izquierda: GASTOS DE VIAJE IDA y VUELTA -->
    <div class="flex flex-col gap-4">
    <div class="overflow-x-auto">
      <table class="w-full min-w-[220px] table-fixed border-collapse text-sm">
        <colgroup>
          <col>
          <col style="width: 9rem">
        </colgroup>
        <thead>
          <tr>
            <th
              colspan="2"
              class="border border-black bg-[#f4d03f] px-3 py-2 text-center font-bold uppercase text-black"
            >
              GASTOS DE VIAJE IDA
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in gastosViajeIdaRows"
            :key="`ida-${row.key}`"
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
        </tbody>
      </table>
    </div>
    <!-- GASTOS DE VIAJE VUELTA -->
    <div class="overflow-x-auto">
      <table class="w-full min-w-[220px] table-fixed border-collapse text-sm">
        <colgroup>
          <col>
          <col style="width: 9rem">
        </colgroup>
        <thead>
          <tr>
            <th
              colspan="2"
              class="border border-black bg-[#f4d03f] px-3 py-2 text-center font-bold uppercase text-black"
            >
              GASTOS DE VIAJE VUELTA
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in gastosViajeVueltaRows"
            :key="`vuelta-${row.key}`"
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
              TOTAL (IDA + VUELTA)
            </td>
            <td class="border border-black px-3 py-2 text-right tabular-nums text-black">
              {{ formatMoney(totalGastosViajeIdaVuelta) }}
            </td>
          </tr>
          <tr class="bg-white">
            <td class="border border-black px-3 py-2 text-left font-medium text-black">
              % CONDUCTOR
            </td>
            <td class="border border-black p-1">
              <CreditsBaseMoneyInput
                :model-value="(formData.conductor_vuelta as number | null) ?? null"
                placeholder="0"
                @update:model-value="setField('conductor_vuelta', $event)"
              />
            </td>
          </tr>
          <tr class="bg-[#f4d03f] font-bold">
            <td class="border border-black px-3 py-2 text-left font-bold text-black">
              TOTAL GASTO DE VIAJE POR MES
            </td>
            <td class="border border-black px-3 py-2 text-right tabular-nums font-bold text-black">
              {{ formatMoney(totalGastoViajePorMes) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    </div>
    <!-- Columna derecha: OTROS GASTOS (ANUALES) + RODAMIENTO por fuera -->
    <div class="flex flex-col gap-4">
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
            v-for="row in otrosGastosBeforeAceite"
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
            v-for="row in otrosGastosAfterAceite"
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
    <div class="overflow-x-auto">
      <table class="w-full min-w-[320px] table-fixed border-collapse text-sm">
        <colgroup>
          <col>
          <col style="width: 16rem">
        </colgroup>
        <tbody>
          <tr class="bg-white">
            <td class="border border-black px-3 py-2 text-left font-medium text-black">
              RODAMIENTO MENSUAL
            </td>
            <td class="border border-black p-1">
              <CreditsBaseMoneyInput
                :model-value="(formData.rodamiento_mensual as number | null) ?? null"
                placeholder="0"
                @update:model-value="setField('rodamiento_mensual', $event)"
              />
            </td>
          </tr>
          <tr class="bg-[#f4d03f] font-bold">
            <td class="border border-black px-3 py-2 text-left font-bold text-black">
              TOTAL GASTOS MENSUALES
            </td>
            <td class="border border-black px-3 py-2 text-right tabular-nums font-bold text-black">
              {{ formatMoney(totalGastosMensuales) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    </div>
  </div>
</template>
