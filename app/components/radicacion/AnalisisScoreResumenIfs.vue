<script setup lang="ts">
import { computed } from 'vue'
import {
  classifyPuntajeTotalIFS,
  nivelIFSTailwindClasses,
} from '~/utils/analisis-score-imprimir-totals'

const props = defineProps<{
  cualitativo: number
  cuantitativo: number
  total: number
}>()

const resumenClass = computed(() =>
  nivelIFSTailwindClasses(classifyPuntajeTotalIFS(props.total)),
)

const nivelLabel = computed(() => classifyPuntajeTotalIFS(props.total))

function fmtPuntajeSum(n: number): string {
  if (Number.isInteger(n)) {
    return String(n)
  }
  return (Math.round(n * 100) / 100).toLocaleString('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}
</script>

<template>
  <div
    class="rounded-lg border-2 p-4 transition-colors"
    :class="resumenClass"
  >
    <p class="text-sm font-semibold">
      Resumen de puntajes (fórmula IFS)
    </p>
    <p class="mt-1 text-xs opacity-90">
      Total = suma cualitativas + suma cuantitativas.
      Clasificación:
      si total &lt; 400 → Bajo; si total ≤ 700 → Medio; si total ≥ 701 → Alto.
    </p>
    <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-md border border-border/60 bg-background/60 px-3 py-2">
        <p class="text-xs font-medium text-muted-foreground">
          Suma cualitativas
        </p>
        <p class="mt-1 font-mono text-xl font-semibold tabular-nums text-foreground">
          {{ fmtPuntajeSum(cualitativo) }}
        </p>
      </div>
      <div class="rounded-md border border-border/60 bg-background/60 px-3 py-2">
        <p class="text-xs font-medium text-muted-foreground">
          Suma cuantitativas
        </p>
        <p class="mt-1 font-mono text-xl font-semibold tabular-nums text-foreground">
          {{ fmtPuntajeSum(cuantitativo) }}
        </p>
      </div>
      <div class="rounded-md border border-border/60 bg-background/60 px-3 py-2">
        <p class="text-xs font-medium text-muted-foreground">
          Total
        </p>
        <p class="mt-1 font-mono text-xl font-semibold tabular-nums text-foreground">
          {{ fmtPuntajeSum(total) }}
        </p>
      </div>
      <div class="rounded-md border border-border/60 bg-background/80 px-3 py-2">
        <p class="text-xs font-medium opacity-80">
          Clasificación IFS
        </p>
        <p class="mt-1 text-xl font-bold tracking-tight">
          {{ nivelLabel }}
        </p>
      </div>
    </div>
  </div>
</template>
