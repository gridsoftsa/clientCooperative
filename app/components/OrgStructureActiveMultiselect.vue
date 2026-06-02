<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    /** Etiquetas Activo/Inactivo vs Activa/Inactiva (agencia, área). */
    gender?: 'masculine' | 'feminine'
    inputId: string
    helperText?: string
    /** Si es false, no se muestra la etiqueta «Estado» (p. ej. el `Card` ya tiene título). */
    showLabel?: boolean
    disabled?: boolean
  }>(),
  { gender: 'masculine', showLabel: true, helperText: '', disabled: false },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const statusLabel = computed(() => {
  if (props.gender === 'feminine') {
    return props.modelValue ? 'Activa' : 'Inactiva'
  }

  return props.modelValue ? 'Activo' : 'Inactivo'
})

function onToggle(value: boolean) {
  emit('update:modelValue', value)
}
</script>

<template>
  <div class="space-y-2 md:col-span-2">
    <div v-if="showLabel || helperText" class="space-y-1.5">
      <Label v-if="showLabel" :for="inputId" class="leading-snug">Estado</Label>
      <p v-if="helperText" class="text-sm text-muted-foreground leading-relaxed">
        {{ helperText }}
      </p>
    </div>
    <div class="flex items-center gap-2">
      <Switch
        :id="inputId"
        :model-value="modelValue"
        :disabled="disabled"
        @update:model-value="onToggle"
      />
      <Label :for="inputId" class="font-normal">{{ statusLabel }}</Label>
    </div>
  </div>
</template>
