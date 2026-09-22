<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'
import { coerceBoolean } from '@/utils/coerce-boolean'

/**
 * Switch nativo (input checkbox + apariencia shadcn).
 * Reka UI SwitchRoot no refleja bien el estado controlado en este entorno.
 */
const props = withDefaults(
  defineProps<{
    modelValue?: unknown
    checked?: unknown
    disabled?: boolean
    id?: string
    class?: HTMLAttributes['class']
    name?: string
  }>(),
  {
    disabled: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'update:checked': [value: boolean]
}>()

const autoId = useId()
const inputId = computed(() => props.id ?? `ui-switch-${autoId}`)

const isChecked = computed((): boolean => {
  if (props.checked !== undefined && props.checked !== null) {
    return coerceBoolean(props.checked)
  }

  return coerceBoolean(props.modelValue)
})

function onChange(event: Event): void {
  const input = event.target as HTMLInputElement
  const next = input.checked
  emit('update:modelValue', next)
  emit('update:checked', next)
}
</script>

<template>
  <span
    class="relative inline-flex h-[1.15rem] w-8 shrink-0 items-center"
    :class="{ 'cursor-not-allowed opacity-50': disabled }"
  >
    <input
      :id="inputId"
      type="checkbox"
      role="switch"
      class="absolute inset-0 z-10 m-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
      :checked="isChecked"
      :disabled="disabled"
      :name="name"
      :aria-checked="isChecked"
      @change="onChange"
    >
    <span
      aria-hidden="true"
      :class="cn(
        'pointer-events-none inline-flex h-full w-full items-center rounded-full border border-transparent p-0.5 shadow-xs transition-colors',
        isChecked ? 'justify-end bg-primary' : 'justify-start bg-input',
        props.class,
      )"
    >
      <span class="block size-4 rounded-full bg-background shadow-sm ring-0" />
    </span>
  </span>
</template>
