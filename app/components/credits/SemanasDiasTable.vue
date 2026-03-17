<script setup lang="ts">
/**
 * Tablas Semanas y Días (plantilla comercial) - separadas, cada una con sus totales.
 * Estructura como en imagen: cantidad, valor unitario, total venta, venta semanal/mensual, % utilidad, % costos.
 */

const props = defineProps<{
  formData: Record<string, unknown>
}>()

const emit = defineEmits<{
  'update:field': [payload: { key: string; value: unknown }]
}>()

function setField(key: string, value: unknown) {
  emit('update:field', { key, value })
}

const semanasRows = [
  { label: 'Semanas buenas', cantidadKey: 'semanas_buenas', valorKey: 'semanas_buenas_valor' },
  { label: 'Semanas regulares', cantidadKey: 'semanas_regulares', valorKey: 'semanas_regulares_valor' },
  { label: 'Semanas malas', cantidadKey: 'semanas_malas', valorKey: 'semanas_malas_valor' },
]

const diasRows = [
  { label: 'Días buenos', cantidadKey: 'dias_buenos', valorKey: 'dias_buenos_valor' },
  { label: 'Días regulares', cantidadKey: 'dias_regulares', valorKey: 'dias_regulares_valor' },
  { label: 'Días malos', cantidadKey: 'dias_malos', valorKey: 'dias_malos_valor' },
]

function getTotal(cantidadKey: string, valorKey: string): number {
  const cant = Number(props.formData[cantidadKey] ?? 0) || 0
  const valor = Number(props.formData[valorKey] ?? 0) || 0
  const total = cant * valor
  return Number.isFinite(total) ? total : 0
}

const totalSemanasCantidad = computed(() => {
  let sum = 0
  for (const row of semanasRows) {
    const c = Number(props.formData[row.cantidadKey] ?? 0) || 0
    sum += c
  }
  return sum
})

const totalDiasCantidad = computed(() => {
  let sum = 0
  for (const row of diasRows) {
    const c = Number(props.formData[row.cantidadKey] ?? 0) || 0
    sum += c
  }
  return sum
})

const totalSemanasVenta = computed(() => {
  let sum = 0
  for (const row of semanasRows) sum += getTotal(row.cantidadKey, row.valorKey)
  return sum
})

const totalDiasVenta = computed(() => {
  let sum = 0
  for (const row of diasRows) sum += getTotal(row.cantidadKey, row.valorKey)
  return sum
})

const ventaSemanal = computed(() => totalSemanasVenta.value + totalDiasVenta.value)

const semanasMesDisplay = computed(() => {
  const v = props.formData.semanas_mes ?? props.formData.semanas_mes_default
  if (v == null || v === '') return '—'
  const n = Number(v)
  return Number.isFinite(n) ? n.toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 2 }) : '—'
})

const semanasMes = computed(() =>
  Number(props.formData.semanas_mes ?? props.formData.semanas_mes_default ?? 4.75) || 4.75,
)

const sensibilizacion = computed(() =>
  Number(props.formData.sensibilizacion ?? 90) || 90,
)

/** VENTA MENSUAL (Semanas) = total ventas de la semana × % sensibilizacion (de config plantilla comercial) */
const ventaMensualSemanas = computed(() => {
  const total = totalSemanasVenta.value * (sensibilizacion.value / 100)
  return Number.isFinite(total) ? total : 0
})

/** Validación: la cantidad total de semanas no puede ser mayor a las semanas parametrizadas al mes */
const semanasCantidadExcede = computed(() => totalSemanasCantidad.value > semanasMes.value)

/** VENTA SEMANAL (Días) = suma columna ventas diarias × % sensibilización */
const ventaSemanalDias = computed(() => {
  const total = totalDiasVenta.value * (sensibilizacion.value / 100)
  return Number.isFinite(total) ? total : 0
})

/** VENTA MENSUAL (Días) = venta semanal × semanas al mes */
const ventaMensualDias = computed(() => {
  const total = ventaSemanalDias.value * semanasMes.value
  return Number.isFinite(total) ? total : 0
})

/**
 * % Utilidad y % Costos provienen del MARGEN TOTAL de la sección Productos (sumatoria de columnas).
 * Los escribe ProductosTable en pct_utilidad_productos y pct_costos_productos.
 */
const pctUtilidad = computed(() => {
  const v = props.formData?.pct_utilidad_productos
  if (v != null && typeof v === 'number' && Number.isFinite(v)) return v
  return 34
})

const pctCostos = computed(() => {
  const v = props.formData?.pct_costos_productos
  if (v != null && typeof v === 'number' && Number.isFinite(v)) return v
  return 66
})

const utilidadSemanas = computed(() => {
  const v = ventaMensualSemanas.value
  if (v <= 0) return 0
  return Math.round(v * (pctUtilidad.value / 100))
})

