<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { Check } from 'lucide-vue-next'
import { cn } from '@/lib/utils'
import { coerceBoolean } from '@/utils/coerce-boolean'

/**
 * Checkbox basado en <input type="checkbox"> nativo + apariencia shadcn.
 * Misma base que StyledNativeCheckbox (sin Reka UI).
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
const inputRef = ref<HTMLInputElement | null>(null)

const resolvedValue = computed((): boolean | 'indeterminate' | null | undefined => {
  if (props.modelValue !== undefined && props.modelValue !== null) {
    return props.modelValue
  }

  return props.checked
})

const isChecked = computed((): boolean => coerceBoolean(resolvedValue.value))

const isIndeterminate = computed((): boolean => resolvedValue.value === 'indeterminate')

const boxClass = computed(() => cn(
  'pointer-events-none flex size-4 shrink-0 items-center justify-center rounded-[4px] border shadow-xs transition-colors',
  isChecked.value
    ? 'border-primary bg-primary text-primary-foreground'
    : 'border-input bg-background',
  props.disabled && 'opacity-50',
  props.class,
))

function syncIndeterminate(): void {
  if (!inputRef.value) {
    return
  }

  inputRef.value.indeterminate = isIndeterminate.value
}

watch(isIndeterminate, syncIndeterminate)
onMounted(syncIndeterminate)

function onChange(event: Event): void {
  const input = event.target as HTMLInputElement
  const next: boolean | 'indeterminate' = input.indeterminate
    ? 'indeterminate'
    : input.checked

  emit('update:modelValue', next)
  emit('update:checked', next)
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
      ref="inputRef"
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
      ref="inputRef"
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
