<script setup lang="ts">
/**
 * Información de referencia para ganado para la ceba.
 * Datos desde flat data: edades y pesos de referencia.
 */
defineProps<{
  formData: Record<string, unknown>
}>()
</script>

<template>
  <div class="overflow-hidden rounded-lg border border-border">
    <div class="border-b border-border bg-muted/50 px-4 py-2">
      <div class="flex flex-wrap items-center gap-2">
        <h4 class="text-sm font-bold uppercase text-red-600 dark:text-red-500">
          Información de referencia
        </h4>
        <span
          class="inline-flex items-center gap-0.5 rounded-md border border-amber-600/40 bg-amber-100/90 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-950 dark:border-amber-500/45 dark:bg-amber-950/55 dark:text-amber-100"
        >
          <Icon name="i-lucide-lock" class="size-3 shrink-0 opacity-90" aria-hidden="true" />
          Solo lectura
        </span>
      </div>
    </div>
    <table class="w-full border-collapse text-sm">
      <tbody>
        <tr class="border-b border-border">
          <td class="border-r border-border px-4 py-3">{{ formData.ref_levante_edad ?? '7-18 MESES GANADO LEVANTE' }}</td>
          <td class="px-4 py-3">{{ formData.ref_levante_peso ?? 'PESO MENOR 230 KG' }}</td>
        </tr>
        <tr>
          <td class="border-r border-border px-4 py-3">{{ formData.ref_ceba_edad ?? '19-24/36 MESES GANADO CEBA' }}</td>
          <td class="px-4 py-3">{{ formData.ref_ceba_peso ?? 'PESO 450 A 470 KG' }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
