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

const MAX_DIAS_SEMANA_TOTAL = 7
/** Máximo de cifras al escribir cantidades (semanas o días enteros). */
const MAX_DIGITOS_CANTIDAD = 2

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

const semanasMes = computed(() => {
  const n = Number(props.formData.semanas_mes ?? props.formData.semanas_mes_default ?? 4.75)
  return Number.isFinite(n) && n > 0 ? n : 4.75
})

function toIntCantidad(v: unknown): number {
  const n = Number(v)
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.floor(n)
}

function sanitizarDigitos(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, MAX_DIGITOS_CANTIDAD)
}

function syncInputCantidad(el: HTMLInputElement, stored: number | null) {
  const canonical = stored == null ? '' : String(stored)
  nextTick(() => {
    if (el.value !== canonical) {
      el.value = canonical
    }
  })
}

function sumSemanasOtros(excludeKey: string): number {
  let s = 0
  for (const row of semanasRows) {
    if (row.cantidadKey === excludeKey) continue
    s += toIntCantidad(props.formData[row.cantidadKey])
  }
  return s
}

function sumDiasOtros(excludeKey: string): number {
  let s = 0
  for (const row of diasRows) {
    if (row.cantidadKey === excludeKey) continue
    s += toIntCantidad(props.formData[row.cantidadKey])
  }
  return s
}

/** Semanas enteras: cada fila ≤ techo del mes y la suma ≤ semanas al mes (plantilla). */
function aplicarSemanaCantidad(cantidadKey: string, el: HTMLInputElement) {
  const cap = semanasMes.value
  const topePorFila = Math.max(0, Math.floor(cap + 1e-9))

  const soloDigitos = sanitizarDigitos(el.value)
  if (soloDigitos === '') {
    setField(cantidadKey, null)
    syncInputCantidad(el, null)
    return
  }

  let solicitado = toIntCantidad(Number(soloDigitos))
  solicitado = Math.min(solicitado, topePorFila)
  const otros = sumSemanasOtros(cantidadKey)
  const remaining = cap - otros
  const topePorSuma = Math.max(0, Math.floor(remaining + 1e-9))
  const finalVal = Math.min(solicitado, topePorSuma)
  const stored = finalVal === 0 ? null : finalVal
  setField(cantidadKey, stored)
  syncInputCantidad(el, stored)
}

/** Días enteros: cada fila ≤ 7 y la suma ≤ 7 (días de la semana). */
function aplicarDiaCantidad(cantidadKey: string, el: HTMLInputElement) {
  const soloDigitos = sanitizarDigitos(el.value)
  if (soloDigitos === '') {
    setField(cantidadKey, null)
    syncInputCantidad(el, null)
    return
  }

  let solicitado = Math.min(toIntCantidad(Number(soloDigitos)), MAX_DIAS_SEMANA_TOTAL)
  const otros = sumDiasOtros(cantidadKey)
  const topePorSuma = Math.max(0, MAX_DIAS_SEMANA_TOTAL - otros)
  const finalVal = Math.min(solicitado, topePorSuma)
  const stored = finalVal === 0 ? null : finalVal
  setField(cantidadKey, stored)
  syncInputCantidad(el, stored)
}

function normalizarSemanasSiHaceFalta() {
  const cap = semanasMes.value
  let remaining = cap
  for (const row of semanasRows) {
    const key = row.cantidadKey
    const parsed = toIntCantidad(props.formData[key])
    const topeFila = Math.max(0, Math.floor(remaining + 1e-9))
    const next = Math.min(parsed, topeFila, Math.floor(cap + 1e-9))
    const newVal = next === 0 ? null : next
    remaining -= next
    if (parsed !== next) {
      setField(key, newVal)
    }
  }
}

function normalizarDiasSiHaceFalta() {
  let remaining = MAX_DIAS_SEMANA_TOTAL
  for (const row of diasRows) {
    const key = row.cantidadKey
    const parsed = Math.min(toIntCantidad(props.formData[key]), MAX_DIAS_SEMANA_TOTAL)
    const next = Math.min(parsed, remaining)
    const newVal = next === 0 ? null : next
    remaining -= next
    if (parsed !== next) {
      setField(key, newVal)
    }
  }
}

