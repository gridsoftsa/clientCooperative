<script setup lang="ts">
/**
 * Ingresos y Gastos Operacionales (plantilla comercial).
 * Arriendo / gastos: cajas de texto editables (captura del asesor, NO parametrización).
 * Totales: calculados.
 */
import { formatPesosConSimbolo, onKeydownPesosOnly, parsePesosInput } from '~/composables/usePesosFormat'

const props = withDefaults(
  defineProps<{
    formData: Record<string, unknown>
    invalidFieldKeys?: string[]
    fieldDomIdPrefix?: string
    /** Solo lectura (p. ej. modo solo documentos tras devolución). */
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

const gastosRows = [
  { key: 'arriendo', label: 'Arriendo' },
  { key: 'gastos_servicios', label: 'Gastos servicios' },
  { key: 'gastos_imprevistos', label: 'Gastos imprevistos' },
  { key: 'gastos_empleados', label: 'Gastos empleados' },
] as const

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
  // Re-sincroniza display formateado
  nextTick(() => {
    el.value = moneyDisplay(key)
  })
}

const totalGastosNegocio = computed(() => {
  let sum = 0
  for (const row of gastosRows) {
    const v = Number(props.formData[row.key] ?? 0) || 0
    sum += v
  }
  return Number.isFinite(sum) ? sum : 0
})

const ingresosOperacionales = computed(() =>
  Number(props.formData.ingresos_operacionales ?? 0) || 0,
)

const totalIngresosNetosNegocio = computed(() => {
  const ing = ingresosOperacionales.value
  const gast = totalGastosNegocio.value
  const val = ing - gast
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
</script>

<template>
  <div class="overflow-x-auto">
    <p class="mb-2 text-xs text-muted-foreground">
      Capture aquí los gastos del negocio (cajas editables). No vienen de la parametrización de la plantilla.
    </p>
    <table class="w-full min-w-[380px] border-collapse text-sm">
      <colgroup>
        <col>
        <col style="width: 12rem">
      </colgroup>
      <thead>
        <tr>
          <th
            colspan="2"
            class="border border-black bg-[#f4d03f] px-3 py-2 text-left font-bold uppercase tracking-wide text-black"
          >
            Gastos operacionales
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in gastosRows"
          :key="row.key"
          class="bg-white"
        >
          <td class="border border-black px-3 py-2 font-medium text-black">
            {{ row.label }}
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
              :class="[
                'h-9 w-full rounded border bg-transparent px-2 py-1 text-right text-sm tabular-nums',
                disabled ? 'cursor-not-allowed opacity-50' : '',
                isInvalidKey(row.key) && !disabled
                  ? '!border-destructive ring-2 ring-destructive/50'
                  : 'border-input',
              ]"
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
