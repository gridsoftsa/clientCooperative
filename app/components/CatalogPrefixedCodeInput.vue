<script setup lang="ts">
import { buildCatalogCode, catalogCodePrefix, catalogCodeSuffix } from '~/utils/archival-catalog-code'

const props = defineProps<{
  prefix: string
  modelValue: string
  disabled?: boolean
  maxlength?: number
  id?: string
  placeholder?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const suffixText = ref('')

const showPrefix = computed(() => catalogCodePrefix(props.prefix) !== '')

watch(
  () => [props.prefix, props.modelValue] as const,
  () => {
    suffixText.value = catalogCodeSuffix(props.prefix, props.modelValue)
  },
  { immediate: true },
)

watch(suffixText, (value) => {
  const built = buildCatalogCode(props.prefix, value)
  if (built !== props.modelValue) {
    emit('update:modelValue', built)
  }
})
</script>

<template>
  <div class="flex w-full min-w-0 items-center">
    <span
      v-if="showPrefix"
      class="inline-flex h-10 shrink-0 items-center rounded-l-md border border-r-0 border-input bg-muted px-3 font-mono text-sm text-muted-foreground"
      :title="`${prefix}-`"
    >
      {{ prefix }}-
    </span>
    <Input
      :id="id"
      v-model="suffixText"
      type="text"
      :disabled="disabled"
      :maxlength="maxlength"
      :placeholder="placeholder"
      class="h-10 min-w-[6rem] flex-1 shadow-xs"
      :class="showPrefix ? 'rounded-l-none' : ''"
    />
  </div>
</template>
