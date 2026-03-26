<script setup lang="ts">
/**
 * Información de referencia para cultivos permanentes por tipo de producto.
 * Plantas x HA y descripción específica del cultivo.
 */
defineProps<{
  editedData: Record<string, unknown>
  editing: boolean
  canEdit: boolean
}>()

const emit = defineEmits<{
  'update:field': [payload: { key: string; value: unknown }]
}>()

function setField(key: string, value: unknown) {
  emit('update:field', { key, value })
}
</script>

<template>
  <div class="space-y-4 rounded-lg border border-border p-4">
    <div class="grid gap-4 sm:grid-cols-2">
      <div class="flex flex-col gap-2">
        <label class="text-xs font-medium">
          Plantas x hectárea
        </label>
        <input
          type="number"
          step="1"
          min="0"
          :value="editedData.plantas_x_ha ?? 1111"
          class="h-9 w-full max-w-[8rem] rounded-md border border-input bg-background px-3 py-1 text-right text-sm tabular-nums"
          :disabled="!editing || !canEdit"
          @input="setField('plantas_x_ha', ($event.target as HTMLInputElement).value === '' ? null : Number(($event.target as HTMLInputElement).value))"
        >
      </div>
      <div class="flex flex-col gap-2">
        <label class="text-xs font-medium">
          Año inicio de producción
        </label>
        <input
          type="number"
          step="1"
          min="1"
          :value="editedData.anio_inicio_produccion ?? ''"
          class="h-9 w-full max-w-[8rem] rounded-md border border-input bg-background px-3 py-1 text-right text-sm tabular-nums"
          :disabled="!editing || !canEdit"
          placeholder="Ej: 2"
          @input="setField('anio_inicio_produccion', ($event.target as HTMLInputElement).value === '' ? null : Number(($event.target as HTMLInputElement).value))"
        >
        <p class="text-xs text-muted-foreground">
          Ej: Café inicia en año 2
        </p>
      </div>
      <div class="flex flex-col gap-2">
        <label class="text-xs font-medium">
          Duración producción (meses)
        </label>
        <input
          type="number"
          step="1"
          min="1"
          :value="editedData.duracion_meses ?? 12"
          class="h-9 w-full max-w-[8rem] rounded-md border border-input bg-background px-3 py-1 text-right text-sm tabular-nums"
          :disabled="!editing || !canEdit"
          @input="setField('duracion_meses', ($event.target as HTMLInputElement).value === '' ? null : Number(($event.target as HTMLInputElement).value))"
        >
        <p class="text-xs text-muted-foreground">
          Valor en radicación — sección Producción (meses); default 12.
        </p>
      </div>
    </div>
    <div class="flex flex-col gap-2">
      <label class="text-xs font-medium">
        Información de referencia
      </label>
      <textarea
        :value="editedData.descripcion ?? '3 primeros años son pérdidas'"
        rows="3"
        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        :disabled="!editing || !canEdit"
        placeholder="Ej: 3 primeros años son pérdidas. Cacao requiere sombrío inicial..."
        @input="setField('descripcion', ($event.target as HTMLTextAreaElement).value)"
      />
      <p class="text-xs text-muted-foreground">
        Texto específico por tipo de producto (Cacao, Café, etc.)
      </p>
    </div>
  </div>
</template>
