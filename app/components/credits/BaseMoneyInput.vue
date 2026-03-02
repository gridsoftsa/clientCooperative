<script setup lang="ts">
/**
 * Input de moneda blindado: muestra formato COP (1.234.567,50) y emite número limpio.
 * Usa usePesosFormat para consistencia con el resto de la app.
 */
const { formatPesos, parsePesosInput, onKeydownPesosOnly } = usePesosFormat()

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

/** Valor numérico para display y cálculos */
const numericValue = computed(() => {
  const v = props.modelValue
  if (v === null || v === undefined || v === '') return null
  const num = typeof v === 'string' ? parseFloat(String(v).replace(',', '.')) : Number(v)
  return Number.isNaN(num) ? null : num
})

/** Display con formato pesos (1.234.567,50) */
const displayValue = computed(() => formatPesos(numericValue.value))

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
    <Label v-if="label" :for="inputId" class="text-sm font-medium">
      {{ label }}
    </Label>
    <div class="relative">
      <span
        v-if="numericValue != null"
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
        :class="[numericValue != null ? 'pl-8' : 'pl-3']"
        @input="onInput"
        @blur="onBlur"
        @keydown="onKeydownPesosOnly"
      >
    </div>
  </div>
</template>
