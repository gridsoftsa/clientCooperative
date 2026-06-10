<script setup lang="ts">
/**
 * @deprecated Use <Checkbox> from ~/components/ui/checkbox/Checkbox.vue instead.
 * Alias conservado para no romper imports existentes.
 */
import type { HTMLAttributes } from 'vue'
import Checkbox from '~/components/ui/checkbox/Checkbox.vue'

withDefaults(
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

defineEmits<{
  'update:checked': [value: boolean]
}>()
</script>

<template>
  <Checkbox
    :id="id"
    :checked="checked"
    :disabled="disabled"
    :bare="bare"
    :class="class"
    @update:checked="$emit('update:checked', $event === true)"
  >
    <span v-if="$slots.default" :class="labelClass">
      <slot />
    </span>
  </Checkbox>
</template>
