<script setup lang="ts">
import { buildCatalogCode, catalogCodePrefix, catalogCodeSuffix } from '~/utils/archival-catalog-code'

const props = withDefaults(defineProps<{
  prefix: string
  modelValue: string
  disabled?: boolean
  maxlength?: number
  id?: string
  placeholder?: string
  required?: boolean
  showErrors?: boolean
  errorMessage?: string
  externalError?: string | null
}>(), {
  errorMessage: 'Digite el sufijo del código.',
  externalError: null,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'update:invalid': [value: boolean]
}>()

const suffixText = ref('')
const interacted = ref(false)
const inputRef = ref<{ $el?: HTMLInputElement } | null>(null)

const showPrefix = computed(() => catalogCodePrefix(props.prefix) !== '')

const suffixEmpty = computed(() => !suffixText.value.trim())

const hasValidationError = computed(() => {
  if (props.externalError) {
    return true
  }

  if (!props.required) {
    return false
  }

  if (!suffixEmpty.value) {
    return false
  }

  return interacted.value || props.showErrors
})

const displayErrorMessage = computed(() => props.externalError || props.errorMessage)

const prefixClass = computed(() => {
  if (!hasValidationError.value) {
    return 'border-input bg-muted text-muted-foreground'
  }

  return 'border-destructive bg-destructive/5 text-destructive'
})

const inputClass = computed(() => {
  const classes = ['h-10', 'min-w-[6rem]', 'flex-1', 'shadow-xs']

  if (showPrefix.value) {
    classes.push('rounded-l-none')
  }

  return classes
})

watch(
  () => [props.prefix, props.modelValue] as const,
  () => {
    suffixText.value = catalogCodeSuffix(props.prefix, props.modelValue)
  },
  { immediate: true },
)

watch(suffixText, (value, oldValue) => {
  if (oldValue !== undefined) {
    interacted.value = true
  }

  const built = value.trim()
    ? buildCatalogCode(props.prefix, value)
    : ''

  if (built !== props.modelValue) {
    emit('update:modelValue', built)
  }
})

watch(hasValidationError, (invalid) => {
  emit('update:invalid', invalid)
}, { immediate: true })

function isValid(): boolean {
  if (props.externalError) {
    return false
  }

  return !props.required || !suffixEmpty.value
}

function focusInput(): void {
  const el = inputRef.value?.$el
  el?.focus()
}

defineExpose({ isValid, focus: focusInput })
</script>

<template>
  <div class="space-y-1.5">
    <div class="flex w-full min-w-0 items-center">
      <span
        v-if="showPrefix"
        class="inline-flex h-10 shrink-0 items-center rounded-l-md border border-r-0 px-3 font-mono text-sm"
        :class="prefixClass"
        :title="`${prefix}-`"
      >
        {{ prefix }}-
      </span>
      <Input
        :id="id"
        ref="inputRef"
        v-model="suffixText"
        type="text"
        :disabled="disabled"
        :maxlength="maxlength"
        :placeholder="placeholder"
        :class="inputClass"
        :aria-invalid="hasValidationError ? true : undefined"
      />
    </div>
    <p v-if="hasValidationError" class="text-xs text-destructive">
      {{ displayErrorMessage }}
    </p>
  </div>
</template>
