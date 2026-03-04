<script setup lang="ts">
/**
 * Desglose de costos SIPSA para aves ponedoras (pequeño productor Santander).
 * Fórmula Valor Total: Costos mensuales × (% participación ÷ 100)
 * Se muestra en un Collapsible para no ocupar espacio si no es necesario.
 */
import { computeFormula } from '~/constants/credits-financial-templates'

defineProps<{
  formData: Record<string, unknown>
}>()

const emit = defineEmits<{
  'update:field': [payload: { key: string; value: unknown }]
}>()

function setField(key: string, value: unknown) {
  emit('update:field', { key, value })
}

/** Porcentajes SIPSA pequeño productor Santander (editables) */
interface CostItem {
  key: string
  label: string
  pct: number
  meta?: string
}
interface CostGroup {
  section: string
  headerClass: string
  items: CostItem[]
}
const COST_BREAKDOWN: CostGroup[] = [
  {
    section: 'Costos directos',
    headerClass: 'bg-emerald-100 dark:bg-emerald-900/30',
    items: [
      { key: 'cost_pct_pollita', label: 'Pollita de 1 día', pct: 2.8 },
      { key: 'cost_pct_instalacion', label: 'Instalación de galpones', pct: 0.8 },
      { key: 'cost_pct_desinfeccion', label: 'Desinfección de galpones', pct: 0.2 },
      { key: 'cost_pct_materiales_cama', label: 'Materiales Cama', meta: 'Viruta, tamos, cascarilla', pct: 0.4 },
      { key: 'cost_pct_calefaccion', label: 'Calefacción Galpones', pct: 0.2 },
    ],
  },
  {
    section: 'Fase de Levante',
    headerClass: 'bg-slate-200 dark:bg-slate-700',
    items: [
      { key: 'cost_pct_levante_nutricion', label: 'Nutrición', pct: 9.38 },
      { key: 'cost_pct_levante_sanidad', label: 'Sanidad', pct: 1.7 },
      { key: 'cost_pct_levante_vacunas', label: 'Vacunas', pct: 0.4 },
      { key: 'cost_pct_levante_medicamento', label: 'Medicamento', pct: 0.02 },
      { key: 'cost_pct_levante_otros', label: 'Otros Insumos', pct: 1.0 },
    ],
  },
  {
    section: 'Fase de Producción',
    headerClass: 'bg-orange-100 dark:bg-orange-900/30',
    items: [
      { key: 'cost_pct_prod_nutricion', label: 'Nutrición', pct: 70.73 },
      { key: 'cost_pct_prod_sanidad', label: 'Sanidad', pct: 0.3 },
      { key: 'cost_pct_prod_vacunas', label: 'Vacunas', pct: 0.1 },
      { key: 'cost_pct_prod_medicamento', label: 'Medicamento', pct: 0.07 },
      { key: 'cost_pct_prod_otros', label: 'Otros Insumos', pct: 0.2 },
    ],
  },
  {
    section: 'Mano de Obra',
    headerClass: 'bg-blue-100 dark:bg-blue-900/30',
    items: [
      { key: 'cost_pct_mano_directa', label: 'Directa', pct: 4.7 },
      { key: 'cost_pct_mano_ocasional', label: 'Ocasional (Jornales)', pct: 0.3 },
    ],
  },
  {
    section: 'Costos Indirectos',
    headerClass: 'bg-yellow-100 dark:bg-yellow-900/30',
    items: [
      { key: 'cost_pct_ind_asistencia', label: 'Asistencia Técnica', pct: 0.3 },
      { key: 'cost_pct_ind_cartones', label: 'Cartones para huevo', pct: 1.3 },
      { key: 'cost_pct_ind_otros', label: 'Otros Costos', pct: 0.1 },
      { key: 'cost_pct_ind_transporte', label: 'Transporte', pct: 2.3 },
      { key: 'cost_pct_ind_imprevistos', label: 'Imprevistos', pct: 2.5 },
    ],
  },
]

const MORTALITY_KEY = 'cost_pct_ajuste_mortalidad'
const MORTALITY_PCT = 1.0

/** Valor Total = costos_mensuales × (pct_participacion / 100) */
function valorTotal(costosMensuales: number, pctParticipacion: number): number {
  const costos = Number.isFinite(costosMensuales) ? costosMensuales : 0
  const pct = Number.isFinite(pctParticipacion) ? pctParticipacion : 0
  return (costos * pct) / 100
}

