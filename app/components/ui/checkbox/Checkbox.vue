<script setup lang="ts">
import type { CheckboxRootEmits, CheckboxRootProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { Check } from 'lucide-vue-next'
import { CheckboxIndicator, CheckboxRoot, useForwardProps } from 'reka-ui'
import { computed } from 'vue'
import { cn } from '@/lib/utils'

/**
 * Reka `CheckboxRoot` is controlled with `modelValue` / `update:modelValue`.
 * Shadcn-vue examples often use `checked` / `update:checked`; we bridge both so either works.
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

const delegatedProps = computed(() => reactiveOmit(props, 'class', 'checked', 'modelValue'))

const forwarded = useForwardProps(delegatedProps)

/**
 * Writable bridge so Reka’s internal `useVModel` stays in sync: `:model-value` + manual `@update`
 * was leaving the inner ref out of sync, so clicks did nothing.
 */
const bridgedModel = computed({
  get(): boolean | 'indeterminate' | undefined | null {
    if (props.modelValue !== undefined && props.modelValue !== null) {
      return props.modelValue
    }
    if (props.checked !== undefined && props.checked !== null) {
      return props.checked
    }

    return undefined
  },
  set(value: boolean | 'indeterminate') {
    emits('update:modelValue', value)
    emits('update:checked', value)
  },
})
</script>

<template>
  <CheckboxRoot
    data-slot="checkbox"
    v-bind="forwarded"
    v-model="bridgedModel"
    :class="
      cn('peer border-input data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:border-primary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive size-4 shrink-0 rounded-[4px] border shadow-xs transition-shadow outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
         props.class)"
  >
    <CheckboxIndicator
      data-slot="checkbox-indicator"
      class="flex items-center justify-center text-current transition-none"
    >
      <slot>
        <Check class="size-3.5" />
      </slot>
    </CheckboxIndicator>
  </CheckboxRoot>
</template>
