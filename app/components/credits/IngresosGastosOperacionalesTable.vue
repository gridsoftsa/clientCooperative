<script setup lang="ts">
/**
 * Ingresos y Gastos Operacionales (plantilla comercial).
 * Columna concepto (detalle): caja de texto editable.
 * Columna valor: caja de texto money editable.
 * Totales: calculados.
 */
import { formatPesosConSimbolo, onKeydownPesosOnly, parsePesosInput } from '~/composables/usePesosFormat'

const GASTOS_OPERACIONALES_ROWS = [
  { key: 'arriendo', conceptoDefault: 'Arriendo' },
  { key: 'gastos_servicios', conceptoDefault: 'Gastos servicios' },
  { key: 'gastos_imprevistos', conceptoDefault: 'Gastos imprevistos' },
  { key: 'gastos_empleados', conceptoDefault: 'Gastos empleados' },
] as const

type GastoOperacionalKey = (typeof GASTOS_OPERACIONALES_ROWS)[number]['key']

/** Clave en formData donde se guardan los conceptos editables. */
const GASTOS_OPERACIONALES_CONCEPTOS_KEY = 'gastos_operacionales_conceptos'

const props = withDefaults(
  defineProps<{
    formData: Record<string, unknown>
    invalidFieldKeys?: string[]
    fieldDomIdPrefix?: string
    disabled?: boolean
  }>(),
  {
    invalidFieldKeys: () => [],
    fieldDomIdPrefix: '',
    disabled: false,
  },
)

function domFieldId(key: string): string {
  const p = props.fieldDomIdPrefix?.trim()
  return p ? `${p}-field-${key}` : `field-${key}`
}

const invalidKeySet = computed(() => new Set(props.invalidFieldKeys ?? []))

function isInvalidKey(key: string): boolean {
  return invalidKeySet.value.has(key)
}

const emit = defineEmits<{
  'update:field': [payload: { key: string; value: unknown }]
}>()

function setField(key: string, value: unknown) {
  if (props.disabled) {
    return
  }
  emit('update:field', { key, value })
}

function conceptosMap(): Record<string, string> {
  const raw = props.formData[GASTOS_OPERACIONALES_CONCEPTOS_KEY]
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      out[k] = String(v ?? '')
    }
    return out
  }
  return {}
}

function conceptoDisplay(key: GastoOperacionalKey, conceptoDefault: string): string {
  const map = conceptosMap()
  if (Object.prototype.hasOwnProperty.call(map, key)) {
    return map[key] ?? ''
  }
  return conceptoDefault
}

function setConcepto(key: GastoOperacionalKey, value: string) {
  const next = { ...conceptosMap() }
  // Asegurar defaults para las demás filas la primera vez que se edita
  for (const row of GASTOS_OPERACIONALES_ROWS) {
    if (!Object.prototype.hasOwnProperty.call(next, row.key)) {
      next[row.key] = row.conceptoDefault
    }
  }
  next[key] = value
  setField(GASTOS_OPERACIONALES_CONCEPTOS_KEY, next)
}

function moneyDisplay(key: string): string {
  const raw = props.formData[key]
  if (raw === null || raw === undefined || raw === '') {
    return ''
  }
  const n = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isFinite(n)) {
    return ''
  }
  return formatPesosConSimbolo(n)
}

function onMoneyInput(key: string, event: Event) {
  if (props.disabled) {
    return
  }
  const el = event.target as HTMLInputElement
  const parsed = parsePesosInput(el.value)
  setField(key, parsed ?? null)
}

function onMoneyBlur(key: string, event: Event) {
  if (props.disabled) {
    return
  }
  const el = event.target as HTMLInputElement
  const parsed = parsePesosInput(el.value)
  setField(key, parsed ?? null)
  nextTick(() => {
    el.value = moneyDisplay(key)
  })
}

const totalGastosNegocio = computed(() => {
  let sum = 0
  for (const row of GASTOS_OPERACIONALES_ROWS) {
    const v = Number(props.formData[row.key] ?? 0) || 0
    sum += v
  }
  return Number.isFinite(sum) ? sum : 0
})

const ingresosOperacionales = computed(() =>
  Number(props.formData.ingresos_operacionales ?? 0) || 0,
)

const totalIngresosNetosNegocio = computed(() => {
  const val = ingresosOperacionales.value - totalGastosNegocio.value
  return Number.isFinite(val) ? val : 0
})

function formatMoney(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value) || value === 0) return '$ -'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

const inputClass = (invalid: boolean) => [
  'h-9 w-full rounded border bg-white px-2 py-1 text-sm shadow-xs',
  props.disabled ? 'cursor-not-allowed opacity-50 bg-muted/40' : '',
  invalid && !props.disabled
    ? 'border-destructive ring-2 ring-destructive/50'
    : 'border-input',
]
</script>

<template>
  <div class="overflow-x-auto">
    <p class="mb-2 text-xs text-muted-foreground">
      Edite el <strong>concepto</strong> (detalle del gasto) y el <strong>valor</strong> en cada fila. No vienen de la parametrización.
    </p>
    <table class="w-full min-w-[420px] border-collapse text-sm">
      <colgroup>
        <col>
        <col style="width: 12rem">
      </colgroup>
      <thead>
        <tr>
          <th class="border border-black bg-[#f4d03f] px-3 py-2 text-left font-bold uppercase text-black">
            Concepto / detalle
          </th>
          <th class="border border-black bg-[#f4d03f] px-3 py-2 text-center font-bold uppercase text-black">
            Valor
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in GASTOS_OPERACIONALES_ROWS"
          :key="row.key"
          class="bg-white"
        >
          <td class="border border-black p-1">
            <input
              :id="domFieldId(`${row.key}_concepto`)"
              type="text"
              autocomplete="off"
              :value="conceptoDisplay(row.key, row.conceptoDefault)"
              :placeholder="row.conceptoDefault"
              :disabled="disabled"
              :class="inputClass(false)"
              @input="setConcepto(row.key, ($event.target as HTMLInputElement).value)"
            >
          </td>
          <td class="border border-black p-1">
            <input
              :id="domFieldId(row.key)"
              type="text"
              inputmode="decimal"
              autocomplete="off"
              :value="moneyDisplay(row.key)"
              placeholder="-"
              :disabled="disabled"
              :aria-invalid="isInvalidKey(row.key) && !disabled"
              :class="[...inputClass(isInvalidKey(row.key)), 'text-right tabular-nums']"
              @keydown="onKeydownPesosOnly"
              @input="onMoneyInput(row.key, $event)"
              @blur="onMoneyBlur(row.key, $event)"
            >
          </td>
        </tr>
        <tr class="bg-muted/40">
          <td class="border border-black px-3 py-2 font-semibold text-black">
            Total gastos del negocio
          </td>
          <td class="border border-black px-3 py-2 text-right tabular-nums font-semibold text-black">
            {{ formatMoney(totalGastosNegocio) }}
          </td>
        </tr>
      </tbody>
      <tfoot>
        <tr class="bg-[#f4d03f]">
          <td class="border border-black px-3 py-2 font-bold uppercase text-black">
            Total ingresos netos negocio
          </td>
          <td class="border border-black px-3 py-2 text-right tabular-nums font-bold text-black">
            {{ formatMoney(totalIngresosNetosNegocio) }}
          </td>
        </tr>
      </tfoot>
    </table>
    <p class="mt-2 text-xs text-muted-foreground">
      Ingresos operacionales (desde Semanas y Días): {{ formatMoney(ingresosOperacionales) }}
      — Total ingresos netos = ingresos operacionales − total gastos
    </p>
  </div>
</template>
