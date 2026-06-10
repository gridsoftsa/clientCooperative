<script setup lang="ts">
import { Check } from 'lucide-vue-next'
import { cn } from '@/lib/utils'

/**
 * Checkbox HTML nativo con apariencia shadcn (fondo primary + marca blanca).
 * Evita fallos de Reka UI y mantiene el estilo del resto de la app.
 */
const props = withDefaults(
  defineProps<{
    checked?: boolean
    disabled?: boolean
    id?: string
    bare?: boolean
    labelClass?: string
  }>(),
  {
    checked: false,
    disabled: false,
    bare: false,
    labelClass: '',
  },
)

const emit = defineEmits<{
  'update:checked': [value: boolean]
}>()

const autoId = useId()
const inputId = computed(() => props.id ?? `styled-native-cb-${autoId}`)

const boxClass = computed(() => cn(
  'pointer-events-none flex size-4 shrink-0 items-center justify-center rounded-[4px] border shadow-xs transition-colors',
  props.checked
    ? 'border-primary bg-primary text-primary-foreground'
    : 'border-input bg-background',
  props.disabled && 'opacity-50',
))

function onChange(event: Event): void {
  emit('update:checked', (event.target as HTMLInputElement).checked)
}
</script>

<template>
  <label
    v-if="!bare"
    class="inline-flex cursor-pointer items-center gap-2"
    :class="{ 'cursor-not-allowed opacity-50': disabled }"
  >
    <input
      :id="inputId"
      type="checkbox"
      class="sr-only"
      :checked="checked"
      :disabled="disabled"
      @change="onChange"
    >
    <span :class="boxClass" aria-hidden="true">
      <Check v-if="checked" class="size-3.5" :stroke-width="3" />
    </span>
    <span v-if="$slots.default" :class="labelClass">
      <slot />
    </span>
  </label>
  <span v-else class="relative inline-flex shrink-0">
    <input
      :id="inputId"
      type="checkbox"
      class="sr-only"
      :checked="checked"
      :disabled="disabled"
      @change="onChange"
    >
    <span :class="boxClass" aria-hidden="true">
      <Check v-if="checked" class="size-3.5" :stroke-width="3" />
    </span>
  </span>
</template>
