<script setup lang="ts">
import type { FieldProps } from './interface'
import { FormControl, FormDescription, FormField, FormItem, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import AutoFormLabel from './AutoFormLabel.vue'
import { beautifyObjectName } from './utils'

defineOptions({
  inheritAttrs: false,
})

const props = defineProps<FieldProps>()

function mergeNumberInputBindings(slotField: Record<string, unknown>) {
  const p = { ...slotField, ...props.config?.inputProps } as Record<string, unknown>
  if ('readonly' in p) {
    p.readonly = p.readonly === true || p.readonly === 'true'
  }
  return p
}
</script>

<template>
  <FormField v-slot="slotProps" :name="fieldName">
    <FormItem>
      <AutoFormLabel v-if="!config?.hideLabel" :required="required">
        {{ config?.label || beautifyObjectName(label ?? fieldName) }}
      </AutoFormLabel>
      <FormControl>
        <slot v-bind="slotProps">
          <Input
            type="number"
            v-bind="mergeNumberInputBindings(slotProps.componentField as unknown as Record<string, unknown>)"
            :disabled="disabled || config?.inputProps?.disabled === true || config?.inputProps?.disabled === 'true'"
          />
        </slot>
      </FormControl>
      <FormDescription v-if="config?.description">
        {{ config.description }}
      </FormDescription>
      <FormMessage />
    </FormItem>
  </FormField>
</template>
