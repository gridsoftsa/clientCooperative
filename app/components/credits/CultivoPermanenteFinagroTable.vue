<script setup lang="ts">
/**
 * Tabla de referencia FINAGRO: % costos promedio anuales por 1 HA para Santander.
 * Valores editables.
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

const FINAGRO_ROWS = [
  { edad: 'Año 1', keyPct: 'finagro_1_pct', keyKg: 'finagro_1_kg', defaultPct: 100, defaultKg: null as number | null },
  { edad: 'Año 2', keyPct: 'finagro_2_pct', keyKg: 'finagro_2_kg', defaultPct: 100, defaultKg: 400 },
  { edad: 'Año 3', keyPct: 'finagro_3_pct', keyKg: 'finagro_3_kg', defaultPct: 70, defaultKg: 875 },
  { edad: 'Año 4', keyPct: 'finagro_4_pct', keyKg: 'finagro_4_kg', defaultPct: 60, defaultKg: 1050 },
  { edad: 'Año 5 - 17', keyPct: 'finagro_5_17_pct', keyKg: 'finagro_5_17_kg', defaultPct: 45, defaultKg: 1200 },
  { edad: 'Año 18 - 20', keyPct: 'finagro_18_20_pct', keyKg: 'finagro_18_20_kg', defaultPct: 55, defaultKg: 1000 },
] as const
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
        </Button>
      </CollapsibleTrigger>
    </div>
    <CollapsibleContent>
      <div class="overflow-x-auto rounded-b-lg border border-border">
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
              v-for="row in FINAGRO_ROWS"
              :key="row.edad"
              class="bg-background"
            >
              <td class="border border-border px-3 py-2">
                {{ row.edad }}
              </td>
              <td class="border border-border p-1">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  :value="formData[row.keyPct] ?? row.defaultPct"
                  class="h-8 w-full min-w-0 rounded border border-input bg-background px-2 py-1 text-right text-sm tabular-nums"
                  @input="setField(row.keyPct, ($event.target as HTMLInputElement).value === '' ? null : Number(($event.target as HTMLInputElement).value))"
                >
              </td>
              <td class="border border-border p-1">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  :value="formData[row.keyKg] ?? row.defaultKg ?? ''"
                  class="h-8 w-full min-w-0 rounded border border-input bg-background px-2 py-1 text-right text-sm tabular-nums"
                  :placeholder="row.defaultKg == null ? '—' : ''"
                  @input="setField(row.keyKg, ($event.target as HTMLInputElement).value === '' ? null : Number(($event.target as HTMLInputElement).value))"
                >
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </CollapsibleContent>
  </Collapsible>
</template>
