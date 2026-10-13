<script setup lang="ts">
import { Button } from '~/components/ui/button'

/**
 * Resumen solo lectura: solvencia, endeudamiento, activos, pasivos, bien raíz.
 * Misma lógica que el detalle de radicación (`/radicacion/[id]`) a partir de `financial_info` y monto solicitado.
 */
const props = withDefaults(
  defineProps<{
    /** Objeto o JSON en string; se normaliza como en el detalle de radicación. */
    financialInfo?: unknown
    amountRequested: number
    /** Fragmento del título tras «Resumen financiero » (ej. «del deudor», «del codeudor»). */
    summaryScopeLabel?: string
    /**
     * Si true, las cifras reflejan ajustes del analista en la hoja de análisis (no la radicación).
     * Solo debe usarse desde `/radicacion/analisis-score`.
     */
    analysisAdjusted?: boolean
    /**
     * Datos de la entrevista (módulo financiero) cuando la tarjeta muestra cifras ajustadas.
     * De aquí salen ingresos totales, descripción de ingresos y nombres de activos.
     */
    interviewFinancialInfo?: unknown
  }>(),
  { summaryScopeLabel: 'del deudor', analysisAdjusted: false, interviewFinancialInfo: undefined },
)

const { formatPesosConSimbolo } = usePesosFormat()

function parseFinancialInfo(val: unknown): Record<string, any> | null {
  if (val == null) {
    return null
  }
  if (typeof val === 'object' && !Array.isArray(val)) {
    return val as Record<string, any>
  }
  if (typeof val === 'string' && val.trim()) {
    try {
      const p = JSON.parse(val)
      return typeof p === 'object' && p !== null && !Array.isArray(p) ? p as Record<string, any> : null
    }
    catch {
      return null
    }
  }
  return null
}

const fi = computed(() => parseFinancialInfo(props.financialInfo))
const interviewFi = computed(() => parseFinancialInfo(props.interviewFinancialInfo) ?? fi.value)

const solvenciaPercentage = computed(() => {
  const f = fi.value
  if (!f) return null
  const sol = f?.solvency ?? {}
  const assetsArr = f?.assets ?? []
  const activos = Array.isArray(assetsArr)
    ? assetsArr.reduce((s: number, a: { value?: number }) => s + (a?.value ?? 0), 0)
    : 0
  const pasivos = sol?.liabilities ?? 0
  const monto = Number(props.amountRequested) || 0
  if (!activos || activos <= 0 || !monto) return null
  return Math.round(((pasivos + monto) / activos) * 100 * 100) / 100
})

const endeudamientoPercentage = computed(() => {
  const f = fi.value
  if (!f) return null
  const sol = f?.solvency ?? {}
  const bienRaiz = sol?.real_estate ?? 0
  const pasivos = sol?.liabilities ?? 0
  const monto = Number(props.amountRequested) || 0
  if (!bienRaiz || bienRaiz <= 0 || !monto) return null
  return Math.round(((pasivos + monto) / bienRaiz) * 100 * 100) / 100
})

/** Menor % = mejor */
function solvenciaColorClass(pct: number | null): string {
  if (pct == null) return 'bg-muted text-muted-foreground'
  if (pct < 50) return 'bg-green-600/20 text-green-700 dark:text-green-400 border-green-600/40'
  if (pct < 100) return 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/40'
  return 'bg-destructive/20 text-destructive border-destructive/40'
}

function finiteAmount(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : 0
}

const incomeDescription = computed(() => {
  const raw = interviewFi.value?.income?.description
  return typeof raw === 'string' && raw.trim() !== '' ? raw : ''
})

/** Total de la entrevista: salario + pensión + negocio + arriendos + otros. */
const incomeTotal = computed(() => {
  const inc = interviewFi.value?.income
  if (!inc || typeof inc !== 'object') {
    return 0
  }
  const row = inc as Record<string, unknown>
  return finiteAmount(row.salary)
    + finiteAmount(row.pension)
    + finiteAmount(row.business ?? row.crops)
    + finiteAmount(row.rental)
    + finiteAmount(row.other)
})

/** Nombres que el asesor escribe en datos financieros, módulo de activos reportados. */
const reportedAssets = computed(() => {
  const assets = interviewFi.value?.assets
  if (!Array.isArray(assets)) {
    return []
  }
  return assets.flatMap((row) => {
    if (!row || typeof row !== 'object') {
      return []
    }
    const item = row as { name?: unknown, description?: unknown, value?: unknown }
    const name = typeof item.name === 'string' && item.name.trim() !== ''
      ? item.name.trim()
      : (typeof item.description === 'string' ? item.description.trim() : '')
    const value = finiteAmount(item.value)
    if (name === '' && value <= 0) {
      return []
    }
    return [{ name: name || 'Sin nombre', value }]
  })
})

const showIncomeDetails = computed(
  () => incomeDescription.value !== '' || incomeTotal.value > 0 || reportedAssets.value.length > 0,
)

const expensesDescription = computed(() => {
  const raw = fi.value?.expenses?.description
  return typeof raw === 'string' && raw.trim() !== '' ? raw : ''
})

const incomeExpanded = ref(false)
const expensesExpanded = ref(false)

watch(incomeDescription, () => {
  incomeExpanded.value = false
})
watch(expensesDescription, () => {
  expensesExpanded.value = false
})

const montoActivos = computed(() => {
  const f = fi.value
  if (!f) return 0
  const assets = f?.assets ?? []
  const fromList = Array.isArray(assets)
    ? assets.reduce((s: number, a: { value?: number }) => s + (a?.value ?? 0), 0)
    : 0
  if (fromList > 0) {
    return fromList
  }
  const sol = (f as { solvency?: { assets?: number } }).solvency
  return sol?.assets ?? 0
})
</script>

