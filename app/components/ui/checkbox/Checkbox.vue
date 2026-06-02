<script setup lang="ts">
import type { CheckboxRootEmits, CheckboxRootProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { Check } from 'lucide-vue-next'
import { reactiveOmit } from '@vueuse/core'
import { CheckboxIndicator, CheckboxRoot, useForwardProps } from 'reka-ui'
import { computed } from 'vue'
import { cn } from '@/lib/utils'

/**
 * Reka `CheckboxRoot` is controlled with `modelValue` / `update:modelValue`.
 * Shadcn-vue examples often use `checked` / `update:checked`; we bridge both.
 * Use explicit `:model-value` (not v-model on a writable computed) so the root
 * `data-state` and indicator stay in sync when the parent updates.
 */
const props = defineProps<
  CheckboxRootProps & {
    class?: HTMLAttributes['class']
    checked?: boolean | 'indeterminate' | null
  }
>()

const emits = defineEmits<
  CheckboxRootEmits & {
    'update:checked': [value: boolean | 'indeterminate']
  }
>()

const delegatedProps = computed(() =>
  reactiveOmit(props, 'class', 'checked', 'modelValue'),
)

const forwarded = useForwardProps(delegatedProps)

const resolvedModelValue = computed((): boolean | 'indeterminate' | undefined => {
  if (props.modelValue !== undefined && props.modelValue !== null) {
    return props.modelValue
  }
  if (props.checked !== undefined && props.checked !== null) {
    return props.checked
  }

  return undefined
})

function onUpdateModelValue(value: boolean | 'indeterminate'): void {
  emits('update:modelValue', value)
  emits('update:checked', value)
}
</script>

<template>
  <CheckboxRoot
    v-slot="slotProps"
    data-slot="checkbox"
    v-bind="forwarded"
    :model-value="resolvedModelValue"
    :class="
      cn(
        'peer border-input size-4 shrink-0 rounded-[4px] border shadow-xs transition-shadow outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
        props.class,
      )
    "
    @update:model-value="onUpdateModelValue"
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
