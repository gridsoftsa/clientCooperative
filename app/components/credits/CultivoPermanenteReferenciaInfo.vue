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
    <div class="mb-3 flex flex-col items-center gap-2">
      <h4 class="text-center text-sm font-bold uppercase text-red-600 dark:text-red-500">
        Información de referencia
      </h4>
      <span
        class="inline-flex items-center gap-0.5 rounded-md border border-amber-600/40 bg-amber-100/90 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-950 dark:border-amber-500/45 dark:bg-amber-950/55 dark:text-amber-100"
      >
        <Icon name="i-lucide-lock" class="size-3 shrink-0 opacity-90" aria-hidden="true" />
        Solo lectura (parametrización)
      </span>
    </div>
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
