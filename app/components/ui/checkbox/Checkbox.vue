<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { Check } from 'lucide-vue-next'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    id?: string
    class?: HTMLAttributes['class']
    disabled?: boolean
    /** Solo el cuadro (sin texto integrado); compatible con `<Label for="id">` externo. */
    bare?: boolean
  }>(),
  {
    disabled: false,
    bare: false,
  },
)

/** API habitual en el proyecto: `:model-value` / `@update:model-value`. */
const modelValue = defineModel<boolean>({ default: undefined })
/** API alternativa: `v-model:checked`. */
const checkedModel = defineModel<boolean>('checked', { default: undefined })

const isChecked = computed({
  get(): boolean {
    if (checkedModel.value !== undefined) {
      return checkedModel.value
    }
    if (modelValue.value !== undefined) {
      return modelValue.value
    }

    return false
  },
  set(next: boolean) {
    modelValue.value = next
    checkedModel.value = next
  },
})

function onChange(event: Event): void {
  const target = event.target as HTMLInputElement
  isChecked.value = target.checked
}

const boxClass = cn(
  'flex size-4 items-center justify-center rounded-[4px] border border-input shadow-xs transition-shadow',
  'peer-focus-visible:border-ring peer-focus-visible:ring-[3px] peer-focus-visible:ring-ring/50',
  'peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground',
  'peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
  props.class,
)
</script>

<template>
  <label
    v-if="!bare && $slots.default"
    class="inline-flex cursor-pointer items-center gap-2"
    :class="{ 'cursor-not-allowed opacity-50': disabled }"
  >
    <span class="relative inline-flex h-4 w-4 shrink-0">
      <input
        :id="id"
        type="checkbox"
        class="peer absolute inset-0 z-10 m-0 cursor-pointer opacity-0"
        :checked="isChecked"
        :disabled="disabled"
        @change="onChange"
      >
      <span data-slot="checkbox" :class="boxClass" aria-hidden="true">
        <Check v-if="isChecked" class="size-3.5" />
      </span>
    </span>
    <slot />
  </label>
  <span
    v-else
    class="relative inline-flex h-4 w-4 shrink-0"
    :class="{ 'opacity-50': disabled }"
  >
    <input
      :id="id"
      type="checkbox"
      class="peer absolute inset-0 z-10 m-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
      :checked="isChecked"
      :disabled="disabled"
      @change="onChange"
    >
    <span data-slot="checkbox" :class="boxClass" aria-hidden="true">
      <Check v-if="isChecked" class="size-3.5" />
    </span>
  </span>
</template>
