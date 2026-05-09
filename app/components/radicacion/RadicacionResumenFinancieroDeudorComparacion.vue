<script setup lang="ts">
import RadicacionResumenFinancieroDeudor from '~/components/radicacion/RadicacionResumenFinancieroDeudor.vue'
import {
  areResumenFinancieroDeudorMetricsEqual,
  buildResumenFinancieroDeudorSoloRadicacion,
  financialInfoSinteticoDesdePersistido,
  mergeFinancialInfoResumenAnalisisDeudor,
  parseFinancialInfoBaselineRecord,
  resumenFinancieroDeudorMetricsDesdeSnapshot,
} from '~/utils/analisis-resumen-financiero-merge'
import { mergeEmergenciaFromSnapshot } from '~/constants/analisis-score-emergencia'

const props = defineProps<{
  financialInfo?: unknown
  amountRequested: number
  analisisScoreSnapshot?: Record<string, unknown> | null
}>()

const baselineFi = computed(() => parseFinancialInfoBaselineRecord(props.financialInfo))

const metricsRadicacion = computed(() =>
  buildResumenFinancieroDeudorSoloRadicacion(baselineFi.value, Number(props.amountRequested) || 0),
)

const metricsAnalisis = computed(() =>
  resumenFinancieroDeudorMetricsDesdeSnapshot(
    baselineFi.value,
    Number(props.amountRequested) || 0,
    props.analisisScoreSnapshot ?? null,
  ),
)

const tieneSnapshotAnalisis = computed(() => metricsAnalisis.value != null)

const mostrarDosBloques = computed(() => {
  const m = metricsAnalisis.value
  if (!m) {
    return false
  }
  return !areResumenFinancieroDeudorMetricsEqual(metricsRadicacion.value, m)
})

/** `financial_info` para la tarjeta «análisis»: sintético desde métricas guardadas o merge EMERGENCIA. */
const financialInfoAnalisisVista = computed((): Record<string, unknown> | null => {
  const snap = props.analisisScoreSnapshot
  const m = metricsAnalisis.value
  if (!snap || typeof snap !== 'object' || !m) {
    return null
  }
  const flat = snap.resumen_financiero_deudor_analisis
  const tienePlano = flat != null && typeof flat === 'object' && !Array.isArray(flat)
  if (tienePlano) {
    return financialInfoSinteticoDesdePersistido(m)
  }
  const em = snap.emergencia
  if (em != null && typeof em === 'object') {
    return mergeFinancialInfoResumenAnalisisDeudor(baselineFi.value, mergeEmergenciaFromSnapshot(em))
  }
  return financialInfoSinteticoDesdePersistido(m)
})
</script>

<template>
  <div class="space-y-4">
    <template v-if="mostrarDosBloques && financialInfoAnalisisVista">
      <RadicacionResumenFinancieroDeudor
        summary-scope-label="del deudor (análisis)"
        :financial-info="financialInfoAnalisisVista"
        :amount-requested="amountRequested"
        :analysis-adjusted="true"
      />
      <RadicacionResumenFinancieroDeudor
        summary-scope-label="del deudor (radicación)"
        :financial-info="financialInfo"
        :amount-requested="amountRequested"
      />
    </template>
    <template v-else>
      <RadicacionResumenFinancieroDeudor
        :financial-info="financialInfo"
        :amount-requested="amountRequested"
      />
      <p
        v-if="tieneSnapshotAnalisis && !mostrarDosBloques"
        class="text-xs text-muted-foreground"
      >
        Coincide con los indicadores guardados en el análisis (sin diferencias respecto a la radicación).
      </p>
    </template>
  </div>
</template>
