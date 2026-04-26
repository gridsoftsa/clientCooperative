<script setup lang="ts">
/**
 * Resumen solo lectura: solvencia, endeudamiento, activos, pasivos, bien raíz.
 * Misma lógica que el detalle de radicación (`/radicacion/[id]`) a partir de `financial_info` y monto solicitado.
 */
const props = defineProps<{
  /** Objeto o JSON en string; se normaliza como en el detalle de radicación. */
  financialInfo?: unknown
  amountRequested: number
}>()

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

const montoActivos = computed(() => {
  const f = fi.value
  if (!f) return 0
  const sol = (f as { solvency?: { assets?: number } }).solvency
  const assets = f?.assets ?? []
  const fromList = Array.isArray(assets)
    ? assets.reduce((s: number, a: { value?: number }) => s + (a?.value ?? 0), 0)
    : 0
  return sol?.assets ?? fromList
})
</script>

<template>
  <div class="rounded-xl border-2 border-primary/30 bg-primary/5 p-4">
    <p class="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      Resumen financiero del deudor
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
  </div>
</template>
