<script setup lang="ts">
/**
 * Información de referencia para cultivos permanentes.
 * Solo lectura: los datos vienen de la configuración de la plantilla.
 */
defineProps<{
  formData: Record<string, unknown>
}>()
</script>

<template>
  <div class="rounded-lg border-2 border-border p-4">
    <h4 class="mb-3 text-center text-sm font-bold uppercase text-red-600 dark:text-red-500">
      Información de referencia
    </h4>
    <p class="mb-4 text-center text-sm text-muted-foreground">
      {{ formData.descripcion ?? '3 primeros años son pérdidas' }}
    </p>
    <div class="flex flex-wrap items-center justify-center gap-3">
      <div class="flex items-center gap-2">
        <div
          class="flex h-9 w-28 items-center justify-end rounded-md border border-input bg-muted/30 px-3 py-1 text-right text-sm tabular-nums"
        >
          {{ formData.plantas_x_ha ?? 1111 }}
        </div>
        <span class="text-sm font-medium">
          Plantas x HA
        </span>
      </div>
    </div>
  </div>
</template>
