<script setup lang="ts">
/**
 * Input de moneda blindado: muestra formato COP ($ 10.000,00) y emite número limpio.
 * Solo permite caracteres numéricos y un separador decimal.
 */
const props = withDefaults(
  defineProps<{
    modelValue?: number | string | null
    label?: string
    disabled?: boolean
    placeholder?: string
  }>(),
  {
    modelValue: null,
    label: '',
    disabled: false,
    placeholder: '0,00',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: number | null]
}>()

const inputId = `money-input-${Math.random().toString(36).slice(2, 9)}`
const inputRef = ref<HTMLInputElement | null>(null)
const isFocused = ref(false)

/** Formato COP: punto miles, coma decimales, 2 decimales */
function formatDisplay(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return ''
  const num = typeof value === 'string' ? parseFloat(value.replace(',', '.')) : Number(value)
  if (Number.isNaN(num)) return ''
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

/** Valor numérico actual para cálculos */
const numericValue = computed(() => {
  const v = props.modelValue
  if (v === null || v === undefined || v === '') return null
  const num = typeof v === 'string' ? parseFloat(String(v).replace(',', '.')) : Number(v)
  return Number.isNaN(num) ? null : num
})

/** En foco: mostramos valor editable (número); al salir: mostramos formateado */
const displayValue = computed(() => {
  if (props.disabled) {
    return formatDisplay(numericValue.value)
  }
  if (isFocused.value) {
    if (numericValue.value === null) return ''
    return String(numericValue.value)
  }
  return formatDisplay(numericValue.value)
})

/** Al hacer foco: seleccionar todo para reemplazar fácil */
function onFocus() {
  isFocused.value = true
  nextTick(() => inputRef.value?.select())
}

function onBlur() {
  isFocused.value = false
  const n = numericValue.value
  emit('update:modelValue', n ?? null)
}

/** Solo números y un punto o coma decimal. Normaliza pegado (10.000,50 -> 10000.50). Emite número. */
function onInput(event: Event) {
  const input = event.target as HTMLInputElement
  let raw = input.value.replace(/[^\d,.]/g, '')
  const parts = raw.split(/[,.]/)
  let normalized: string
  if (parts.length > 2) {
    normalized = parts[0] + '.' + parts.slice(1).join('')
  } else if (parts.length === 2) {
    normalized = parts[0] + '.' + parts[1].slice(0, 2)
  } else {
    normalized = raw
  }
  input.value = normalized
  const num = normalized === '' ? null : parseFloat(normalized.replace(',', '.'))
  const toEmit = num !== null && !Number.isNaN(num) ? num : null
  emit('update:modelValue', toEmit)
}

/** Evitar teclas no numéricas (permitir punto, coma, backspace, etc.) */
function onKeydown(event: KeyboardEvent) {
  const allowed = ['Backspace', 'Tab', 'ArrowLeft', 'ArrowRight', 'Delete']
  if (allowed.includes(event.key)) return
  if (event.key === '.' || event.key === ',') return
  if (!/^\d$/.test(event.key)) {
    event.preventDefault()
  }
}
</script>

<template>
  <div class="grid gap-2">
    <Label v-if="label" :for="inputId" class="text-sm font-medium">
      {{ label }}
    </Label>
    <div class="relative">
      <span
        v-if="!isFocused && numericValue !== null && numericValue !== undefined"
        class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
      >
        $&nbsp;
      </span>
      <input
        :id="inputId"
        ref="inputRef"
        type="text"
        inputmode="decimal"
        autocomplete="off"
        :value="displayValue"
        :placeholder="placeholder"
        :disabled="disabled"
        class="flex h-9 w-full rounded-md border border-input bg-transparent py-1 pr-3 text-right text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        :class="[!isFocused && numericValue != null ? 'pl-8' : 'pl-3']"
        @focus="onFocus"
        @blur="onBlur"
        @input="onInput"
        @keydown="onKeydown"
      >
    </div>
  </div>
</template>
