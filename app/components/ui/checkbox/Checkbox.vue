<script setup lang="ts">
import type { CheckboxRootEmits, CheckboxRootProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { Check } from 'lucide-vue-next'
import { reactiveOmit } from '@vueuse/core'
import { CheckboxIndicator, CheckboxRoot } from 'reka-ui'
import { cn } from '@/lib/utils'

const props = defineProps<
  CheckboxRootProps & {
    class?: HTMLAttributes['class']
    /** Alias controlado usado en varias pantallas del proyecto */
    checked?: boolean | 'indeterminate' | null
  }
>()

const emits = defineEmits<
  CheckboxRootEmits & {
    'update:checked': [value: boolean | 'indeterminate']
  }
>()

const delegatedProps = reactiveOmit(props, 'class', 'checked', 'modelValue')

const resolvedModel = computed((): boolean | 'indeterminate' => {
  if (props.modelValue !== undefined && props.modelValue !== null) {
    return props.modelValue
  }
  if (props.checked !== undefined && props.checked !== null) {
    return props.checked
  }

  return false
})

function onModelUpdate(value: boolean | 'indeterminate'): void {
  emits('update:modelValue', value)
  emits('update:checked', value)
}
</script>

<template>
  <CheckboxRoot
    v-slot="slotProps"
    data-slot="checkbox"
    v-bind="delegatedProps"
    :model-value="resolvedModel"
    @update:model-value="onModelUpdate"
    :class="
      cn(
        'peer border-input size-4 shrink-0 rounded-[4px] border shadow-xs transition-shadow outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
        props.class,
      )
    "
  >
    <CheckboxIndicator
      data-slot="checkbox-indicator"
      class="grid place-content-center text-current transition-none"
    >
      <slot v-bind="slotProps">
        <Check class="size-3.5" />
      </slot>
    </CheckboxIndicator>
  </CheckboxRoot>
</template>
