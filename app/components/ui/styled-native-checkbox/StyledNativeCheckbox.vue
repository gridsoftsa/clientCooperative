<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { Check } from 'lucide-vue-next'
import { cn } from '@/lib/utils'
import { coerceBoolean } from '@/utils/coerce-boolean'

/**
 * Checkbox HTML nativo con apariencia shadcn (fondo primary + marca blanca).
 * Implementación probada en ventanilla/sla; preferir este componente en formularios
 * con <label> externo (prop bare).
 */
const props = withDefaults(
  defineProps<{
    checked?: boolean
    disabled?: boolean
    id?: string
    bare?: boolean
    labelClass?: string
    class?: HTMLAttributes['class']
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

const isChecked = computed(() => coerceBoolean(props.checked))

const boxClass = computed(() => cn(
  'pointer-events-none flex size-4 shrink-0 items-center justify-center rounded-[4px] border shadow-xs transition-colors',
  isChecked.value
    ? 'border-primary bg-primary text-primary-foreground'
    : 'border-input bg-background',
  props.disabled && 'opacity-50',
  props.class,
))

function onChange(event: Event): void {
  emit('update:checked', (event.target as HTMLInputElement).checked)
}
</script>

<template>
  <label
    v-if="!bare"
    :for="inputId"
    class="inline-flex cursor-pointer items-center gap-2"
    :class="{ 'cursor-not-allowed opacity-50': disabled }"
  >
    <input
      :id="inputId"
      type="checkbox"
      class="sr-only"
      :checked="isChecked"
      :disabled="disabled"
      @change="onChange"
    >
    <span :class="boxClass" aria-hidden="true">
      <Check v-if="isChecked" class="size-3.5" :stroke-width="3" />
    </span>
    <span v-if="$slots.default" :class="labelClass">
      <slot />
    </span>
  </label>
  <span
    v-else
    class="relative inline-flex shrink-0"
  >
    <input
      :id="inputId"
      type="checkbox"
      class="sr-only"
      :checked="isChecked"
      :disabled="disabled"
      @change="onChange"
    >
    <span :class="boxClass" aria-hidden="true">
      <Check v-if="isChecked" class="size-3.5" :stroke-width="3" />
    </span>
  </span>
</template>
