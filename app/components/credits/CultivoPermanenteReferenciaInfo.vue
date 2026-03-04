<script setup lang="ts">
/**
 * Información de referencia para cultivos permanentes:
 * - Nota: 3 primeros años son pérdidas
 * - Campo editable: Plantas x HA
 */
defineProps<{
  formData: Record<string, unknown>
}>()

const emit = defineEmits<{
  'update:field': [payload: { key: string; value: unknown }]
}>()

function setField(key: string, value: unknown) {
  emit('update:field', { key, value })
}
</script>

<template>
  <div class="rounded-lg border-2 border-border p-4">
    <h4 class="mb-3 text-center text-sm font-bold uppercase text-red-600 dark:text-red-500">
      Información de referencia
    </h4>
    <p class="mb-4 text-center text-sm text-muted-foreground">
      3 primeros años son pérdidas
    </p>
    <div class="flex flex-wrap items-center justify-center gap-3">
      <div class="flex items-center gap-2">
        <input
          type="number"
          step="0.001"
          min="0"
          :value="formData.plantas_x_ha ?? 1111"
          class="h-9 w-28 rounded-md border-2 border-emerald-500 bg-background px-3 py-1 text-right text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring"
          @input="setField('plantas_x_ha', ($event.target as HTMLInputElement).value === '' ? null : Number(($event.target as HTMLInputElement).value))"
        >
        <span class="text-sm font-medium">
          Plantas x HA
        </span>
      </div>
    </div>
  </div>
</template>