function formatMoney(value: number): string {
  if (value == null || !Number.isFinite(value)) return '$ -'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function safePct(val: unknown, defaultPct: number): number {
  const n = Number(val)
  return Number.isFinite(n) ? n : defaultPct
}
</script>

<template>
  <Collapsible :default-open="false" class="group/cost">
    <div class="flex items-center justify-between rounded-t-lg border border-border border-b-0 bg-muted/50 px-4 py-2">
      <h4 class="text-sm font-semibold">
        Desglose de costos (SIPSA pequeño productor Santander)
      </h4>
      <CollapsibleTrigger as-child>
        <Button variant="ghost" size="icon" class="h-8 w-8">
          <Icon
            name="i-lucide-chevron-down"
            class="h-4 w-4 transition-transform duration-200 group-data-[state=open]/cost:rotate-180"
          />
        </Button>
      </CollapsibleTrigger>
    </div>
    <CollapsibleContent>
      <div class="overflow-x-auto rounded-b-lg border border-border">
        <table class="w-full min-w-[380px] table-fixed border-collapse text-sm">
          <colgroup>
            <col>
            <col>
            <col style="width: 5rem">
          </colgroup>
          <thead>
            <tr>
              <th class="border border-border px-3 py-2 text-left font-semibold">
                Costos
              </th>
              <th class="border border-border px-3 py-2 text-right font-semibold">
                Valor Total
              </th>
              <th class="border border-border px-2 py-2 text-right font-semibold text-muted-foreground">
                % Part.
              </th>
            </tr>
          </thead>
          <tbody>
            <template v-for="group in COST_BREAKDOWN" :key="group.section">
              <tr :class="group.headerClass">
                <td class="border border-border px-3 py-1.5 font-semibold">
                  {{ group.section }}
                </td>
                <td colspan="2" class="border border-border" />
              </tr>
              <tr
                v-for="item in group.items"
                :key="`${group.section}-${item.label}`"
                class="bg-emerald-50/50 dark:bg-emerald-950/10"
              >
                <td class="border border-border pl-6 pr-3 py-1.5">
                  {{ item.label }}
                  <span
                    v-if="item.meta"
                    class="ml-1 text-xs text-muted-foreground"
                  >
                    ({{ item.meta }})
                  </span>
                </td>
                <td class="border border-border px-3 py-1.5 text-right tabular-nums">
                  {{ formatMoney(valorTotal(computeFormula('aves_ponedoras_costos', formData) ?? 0, safePct(formData[item.key], item.pct))) }}
                </td>
                <td class="border border-border p-1">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    :value="formData[item.key] ?? item.pct"
                    class="h-8 w-full min-w-0 rounded border border-input bg-background px-2 py-1 text-right text-sm tabular-nums"
                    @input="setField(item.key, ($event.target as HTMLInputElement).value === '' ? null : Number(($event.target as HTMLInputElement).value))"
                  >
                </td>
              </tr>
            </template>
            <tr class="bg-emerald-100 dark:bg-emerald-900/40">
              <td class="border border-border px-3 py-2 font-semibold">
                Ajuste de mortalidad
              </td>
              <td class="border border-border px-3 py-2 text-right tabular-nums">
                {{ formatMoney(valorTotal(computeFormula('aves_ponedoras_costos', formData) ?? 0, safePct(formData[MORTALITY_KEY], MORTALITY_PCT))) }}
              </td>
              <td class="border border-border p-1">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  :value="formData[MORTALITY_KEY] ?? MORTALITY_PCT"
                  class="h-8 w-full min-w-0 rounded border border-input bg-background px-2 py-1 text-right text-sm tabular-nums"
                  @input="setField(MORTALITY_KEY, ($event.target as HTMLInputElement).value === '' ? null : Number(($event.target as HTMLInputElement).value))"
                >
              </td>
            </tr>
            <tr class="bg-emerald-200 dark:bg-emerald-900/60 font-bold">
              <td class="border border-border px-3 py-2">
                TOTAL
              </td>
              <td class="border border-border px-3 py-2 text-right tabular-nums">
                {{ formatMoney(computeFormula('aves_ponedoras_costos', formData) ?? 0) }}
              </td>
              <td class="border border-border px-3 py-2 text-right tabular-nums">
                100.00%
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </CollapsibleContent>
  </Collapsible>
</template>