<template>
  <div class="rounded-xl border-2 border-primary/30 bg-primary/5 p-4">
    <p class="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      Resumen financiero {{ summaryScopeLabel }}
    </p>
    <p
      v-if="analysisAdjusted"
      class="mb-3 rounded-md border border-primary/35 bg-primary/[0.07] px-3 py-2 text-xs text-foreground dark:bg-primary/[0.12]"
      role="note"
    >
      Indicadores calculados con los <strong class="font-semibold">activos</strong> y la
      <strong class="font-semibold">consulta central de riesgos</strong> diligenciados en el análisis.
      Los datos de la radicación no se modifican.
    </p>
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <div class="space-y-1">
        <p class="text-sm font-bold uppercase">
          Solvencia
        </p>
        <div
          class="flex h-10 w-full items-center rounded-md border px-3 py-2 text-base font-semibold"
          :class="solvenciaColorClass(solvenciaPercentage)"
        >
          {{ solvenciaPercentage != null ? `${solvenciaPercentage.toFixed(2)} %` : '—' }}
        </div>
        <p class="text-[10px] text-muted-foreground">
          (Pasivos + monto solicitado) ÷ Activos
        </p>
      </div>
      <div class="space-y-1">
        <p class="text-sm font-bold uppercase">
          Endeudamiento
        </p>
        <div
          class="flex h-10 w-full items-center rounded-md border px-3 py-2 text-base font-semibold"
          :class="solvenciaColorClass(endeudamientoPercentage)"
        >
          {{ endeudamientoPercentage != null ? `${endeudamientoPercentage.toFixed(2)} %` : '—' }}
        </div>
        <p class="text-[10px] text-muted-foreground">
          (Pasivos + monto solicitado) ÷ Bien raíz
        </p>
      </div>
      <div class="space-y-1">
        <p class="text-sm font-bold uppercase">
          Activos
        </p>
        <p class="flex h-10 w-full items-center rounded-md border bg-muted/50 px-3 py-2 font-semibold">
          {{ formatPesosConSimbolo(montoActivos) }}
        </p>
      </div>
      <div class="space-y-1">
        <p class="text-sm font-bold uppercase">
          Pasivos
        </p>
        <p class="flex h-10 w-full items-center rounded-md border bg-muted/50 px-3 py-2 font-semibold">
          {{ formatPesosConSimbolo(fi?.solvency?.liabilities) }}
        </p>
      </div>
      <div class="space-y-1">
        <p class="text-sm font-bold uppercase">
          Bien raíz
        </p>
        <p class="flex h-10 w-full items-center rounded-md border bg-muted/50 px-3 py-2 font-semibold">
          {{ formatPesosConSimbolo(fi?.solvency?.real_estate) }}
        </p>
      </div>
    </div>
    <div
      v-if="showIncomeDetails || expensesDescription"
      class="mt-4 grid gap-3"
      :class="showIncomeDetails && expensesDescription ? 'sm:grid-cols-2' : ''"
    >
      <div v-if="showIncomeDetails" class="space-y-1">
        <div class="flex items-center justify-between gap-2">
          <p class="text-sm font-bold uppercase">
            Descripción ingresos
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            class="h-8 shrink-0"
            :aria-expanded="incomeExpanded"
            @click="incomeExpanded = !incomeExpanded"
          >
            {{ incomeExpanded ? 'Ocultar' : 'Ver más' }}
          </Button>
        </div>
        <div
          v-if="incomeExpanded"
          class="space-y-3 rounded-md border bg-muted/50 px-3 py-2 text-sm"
        >
          <div class="space-y-0.5">
            <p class="text-xs font-semibold uppercase text-muted-foreground">
              Ingresos totales
            </p>
            <p class="font-semibold">
              {{ formatPesosConSimbolo(incomeTotal) }}
            </p>
          </div>
          <div class="space-y-0.5">
            <p class="text-xs font-semibold uppercase text-muted-foreground">
              Descripción de ingresos
            </p>
            <p class="whitespace-pre-wrap">
              {{ incomeDescription || '—' }}
            </p>
          </div>
          <div class="space-y-1">
            <p class="text-xs font-semibold uppercase text-muted-foreground">
              Activos reportados
            </p>
            <ul v-if="reportedAssets.length" class="space-y-1">
              <li
                v-for="(asset, index) in reportedAssets"
                :key="`${asset.name}-${index}`"
                class="flex items-start justify-between gap-3"
              >
                <span class="min-w-0 whitespace-pre-wrap">{{ asset.name }}</span>
                <span class="shrink-0 font-medium">{{ formatPesosConSimbolo(asset.value) }}</span>
              </li>
            </ul>
            <p v-else>
              —
            </p>
          </div>
        </div>
      </div>
      <div v-if="expensesDescription" class="space-y-1">
        <div class="flex items-center justify-between gap-2">
          <p class="text-sm font-bold uppercase">
            Descripción gastos
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            class="h-8 shrink-0"
            :aria-expanded="expensesExpanded"
            @click="expensesExpanded = !expensesExpanded"
          >
            {{ expensesExpanded ? 'Ocultar' : 'Ver más' }}
          </Button>
        </div>
        <p
          v-if="expensesExpanded"
          class="whitespace-pre-wrap rounded-md border bg-muted/50 px-3 py-2 text-sm"
        >
          {{ expensesDescription }}
        </p>
      </div>
    </div>
  </div>
</template>
