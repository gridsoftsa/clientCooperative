<script setup lang="ts">
/**
 * Desglose de costos SIPSA para aves ponedoras (pequeño productor Santander).
 * Fórmula Valor Total: Costos mensuales × (% participación ÷ 100)
 * Se muestra en un Collapsible para no ocupar espacio si no es necesario.
 */
import { computeFormula } from '~/constants/credits-financial-templates'
import {
  AVES_COST_BREAKDOWN,
  AVES_MORTALITY_KEY,
  AVES_MORTALITY_PCT,
  getAvesCostBreakdownFieldKeys,
} from '~/constants/aves-cost-breakdown'
import { formatDecimalDisplay, parseDecimalInput, onKeydownPesosOnly } from '~/composables/usePesosFormat'

const { formData } = defineProps<{
  formData: Record<string, unknown>
}>()

const emit = defineEmits<{
  'update:field': [payload: { key: string; value: unknown }]
}>()

const ALL_PCT_KEYS = getAvesCostBreakdownFieldKeys()

function setField(key: string, value: unknown) {
  let finalValue = value
  if (value != null && typeof value === 'number' && Number.isFinite(value)) {
    const sumOthers = ALL_PCT_KEYS.filter(k => k !== key).reduce(
      (acc, k) => acc + safePct(formData[k], getDefaultPct(k)),
      0,
    )
    const maxAllowed = Math.max(0, 100 - sumOthers)
    finalValue = Math.min(value, maxAllowed)
  }
  emit('update:field', { key, value: finalValue })
}

function getDefaultPct(key: string): number {
  if (key === AVES_MORTALITY_KEY) return AVES_MORTALITY_PCT
  for (const g of AVES_COST_BREAKDOWN) {
    const item = g.items.find(i => i.key === key)
    if (item) return item.pct
  }
  return 0
}

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

function groupPctSum(group: { items: { key: string; pct: number }[] }): number {
  return group.items.reduce((acc, item) => acc + safePct(formData[item.key], item.pct), 0)
}

function groupValorTotal(group: { items: { key: string; pct: number }[] }): number {
  const costos = computeFormula('aves_ponedoras_costos', formData) ?? 0
  return group.items.reduce(
    (acc, item) => acc + valorTotal(costos, safePct(formData[item.key], item.pct)),
    0,
  )
}

function totalPctSum(): number {
  return ALL_PCT_KEYS.reduce((acc, k) => acc + safePct(formData[k], getDefaultPct(k)), 0)
}

function totalValorSum(): number {
  const costos = computeFormula('aves_ponedoras_costos', formData) ?? 0
  return ALL_PCT_KEYS.reduce(
    (acc, k) => acc + valorTotal(costos, safePct(formData[k], getDefaultPct(k))),
    0,
  )
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
            <template v-for="group in AVES_COST_BREAKDOWN" :key="group.section">
              <!-- Grupo con un solo ítem: fila única con color (ej. Pollita de 1 día) -->
              <tr
                v-if="group.items.length === 1"
                :key="`${group.section}-single`"
                :class="group.headerClass"
              >
                <td class="border border-border px-3 py-2 font-semibold">
                  {{ group.items[0]!.label }}
                </td>
                <td class="border border-border px-3 py-2 text-right tabular-nums">
                  {{ formatMoney(valorTotal(computeFormula('aves_ponedoras_costos', formData) ?? 0, safePct(formData[group.items[0]!.key], group.items[0]!.pct))) }}
                </td>
                <td class="border border-border p-1">
                  <input
                    type="text"
                    inputmode="decimal"
                    :value="formatDecimalDisplay((formData[group.items[0]!.key] ?? group.items[0]!.pct) as number)"
                    class="h-8 w-full min-w-0 rounded border border-input bg-background px-2 py-1 text-right text-sm tabular-nums"
                    @input="(e) => setField(group.items[0]!.key, parseDecimalInput((e.target as HTMLInputElement).value))"
                    @keydown="onKeydownPesosOnly"
                  >
                </td>
              </tr>
              <!-- Grupo con varios ítems: encabezado + filas (ej. Instalación, Fase de Levante) -->
              <template v-else>
                <tr :class="group.headerClass">
                  <td class="border border-border px-3 py-1.5 font-semibold">
                    {{ group.section }}
                  </td>
                  <td class="border border-border px-3 py-1.5 text-right tabular-nums font-bold">
                    {{ formatMoney(groupValorTotal(group)) }}
                  </td>
                  <td class="border border-border px-3 py-1.5 text-right tabular-nums font-bold">
                    {{ groupPctSum(group).toFixed(2) }}%
                  </td>
                </tr>
                <tr
                  v-for="item in group.items"
                  :key="`${group.section}-${item.key}`"
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
                      type="text"
                      inputmode="decimal"
                      :value="formatDecimalDisplay((formData[item.key] ?? item.pct) as number)"
                      class="h-8 w-full min-w-0 rounded border border-input bg-background px-2 py-1 text-right text-sm tabular-nums"
                      @input="(e) => setField(item.key, parseDecimalInput((e.target as HTMLInputElement).value))"
                      @keydown="onKeydownPesosOnly"
                    >
                  </td>
                </tr>
              </template>
            </template>
            <tr class="bg-emerald-100 dark:bg-emerald-900/40">
              <td class="border border-border px-3 py-2 font-semibold">
                Ajuste de mortalidad
              </td>
              <td class="border border-border px-3 py-2 text-right tabular-nums">
                {{ formatMoney(valorTotal(computeFormula('aves_ponedoras_costos', formData) ?? 0, safePct(formData[AVES_MORTALITY_KEY], AVES_MORTALITY_PCT))) }}
              </td>
              <td class="border border-border p-1">
                <input
                  type="text"
                  inputmode="decimal"
                  :value="formatDecimalDisplay((formData[AVES_MORTALITY_KEY] ?? AVES_MORTALITY_PCT) as number)"
                  class="h-8 w-full min-w-0 rounded border border-input bg-background px-2 py-1 text-right text-sm tabular-nums"
                  @input="(e) => setField(AVES_MORTALITY_KEY, parseDecimalInput((e.target as HTMLInputElement).value))"
                  @keydown="onKeydownPesosOnly"
                >
              </td>
            </tr>
            <tr class="bg-emerald-200 dark:bg-emerald-900/60 font-bold">
              <td class="border border-border px-3 py-2">
                TOTAL
              </td>
              <td class="border border-border px-3 py-2 text-right tabular-nums">
                {{ formatMoney(totalValorSum()) }}
              </td>
              <td class="border border-border px-3 py-2 text-right tabular-nums">
                {{ Math.min(totalPctSum(), 100).toFixed(2) }}%
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </CollapsibleContent>
  </Collapsible>
</template>
