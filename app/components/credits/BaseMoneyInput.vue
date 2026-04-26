<script setup lang="ts">
/**
 * Input de moneda blindado: muestra formato COP (1.234.567,50) y emite número limpio.
 * Usa usePesosFormat para consistencia con el resto de la app.
 */
const { formatPesosConSimbolo, parsePesosInput, onKeydownPesosOnly } = usePesosFormat()

const props = withDefaults(
  defineProps<{
    modelValue?: number | string | null
    label?: string
    /** Indicador “Solo lectura” (campo fijado por plantilla), alineado con FormFieldLabel */
    showSoloLecturaHint?: boolean
    disabled?: boolean
    placeholder?: string
  }>(),
  {
    modelValue: null,
    label: '',
    showSoloLecturaHint: false,
    disabled: false,
    placeholder: '0,00',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: number | null]
}>()

const inputId = `money-input-${Math.random().toString(36).slice(2, 9)}`
const inputRef = ref<HTMLInputElement | null>(null)

/** Valor numérico para display y cálculos */
const numericValue = computed(() => {
  const v = props.modelValue
  if (v === null || v === undefined || v === '') return null
  const num = typeof v === 'string' ? parseFloat(String(v).replace(',', '.')) : Number(v)
  return Number.isNaN(num) ? null : num
})

/** Display con $ y formato COP (1.234.567,50) */
const displayValue = computed(() => {
  const n = numericValue.value
  if (n === null) {
    return ''
  }
  return formatPesosConSimbolo(n)
})

/** Al editar: parsea con parsePesosInput y emite número */
function onInput(event: Event) {
  const input = event.target as HTMLInputElement
  const raw = input.value
  const parsed = parsePesosInput(raw)
  emit('update:modelValue', parsed ?? null)
}

/** Al salir: re-parsea por si acaso */
function onBlur() {
  const input = inputRef.value
  if (input) {
    const parsed = parsePesosInput(input.value)
    if (parsed !== undefined) {
      emit('update:modelValue', parsed)
    }
  }
}
</script>

<template>
  <div class="grid gap-2">
    <Label v-if="label" :for="inputId" class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium">
      <span>{{ label }}</span>
      <span
        v-if="showSoloLecturaHint"
        class="inline-flex items-center gap-0.5 rounded-md border border-amber-600/40 bg-amber-100/90 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-950 dark:border-amber-500/45 dark:bg-amber-950/55 dark:text-amber-100"
      >
        <Icon name="i-lucide-lock" class="size-3 shrink-0 opacity-90" aria-hidden="true" />
        Solo lectura
      </span>
    </Label>
    <div class="relative">
      <input
        :id="inputId"
        ref="inputRef"
        type="text"
        inputmode="decimal"
        autocomplete="off"
        :value="displayValue"
        :placeholder="placeholder"
        :disabled="disabled"
        class="flex h-9 w-full rounded-md border border-input bg-transparent py-1 pl-3 pr-3 text-right text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        @input="onInput"
        @blur="onBlur"
        @keydown="onKeydownPesosOnly"
      >
    </div>
  </div>
</template>
