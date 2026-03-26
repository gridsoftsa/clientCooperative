<script setup lang="ts">
/**
 * Tabla editable de Ingresos por Servicio.
 * Columnas: Tipo de día | Valor | Días en la semana | Total
 * Las cantidades son días por semana: cada fila ≤ 7 y la suma de filas ≤ 7.
 */
import type { ServiciosIngresosRow } from '~/constants/servicios-ingresos-table'

const MAX_DIAS_POR_FILA = 7
const MAX_DIAS_SEMANA_TOTAL = 7
/** La semana tiene 7 días: como mucho 2 cifras al escribir (p. ej. 10 se ajusta a 7). */
const MAX_DIGITOS_CANTIDAD = 2

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

function toIntCantidad(v: unknown): number {
  const n = Number(v)
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.min(MAX_DIAS_POR_FILA, Math.floor(n))
}

/** Reparte a lo sumo 7 días entre filas (orden de la tabla); corrige datos legacy. */
function normalizeCantidadesSemana() {
  let remaining = MAX_DIAS_SEMANA_TOTAL
  for (const row of props.tableRows) {
    const key = getCantidadKey(row.suffix)
    const parsed = toIntCantidad(props.formData[key])
    const next = Math.min(parsed, remaining)
    remaining -= next
    const newVal = next === 0 ? null : next
    if (parsed !== next) {
      setField(key, newVal)
    }
  }
}

onMounted(() => {
  let sum = 0
  let anyOver = false
  for (const row of props.tableRows) {
    const raw = props.formData[getCantidadKey(row.suffix)]
    const nRaw = Number(raw)
    if (Number.isFinite(nRaw) && nRaw > MAX_DIAS_POR_FILA) {
      anyOver = true
    }
    sum += toIntCantidad(raw)
  }
  if (anyOver || sum > MAX_DIAS_SEMANA_TOTAL) {
    normalizeCantidadesSemana()
  }
})

function cantidadOtrosExcluyendo(suffix: string): number {
  let sum = 0
  for (const row of props.tableRows) {
    if (row.suffix === suffix) continue
    sum += toIntCantidad(props.formData[getCantidadKey(row.suffix)])
  }
  return sum
}

function sanitizarDigitosCantidad(raw: string): string {
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

/**
 * Corrige el texto del input al valor que realmente se guarda (evita quedar en "11" cuando el modelo es 7, etc.).
 */
function aplicarCantidad(suffix: string, el: HTMLInputElement) {
  const key = getCantidadKey(suffix)
  const soloDigitos = sanitizarDigitosCantidad(el.value)

  if (soloDigitos === '') {
    setField(key, null)
    syncInputCantidad(el, null)
    return
  }

  const solicitado = toIntCantidad(Number(soloDigitos))
  const otros = cantidadOtrosExcluyendo(suffix)
  const topePorSuma = Math.max(0, MAX_DIAS_SEMANA_TOTAL - otros)
  const finalVal = Math.min(solicitado, topePorSuma)
  const stored = finalVal === 0 ? null : finalVal
  setField(key, stored)
  syncInputCantidad(el, stored)
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

const totalDiasSemana = computed(() => {
  let sum = 0
  for (const row of props.tableRows) {
    sum += toIntCantidad(props.formData[getCantidadKey(row.suffix)])
  }
  return sum
})
</script>

<template>
  <div class="overflow-x-auto rounded-lg border border-border">
    <p class="mb-2 text-xs text-muted-foreground">
      Días por semana: cada tipo admite como máximo 7 y entre los tres no pueden sumar más de 7.
      Solo se permiten hasta {{ MAX_DIGITOS_CANTIDAD }} cifras por celda.
    </p>
    <table class="w-full min-w-[520px] table-fixed border-collapse text-sm">
      <colgroup>
        <col class="min-w-0">
        <col style="width: 8.5rem">
        <col style="width: 7.5rem">
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
          <th class="border border-border px-1.5 py-2 text-left align-bottom">
            <span class="block max-w-[7rem] whitespace-normal break-words text-xs font-semibold leading-snug sm:text-sm">
              Cant.<span class="text-muted-foreground font-normal"> / sem.</span>
            </span>
            <span class="mt-0.5 block text-[0.65rem] font-normal leading-tight text-muted-foreground">
              (máx. 7 días)
            </span>
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
              type="text"
              inputmode="numeric"
              autocomplete="off"
              maxlength="2"
              enterkeyhint="done"
              :value="formData[getCantidadKey(row.suffix)] ?? ''"
              class="h-8 w-full max-w-[3.25rem] min-w-0 rounded border border-input bg-transparent px-2 py-1 text-right text-sm tabular-nums"
              placeholder="0"
              @input="aplicarCantidad(row.suffix, $event.target as HTMLInputElement)"
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
          <td class="border border-border px-2 py-2 text-right text-xs font-normal tabular-nums text-muted-foreground">
            {{ totalDiasSemana }} / {{ MAX_DIAS_SEMANA_TOTAL }} días
          </td>
          <td class="border border-border px-3 py-2 text-right tabular-nums">
            {{ formatMoney(totalSemana) }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