const costosSemanas = computed(() => {
  const v = ventaMensualSemanas.value
  if (v <= 0) return 0
  return Math.round(v * (pctCostos.value / 100))
})

const utilidadDias = computed(() => {
  const v = ventaMensualDias.value
  if (v <= 0) return 0
  return Math.round(v * (pctUtilidad.value / 100))
})

const costosDias = computed(() => {
  const v = ventaMensualDias.value
  if (v <= 0) return 0
  return Math.round(v * (pctCostos.value / 100))
})

/** Ingresos operacionales = suma de los valores de % utilidad (Semanas + Días) */
const ingresosOperacionales = computed(() =>
  utilidadSemanas.value + utilidadDias.value,
)

/** Sincroniza a formData para la sección Ingresos y Gastos */
watch(
  ingresosOperacionales,
  (val) => setField('ingresos_operacionales', val),
  { immediate: true },
)

function formatMoney(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value) || value === 0) return '$ -'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}
</script>

<template>
  <div class="space-y-6">
    <!-- Tabla Semanas -->
    <div class="overflow-x-auto">
      <table class="w-full min-w-[560px] table-fixed border-collapse text-sm">
        <colgroup>
          <col>
          <col style="width: 6rem">
          <col style="width: 10rem">
          <col style="width: 10rem">
        </colgroup>
        <thead>
          <tr>
            <th
              colspan="4"
              class="border border-black bg-[#f4d03f] px-3 py-2 text-left font-bold uppercase text-black"
            >
              Semanas
            </th>
          </tr>
          <tr>
            <th class="border border-black bg-[#f4d03f] px-3 py-2 text-left font-bold uppercase text-black">
              TIPO
            </th>
            <th class="border border-black bg-[#f4d03f] px-3 py-2 text-center font-bold uppercase text-black">
              CANTIDAD
            </th>
            <th class="border border-black bg-[#f4d03f] px-3 py-2 text-center font-bold uppercase text-black">
              VALOR UNITARIO ($)
            </th>
            <th class="border border-black bg-[#f4d03f] px-3 py-2 text-center font-bold uppercase text-black">
              TOTAL VENTA ($)
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in semanasRows"
            :key="row.cantidadKey"
            class="bg-white"
          >
            <td class="border border-black px-3 py-2 font-medium text-black">
              {{ row.label }}
            </td>
            <td class="border border-black p-1">
              <input
                type="number"
                step="1"
                min="0"
                :value="formData[row.cantidadKey] ?? ''"
                class="h-9 w-full rounded border border-input bg-transparent px-2 py-1 text-center text-sm"
                placeholder="0"
                @input="setField(row.cantidadKey, ($event.target as HTMLInputElement).value === '' ? null : Number(($event.target as HTMLInputElement).value))"
              >
            </td>
            <td class="border border-black p-1">
              <CreditsBaseMoneyInput
                :model-value="(formData[row.valorKey] as number | null) ?? null"
                placeholder="-"
                @update:model-value="setField(row.valorKey, $event)"
              />
            </td>
            <td class="border border-black px-3 py-2 text-right tabular-nums text-black">
              {{ formatMoney(getTotal(row.cantidadKey, row.valorKey)) }}
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="bg-[#f4d03f] font-bold">
            <td class="border border-black px-3 py-2 text-left text-black">
              VENTA MENSUAL
            </td>
            <td colspan="2" class="border border-black px-3 py-2" />
            <td class="border border-black px-3 py-2 text-right tabular-nums text-black">
              {{ formatMoney(ventaMensualSemanas) }}
            </td>
          </tr>
          <tr class="bg-white">
            <td class="border border-black px-3 py-2 font-medium text-black">
              % UTILIDAD
            </td>
            <td colspan="2" class="border border-black px-3 py-2 text-center tabular-nums text-black">
              {{ pctUtilidad }}%
            </td>
            <td class="border border-black px-3 py-2 text-right tabular-nums text-black">
              {{ formatMoney(utilidadSemanas) }}
            </td>
          </tr>
          <tr class="bg-white">
            <td class="border border-black px-3 py-2 font-medium text-black">
              % COSTOS
            </td>
            <td colspan="2" class="border border-black px-3 py-2 text-center tabular-nums text-black">
              {{ pctCostos }}%
            </td>
            <td class="border border-black px-3 py-2 text-right tabular-nums text-black">
              {{ formatMoney(costosSemanas) }}
            </td>
          </tr>
        </tfoot>
      </table>
      <p
        v-if="semanasCantidadExcede"
        class="mt-2 text-sm text-destructive"
      >
        La cantidad total de semanas ({{ totalSemanasCantidad }}) no puede ser mayor a las semanas al mes parametrizadas ({{ semanasMesDisplay }}).
      </p>
    </div>

    <!-- Tabla Días -->
    <div class="overflow-x-auto">
      <table class="w-full min-w-[560px] table-fixed border-collapse text-sm">
        <colgroup>
          <col>
          <col style="width: 6rem">
          <col style="width: 10rem">
          <col style="width: 10rem">
        </colgroup>
        <thead>
          <tr>
            <th
              colspan="4"
              class="border border-black bg-[#f4d03f] px-3 py-2 text-left font-bold uppercase text-black"
            >
              Días
            </th>
          </tr>
          <tr>
            <th class="border border-black bg-[#f4d03f] px-3 py-2 text-left font-bold uppercase text-black">
              TIPO
            </th>
            <th class="border border-black bg-[#f4d03f] px-3 py-2 text-center font-bold uppercase text-black">
              CANTIDAD
            </th>
            <th class="border border-black bg-[#f4d03f] px-3 py-2 text-center font-bold uppercase text-black">
              VALOR UNITARIO ($)
            </th>
            <th class="border border-black bg-[#f4d03f] px-3 py-2 text-center font-bold uppercase text-black">
              TOTAL VENTA ($)
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in diasRows"
            :key="row.cantidadKey"
            class="bg-white"
          >
            <td class="border border-black px-3 py-2 font-medium text-black">
              {{ row.label }}
            </td>
            <td class="border border-black p-1">
              <input
                type="number"
                step="1"
                min="0"
                :value="formData[row.cantidadKey] ?? ''"
                class="h-9 w-full rounded border border-input bg-transparent px-2 py-1 text-center text-sm"
                placeholder="0"
                @input="setField(row.cantidadKey, ($event.target as HTMLInputElement).value === '' ? null : Number(($event.target as HTMLInputElement).value))"
              >
            </td>
            <td class="border border-black p-1">
              <CreditsBaseMoneyInput
                :model-value="(formData[row.valorKey] as number | null) ?? null"
                placeholder="-"
                @update:model-value="setField(row.valorKey, $event)"
              />
            </td>
            <td class="border border-black px-3 py-2 text-right tabular-nums text-black">
              {{ formatMoney(getTotal(row.cantidadKey, row.valorKey)) }}
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="bg-[#f4d03f] font-bold">
            <td class="border border-black px-3 py-2 text-left text-black">
              TOTAL DÍAS
            </td>
            <td class="border border-black px-3 py-2 text-center tabular-nums text-black">
              {{ totalDiasCantidad }}
            </td>
            <td colspan="2" class="border border-black px-3 py-2 text-right tabular-nums text-black">
              {{ formatMoney(totalDiasVenta) }}
            </td>
          </tr>
          <tr class="bg-[#f4d03f] font-bold">
            <td class="border border-black px-3 py-2 text-left text-black">
              VENTA SEMANAL
            </td>
            <td colspan="2" class="border border-black px-3 py-2" />
            <td class="border border-black px-3 py-2 text-right tabular-nums text-black">
              {{ formatMoney(ventaSemanalDias) }}
            </td>
          </tr>
          <tr class="bg-white">
            <td class="border border-black px-3 py-2 font-medium text-black">
              Semanas al mes
            </td>
            <td colspan="3" class="border border-black px-3 py-2 text-center tabular-nums bg-muted/50 text-muted-foreground select-none">
              {{ semanasMesDisplay }}
            </td>
          </tr>
          <tr class="bg-[#f4d03f] font-bold">
            <td class="border border-black px-3 py-2 text-left text-black">
              VENTA MENSUAL
            </td>
            <td colspan="2" class="border border-black px-3 py-2" />
            <td class="border border-black px-3 py-2 text-right tabular-nums text-black">
              {{ formatMoney(ventaMensualDias) }}
            </td>
          </tr>
          <tr class="bg-white">
            <td class="border border-black px-3 py-2 font-medium text-black">
              % UTILIDAD
            </td>
            <td colspan="2" class="border border-black px-3 py-2 text-center tabular-nums text-black">
              {{ pctUtilidad }}%
            </td>
            <td class="border border-black px-3 py-2 text-right tabular-nums text-black">
              {{ formatMoney(utilidadDias) }}
            </td>
          </tr>
          <tr class="bg-white">
            <td class="border border-black px-3 py-2 font-medium text-black">
              % COSTOS
            </td>
            <td colspan="2" class="border border-black px-3 py-2 text-center tabular-nums text-black">
              {{ pctCostos }}%
            </td>
            <td class="border border-black px-3 py-2 text-right tabular-nums text-black">
              {{ formatMoney(costosDias) }}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- Ingresos operacionales (suma % utilidad Semanas + Días) -->
    <div class="overflow-x-auto">
      <div class="flex items-center justify-between rounded-lg border border-black bg-[#f4d03f] px-4 py-3">
        <span class="font-bold uppercase text-black">Ingresos operacionales</span>
        <span class="tabular-nums font-bold text-black">{{ formatMoney(ingresosOperacionales) }}</span>
      </div>
    </div>
  </div>
</template>
