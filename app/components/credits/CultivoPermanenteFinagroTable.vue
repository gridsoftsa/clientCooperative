<script setup lang="ts">
/**
 * Tabla de referencia FINAGRO: % costos promedio anuales por 1 HA para Santander.
 * Renderiza dinámicamente desde finagro_ranges (según producto: Cacao, Café, etc.).
 * Solo lectura: los datos vienen de la configuración de la plantilla.
 */
import { formatDecimalDisplay } from '~/composables/usePesosFormat'

interface FinagroRange {
  edad_min: number
  edad_max: number
  label?: string
  pct_costos: number
  kg_hectarea: number | null
}

const props = defineProps<{
  formData: Record<string, unknown>
}>()

/** Rangos desde formData.finagro_ranges (viene del API por producto). */
const ranges = computed(() => {
  const arr = (props.formData.finagro_ranges ?? []) as FinagroRange[]
  if (!Array.isArray(arr) || arr.length === 0) return []
  return arr
})

function formatLabel(row: FinagroRange): string {
  if (row.label) return row.label
  const min = row.edad_min ?? 1
  const max = row.edad_max ?? 1
  return min === max ? `Año ${min}` : `Año ${min} - ${max}`
}
</script>

<template>
  <Collapsible :default-open="false" class="group/finagro">
    <div class="flex items-center justify-between rounded-t-lg border border-border border-b-0 bg-muted/50 px-4 py-2">
      <h4 class="text-sm font-semibold">
        % Costos promedio anuales por 1 HA – Informes FINAGRO para Santander
      </h4>
      <CollapsibleTrigger as-child>
        <Button variant="ghost" size="icon" class="h-8 w-8">
          <Icon
            name="i-lucide-chevron-down"
            class="h-4 w-4 transition-transform duration-200 group-data-[state=open]/finagro:rotate-180"
          />
          <span class="sr-only">Expandir o contraer tabla FINAGRO</span>
        </Button>
      </CollapsibleTrigger>
    </div>
    <CollapsibleContent>
      <div v-if="ranges.length === 0" class="rounded-b-lg border border-border p-6 text-center text-sm text-muted-foreground">
        Selecciona el tipo de producto (Cacao, Café, etc.) para cargar la tabla de referencia.
      </div>
      <div v-else class="overflow-x-auto rounded-b-lg border border-border">
        <table class="w-full min-w-[280px] border-collapse text-sm">
          <thead>
            <tr class="bg-muted">
              <th class="border border-border px-3 py-2 text-left font-semibold">
                Edad del cultivo
              </th>
              <th class="border border-border px-3 py-2 text-right font-semibold">
                % Costo x HA
              </th>
              <th class="border border-border px-3 py-2 text-right font-semibold">
                Productividad en kg/ha
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, idx) in ranges"
              :key="`${row.edad_min}-${row.edad_max}-${idx}`"
              class="bg-background"
            >
              <td class="border border-border px-3 py-2">
                {{ formatLabel(row) }}
              </td>
              <td class="border border-border px-3 py-2 text-right tabular-nums bg-muted/30">
                {{ formatDecimalDisplay(row.pct_costos as number) }}%
              </td>
              <td class="border border-border px-3 py-2 text-right tabular-nums bg-muted/30">
                {{ row.kg_hectarea != null ? formatDecimalDisplay(row.kg_hectarea as number) : '—' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </CollapsibleContent>
  </Collapsible>
</template>