onMounted(() => {
  let sumSem = 0
  for (const row of semanasRows) {
    sumSem += toIntCantidad(props.formData[row.cantidadKey])
  }
  if (sumSem > semanasMes.value + 1e-9) {
    normalizarSemanasSiHaceFalta()
  }
  let sumD = 0
  let anyDiaMayor7 = false
  for (const row of diasRows) {
    const raw = props.formData[row.cantidadKey]
    const n = Number(raw)
    if (Number.isFinite(n) && n > MAX_DIAS_SEMANA_TOTAL) anyDiaMayor7 = true
    sumD += toIntCantidad(raw)
  }
  if (anyDiaMayor7 || sumD > MAX_DIAS_SEMANA_TOTAL) {
    normalizarDiasSiHaceFalta()
  }
})

const sensibilizacion = computed(() =>
  Number(props.formData.sensibilizacion ?? 90) || 90,
)

/** VENTA MENSUAL (Semanas) = total ventas de la semana × % sensibilizacion (de config plantilla comercial) */
const ventaMensualSemanas = computed(() => {
  const total = totalSemanasVenta.value * (sensibilizacion.value / 100)
  return Number.isFinite(total) ? total : 0
})

/** Tras aplicar límites al escribir, no debería exceder; queda como comprobación. */
const semanasCantidadExcede = computed(() => totalSemanasCantidad.value > semanasMes.value + 1e-9)

const diasCantidadExcede = computed(() => totalDiasCantidad.value > MAX_DIAS_SEMANA_TOTAL)

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
      <p class="mb-2 text-xs text-muted-foreground">
        Semanas (cantidades enteras): la suma no puede superar las <strong>semanas al mes</strong> de la plantilla ({{ semanasMesDisplay }}). Cada fila respeta ese tope.
      </p>
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
                type="text"
                inputmode="numeric"
                maxlength="2"
                autocomplete="off"
                :value="formData[row.cantidadKey] ?? ''"
                class="h-9 w-full max-w-[3rem] rounded border border-input bg-transparent px-2 py-1 text-center text-sm tabular-nums"
                placeholder="0"
                @input="aplicarSemanaCantidad(row.cantidadKey, $event.target as HTMLInputElement)"
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
          <tr class="bg-muted/40 text-xs font-normal">
            <td class="border border-black px-3 py-2 text-left text-muted-foreground" colspan="2">
              Total semanas (suma filas)
            </td>
            <td colspan="2" class="border border-black px-3 py-2 text-right tabular-nums text-muted-foreground">
              {{ totalSemanasCantidad }} / {{ semanasMesDisplay }} sem.
            </td>
          </tr>
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
      <p class="mb-2 text-xs text-muted-foreground">
        Días (cantidades enteras): cada fila es como máximo 7 y entre las tres filas no pueden sumar más de <strong>7 días</strong> (una semana).
      </p>
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
                type="text"
                inputmode="numeric"
                maxlength="2"
                autocomplete="off"
                :value="formData[row.cantidadKey] ?? ''"
                class="h-9 w-full max-w-[3rem] rounded border border-input bg-transparent px-2 py-1 text-center text-sm tabular-nums"
                placeholder="0"
                @input="aplicarDiaCantidad(row.cantidadKey, $event.target as HTMLInputElement)"
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
              {{ totalDiasCantidad }} / {{ MAX_DIAS_SEMANA_TOTAL }}
            </td>
            <td colspan="2" class="border border-black px-3 py-2 text-right tabular-nums text-black">
              {{ formatMoney(totalDiasVenta) }}
            </td>
          </tr>
          <tr
            v-if="diasCantidadExcede"
            class="bg-destructive/10"
          >
            <td colspan="4" class="border border-black px-3 py-2 text-sm text-destructive">
              La suma de días ({{ totalDiasCantidad }}) no puede superar 7.
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
