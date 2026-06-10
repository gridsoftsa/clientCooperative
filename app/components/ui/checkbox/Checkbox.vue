<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { Check } from 'lucide-vue-next'
import { cn } from '@/lib/utils'

/**
 * Checkbox basado en <input type="checkbox"> nativo + apariencia shadcn.
 * No usa Reka UI (evita fallos de estado controlado en WSL/navegador).
 *
 * Uso:
 * - v-model o :checked + @update:checked
 * - Con texto: <Checkbox v-model="x">Etiqueta</Checkbox>
 * - Dentro de <label> externo: <Checkbox bare :checked="x" @update:checked="..." />
 * - Con <Label for="id">: <Checkbox id="id" v-model="x" />
 */
const props = withDefaults(
  defineProps<{
    modelValue?: boolean | 'indeterminate' | null
    checked?: boolean | 'indeterminate' | null
    disabled?: boolean
    id?: string
    bare?: boolean
    class?: HTMLAttributes['class']
  }>(),
  {
    disabled: false,
    bare: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean | 'indeterminate']
  'update:checked': [value: boolean | 'indeterminate']
}>()

const autoId = useId()
const inputId = computed(() => props.id ?? `ui-checkbox-${autoId}`)

const isChecked = computed((): boolean => {
  const value = props.modelValue !== undefined && props.modelValue !== null
    ? props.modelValue
    : props.checked

  return value === true
})

const boxClass = computed(() => cn(
  'pointer-events-none flex size-4 shrink-0 items-center justify-center rounded-[4px] border shadow-xs transition-colors',
  isChecked.value
    ? 'border-primary bg-primary text-primary-foreground'
    : 'border-input bg-background',
  props.disabled && 'opacity-50',
  props.class,
))

function onChange(event: Event): void {
  const next = (event.target as HTMLInputElement).checked
  emit('update:modelValue', next)
  emit('update:checked', next)
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
      :checked="isChecked"
      :disabled="disabled"
      @change="onChange"
    >
    <span :class="boxClass" aria-hidden="true">
      <Check v-if="isChecked" class="size-3.5" :stroke-width="3" />
    </span>
    <span v-if="$slots.default" class="text-sm leading-none">
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
