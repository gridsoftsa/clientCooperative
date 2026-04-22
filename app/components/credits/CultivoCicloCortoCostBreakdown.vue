<script setup lang="ts">
/**
 * Discriminación de costos para cultivos de ciclo corto (radicación).
 * Solo lectura: los datos vienen de la configuración (config_data.ciclo_corto_cost_breakdown).
 * Fórmula Valor: valor de los costos × porcentaje de la fila en la tabla de discriminación.
 * (costos = cultivo_ciclo_corto_costos = ventas × pct_costos_kg)
 */
import type { CicloCortoCostRow } from '~/constants/cultivo-ciclo-corto-cost-breakdown'
import {
  CICLO_CORTO_COST_BREAKDOWN_DEFAULT,
  CICLO_CORTO_COST_BREAKDOWN_KEY,
} from '~/constants/cultivo-ciclo-corto-cost-breakdown'
import { computeFormula } from '~/constants/credits-financial-templates'
import { formatDecimalDisplay } from '~/composables/usePesosFormat'

const props = defineProps<{
  formData: Record<string, unknown>
}>()

const formData = toRef(props, 'formData')

const rows = computed((): CicloCortoCostRow[] => {
  const data = formData.value
  const arr = (data[CICLO_CORTO_COST_BREAKDOWN_KEY] ?? []) as CicloCortoCostRow[]
  if (!Array.isArray(arr) || arr.length === 0) return CICLO_CORTO_COST_BREAKDOWN_DEFAULT
  return arr.map(r => ({
    section: (r.section === 'MANO DE OBRA' || r.section === 'INSUMOS' ? r.section : 'MANO DE OBRA'),
    label: String(r.label ?? ''),
    pct: Number.isFinite(r.pct) ? r.pct : 0,
  }))
})

/** Valor = valor de los costos × (porcentaje de la fila / 100) */
function valorTotal(costos: number, pctParticipacion: number): number {
  const c = Number.isFinite(costos) ? costos : 0
  const pct = Number.isFinite(pctParticipacion) ? pctParticipacion : 0
  return (c * pct) / 100
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

const costosTotales = computed(() => computeFormula('cultivo_ciclo_corto_costos', formData.value) ?? 0)

/** Valor por fila (usa costosTotales.value en contexto script para reactividad correcta) */
function valorParaFila(row: CicloCortoCostRow): number {
  return valorTotal(costosTotales.value, row.pct)
}

function totalPct(): number {
  return rows.value.reduce((acc, r) => acc + r.pct, 0)
}

function totalValor(): number {
  return rows.value.reduce((acc, r) => acc + valorTotal(costosTotales.value, r.pct), 0)
}

function subtotalPct(section: string): number {
  return rows.value.filter(r => r.section === section).reduce((acc, r) => acc + r.pct, 0)
}

function subtotalValor(section: string): number {
  return rows.value
    .filter(r => r.section === section)
    .reduce((acc, r) => acc + valorTotal(costosTotales.value, r.pct), 0)
}

/** Filas agrupadas por sección */
const groupedRows = computed(() => {
  const manoDeObra = rows.value.filter(r => r.section === 'MANO DE OBRA')
  const insumos = rows.value.filter(r => r.section === 'INSUMOS')
  return { manoDeObra, insumos }
})

function rowClass(section: string): string {
  return section === 'MANO DE OBRA' ? 'bg-emerald-50/50 dark:bg-emerald-950/10' : 'bg-orange-50/50 dark:bg-orange-950/10'
}

function headerClass(section: string): string {
  return section === 'MANO DE OBRA' ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-orange-100 dark:bg-orange-900/30'
}
</script>

<template>
  <Collapsible :default-open="true" class="group/cost">
    <div class="flex items-center justify-between rounded-t-lg border border-border border-b-0 bg-muted/50 px-4 py-2">
      <h4 class="text-sm font-semibold">
        Discriminación de costos
      </h4>
      <CollapsibleTrigger as-child>
        <Button variant="ghost" size="icon" class="h-8 w-8">
          <Icon
            name="i-lucide-chevron-down"
            class="h-4 w-4 transition-transform duration-200 group-data-[state=open]/cost:rotate-180"
          />
          <span class="sr-only">Expandir o contraer desglose de costos</span>
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
                Concepto
              </th>
              <th class="border border-border px-3 py-2 text-right font-semibold">
                Valor
              </th>
              <th class="border border-border px-2 py-2 text-right font-semibold text-muted-foreground">
                % Part.
              </th>
            </tr>
          </thead>
          <tbody>
            <!-- MANO DE OBRA -->
            <template v-if="groupedRows.manoDeObra.length > 0">
              <tr :class="headerClass('MANO DE OBRA')">
                <td class="border border-border px-3 py-1.5 font-semibold">
                  MANO DE OBRA
                </td>
                <td class="border border-border px-3 py-1.5 text-right tabular-nums font-bold">
                  {{ formatMoney(subtotalValor('MANO DE OBRA')) }}
                </td>
                <td class="border border-border px-2 py-1.5 text-right tabular-nums font-bold">
                  {{ subtotalPct('MANO DE OBRA').toFixed(2) }}%
                </td>
              </tr>
              <tr
                v-for="(row, idx) in groupedRows.manoDeObra"
                :key="`mo-${idx}`"
                :class="rowClass('MANO DE OBRA')"
              >
                <td class="border border-border pl-6 pr-3 py-1.5">
                  {{ row.label || row.section }}
                </td>
                <td class="border border-border px-3 py-1.5 text-right tabular-nums">
                  {{ formatMoney(valorParaFila(row)) }}
                </td>
                <td class="border border-border px-2 py-1 text-right tabular-nums bg-muted/30">
                  {{ formatDecimalDisplay(row.pct) }}%
                </td>
              </tr>
            </template>
            <!-- INSUMOS -->
            <template v-if="groupedRows.insumos.length > 0">
              <tr :class="headerClass('INSUMOS')">
                <td class="border border-border px-3 py-1.5 font-semibold">
                  INSUMOS
                </td>
                <td class="border border-border px-3 py-1.5 text-right tabular-nums font-bold">
                  {{ formatMoney(subtotalValor('INSUMOS')) }}
                </td>
                <td class="border border-border px-2 py-1.5 text-right tabular-nums font-bold">
                  {{ subtotalPct('INSUMOS').toFixed(2) }}%
                </td>
              </tr>
              <tr
                v-for="(row, idx) in groupedRows.insumos"
                :key="`in-${idx}`"
                :class="rowClass('INSUMOS')"
              >
                <td class="border border-border pl-6 pr-3 py-1.5">
                  {{ row.label || row.section }}
                </td>
                <td class="border border-border px-3 py-1.5 text-right tabular-nums">
                  {{ formatMoney(valorParaFila(row)) }}
                </td>
                <td class="border border-border px-2 py-1 text-right tabular-nums bg-muted/30">
                  {{ formatDecimalDisplay(row.pct) }}%
                </td>
              </tr>
            </template>
            <tr class="bg-emerald-200 dark:bg-emerald-900/60 font-bold">
              <td class="border border-border px-3 py-2">
                TOTAL
              </td>
              <td class="border border-border px-3 py-2 text-right tabular-nums">
                {{ formatMoney(totalValor()) }}
              </td>
              <td class="border border-border px-3 py-2 text-right tabular-nums">
                {{ totalPct().toFixed(2) }}%
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </CollapsibleContent>
  </Collapsible>
</template>
