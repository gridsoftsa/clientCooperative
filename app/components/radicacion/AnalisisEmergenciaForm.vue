<script setup lang="ts">
import type { Company } from '~/types/company'
import type { EmergenciaCapacidadBloque, EmergenciaCuotaLine, EmergenciaState } from '~/constants/analisis-score-emergencia'
import { EMERGENCIA_FORM_META } from '~/constants/analisis-score-emergencia'
import { cn } from '@/lib/utils'
import Multiselect from '@vueform/multiselect'
import {
  filterPesosChars,
  formatPesos,
  formatPesosConSimboloDesdeTexto,
  onKeydownPesosOnly,
  parsePesosInput,
} from '~/composables/usePesosFormat'
import { formatMontoCopVista, parseMontoCop } from '~/utils/analisis-emergencia-cuota'
import {
  AYUDA_NIVEL_RCI_TRAMOS,
  classifyNivelRiesgoAsumidoRci,
  computeRiesgoAsumidoRciPercento,
  formatRiesgoAsumidoRciPorcentajeVista,
  rciNivelRiesgoBloqueClasses,
  rciResumenContenedorClasses,
} from '~/utils/analisis-emergencia-rci'
import type { EmergenciaCreditoCampoValidacion } from '~/utils/analisis-emergencia-validacion'
import {
  enfocarEmergenciaCreditoCampo,
} from '~/utils/analisis-emergencia-validacion'
import AnalisisEmergenciaGastosRadicacionFields from '~/components/radicacion/AnalisisEmergenciaGastosRadicacionFields.vue'
import AnalisisEmergenciaActivosPersonaBlock from '~/components/radicacion/AnalisisEmergenciaActivosPersonaBlock.vue'
import type { ActivoPersonaKey } from '~/utils/radicacion-financial-activos'
import {
  formatTotalActivosGlobalVista,
  totalActivosGlobalDesdeBloque,
} from '~/utils/radicacion-financial-activos'

const state = defineModel<EmergenciaState>({ required: true })

/** Fecha, documento, nombre y codeudor vienen de la radicación; no se editan aquí. */
const props = withDefaults(
  defineProps<{
    lockDeudorFields?: boolean
    /** Gastos/egresos alineados al paso 3 de radicación: solo lectura (análisis-score). */
    lockGastosDesdeRadicacion?: boolean
    /** Si el paso 1 eligió Corriente/Emergencia, Vr. cuota var. es fórmula (solo lectura). */
    lockVrCuotaVar?: boolean
    /**
     * % ING (parametrización) sobre ingresos disponibles — deudor (p. ej. 30).
     * Si no se pasa, 30.
     */
    pctReservaDeudor?: number
    /**
     * % ING (parametrización) sobre ingresos disponibles — codeudores (p. ej. 10).
     * Si no se pasa, 10.
     */
    pctReservaCodeudor?: number
    company?: Company | null
    loadingCompany?: boolean
    /** Codeudores de la radicación (entrevista): nombre y cédula; solo lectura. */
    codeudores?: { nombre: string, cedula: string }[]
    /** Características Garantía (Cualitativas) desde plantilla SCORE, según perfil. */
    opcionesGarantia?: string[]
    /**
     * Al pulsar, relee la solicitud y actualiza monto, ingresos, gastos y filas de activos (paso 3).
     * Lo provee `analisis-score` para reflejar cambios en la radicación.
     */
    syncPaso3Radicacion?: () => Promise<void>
    /** true mientras se llama a la API de sincronización. */
    syncPaso3RadicacionBloqueado?: boolean
  }>(),
  { lockDeudorFields: true, lockGastosDesdeRadicacion: false, lockVrCuotaVar: false, pctReservaDeudor: 30, pctReservaCodeudor: 10, company: null, loadingCompany: false, codeudores: () => [], opcionesGarantia: () => [], syncPaso3Radicacion: undefined, syncPaso3RadicacionBloqueado: false },
)

type FilaCapB1 = { key: 'a' | 'b', label: string, reserva: string, codIdx?: number }
type FilaCapB2 = { key: 'a' | 'b', label: string, codIdx: number }

/** Sólo deudor si no hay codeudores; con 1+ se añade el recuadro del 1.er codeudor. */
const filasCapacidadBloque1 = computed((): FilaCapB1[] => {
  const pd = props.pctReservaDeudor
  const pc = props.pctReservaCodeudor
  const rows: FilaCapB1[] = [
    { key: 'a', label: 'Capacidad de pago deudor', reserva: `(-) ${Number(pd ?? 0)}% ing.` },
  ]
  if (props.codeudores.length >= 1) {
    rows.push({
      key: 'b',
      label: 'Capacidad de pago primer codeudor',
      reserva: `(-) ${Number(pc ?? 0)}% ing.`,
      codIdx: 0,
    })
  }
  return rows
})

/** 2.º y 3.er sólo si hay 2 o 3 codeudores en la solicitud (misma lógica que plantilla). */
const filasCapacidadBloque2 = computed((): FilaCapB2[] => {
  const rows: FilaCapB2[] = []
  if (props.codeudores.length >= 2) {
    rows.push({ key: 'a', label: 'Capacidad de pago segundo codeudor', codIdx: 1 })
  }
  if (props.codeudores.length >= 3) {
    rows.push({ key: 'b', label: 'Capacidad de pago tercer codeudor', codIdx: 2 })
  }
  return rows
})

const tituloSubseccionCapacidadBloque1 = computed(() =>
  props.codeudores.length >= 1 ? 'Deudor y primer codeudor' : 'Deudor (titular)',
)

const tituloSubseccionCapacidadBloque2 = computed(() => {
  if (props.codeudores.length >= 3) {
    return 'Segundo y tercer codeudor'
  }
  if (props.codeudores.length === 2) {
    return 'Segundo codeudor'
  }
  return ''
})

/** Deudor + N codeudores (mismo criterio que capacidad de pago). */
const filasVistaActivos = computed((): { key: ActivoPersonaKey, label: string, codIdx?: number }[] => {
  const r: { key: ActivoPersonaKey, label: string, codIdx?: number }[] = [
    { key: 'deudor', label: 'Deudor principal' },
  ]
  if (props.codeudores.length >= 1) {
    r.push({ key: 'codeudor1', label: 'Codeudor 1', codIdx: 0 })
  }
  if (props.codeudores.length >= 2) {
    r.push({ key: 'codeudor2', label: 'Codeudor 2', codIdx: 1 })
  }
  if (props.codeudores.length >= 3) {
    r.push({ key: 'codeudor3', label: 'Codeudor 3', codIdx: 2 })
  }
  return r
})

const keysVisiblesActivos = computed((): ActivoPersonaKey[] => filasVistaActivos.value.map(f => f.key))

function sublineActivoPersona(row: { key: ActivoPersonaKey, codIdx?: number }): string | null {
  if (row.key === 'deudor') {
    const d = state.value.deudorCodeudor
    if (d.deudor || d.documento) {
      return `Solicitud — ${d.deudor || '—'}${d.documento ? ` · ${d.documento}` : ''}`
    }
    return null
  }
  if (row.codIdx != null) {
    const c = codeudorEnSolicitud(row.codIdx)
    if (c) {
      return `Solicitud — ${c.nombre}${c.cedula ? ` · ${c.cedula}` : ''}`
    }
  }
  return null
}

const etiquetaReservaCodeudor = computed(
  () => `(-) ${Number(props.pctReservaCodeudor ?? 0)}% ing.`,
)

const deudorReadonlyClass = 'cursor-default bg-muted/50 text-foreground read-only:opacity-100'

/** Misma pila label → input que la sección Gastos (`space-y-1`). */
const campoStack = 'min-w-0 space-y-1'
/** Ingresos disponibles, valor cuota, saldo: resaltado suave. */
const campoMontoClave = 'min-w-0 space-y-1 rounded-md border border-primary/30 bg-primary/[0.07] p-2.5 shadow-sm dark:border-primary/45 dark:bg-primary/[0.12]'
const labelMontoClave = 'text-xs font-semibold text-foreground'

function onBlurVrCuotaVar(): void {
  if (props.lockVrCuotaVar) {
    return
  }
  const t = state.value.credito.vrCuotaVar
  if (!t.trim()) {
    return
  }
  const n = parseMontoCop(t)
  if (n == null) {
    return
  }
  state.value.credito.vrCuotaVar = formatMontoCopVista(n)
}

/** Alinea cada subsección de capacidad con el deudor o el n-ésimo codeudor de la solicitud. */
function codeudorEnSolicitud(idx: number) {
  const list = props.codeudores
  if (!list.length || idx < 0 || idx >= list.length) {
    return null
  }
  return list[idx] ?? null
}

/**
 * Acepta texto con formato de pesos (radicación) o con símbolo COP / miles analisis.
 */
function parsePesosFlexible(s: string | undefined | null): number {
  if (s == null) {
    return 0
  }
  const t = String(s).trim()
  if (!t) {
    return 0
  }
  const p = parsePesosInput(t)
  if (p !== undefined) {
    return p
  }
  const m = parseMontoCop(t)
  return m ?? 0
}

/** Muestra valor almacenado con miles, decimales y prefijo $ (COP) en UI. */
function displayPesosStored(s: string | undefined | null): string {
  return formatPesosConSimboloDesdeTexto(s)
}

function displayPesosIngresosDisponibles(s: string | undefined | null): string {
  return formatPesosConSimboloDesdeTexto(s)
}

function onOtrosIngresosModelUpdate(b: EmergenciaCapacidadBloque, v: string) {
  const raw = filterPesosChars(String(v))
  if (!raw.trim()) {
    b.otrosIngresos = ''
    return
  }
  const n = parsePesosInput(raw)
  b.otrosIngresos = n === undefined ? raw : formatPesos(n)
}

/** Mismo criterio que «Otros ingresos» (formato COP, miles/decimales). */
function onCuotaFinPesosModelUpdate(line: EmergenciaCuotaLine, v: string) {
  const raw = filterPesosChars(String(v))
  if (!raw.trim()) {
    line.cuota = ''
    return
  }
  const n = parsePesosInput(raw)
  line.cuota = n === undefined ? raw : formatPesos(n)
}

function syncTotalIngresosBloque(b: EmergenciaCapacidadBloque) {
  const sum = parsePesosFlexible(b.ingresos) + parsePesosFlexible(b.otrosIngresos)
  if (sum === 0 && !String(b.ingresos ?? '').trim() && !String(b.otrosIngresos ?? '').trim()) {
    b.totalIngresos = ''
  }
  else {
    b.totalIngresos = formatPesos(sum)
  }
}

function syncAllTotalesIngresosCapacidad() {
  const s = state.value
  syncTotalIngresosBloque(s.capacidadBloque1.a)
  syncTotalIngresosBloque(s.capacidadBloque1.b)
  syncTotalIngresosBloque(s.capacidadBloque2.a)
  syncTotalIngresosBloque(s.capacidadBloque2.b)
}

/** `formatPesos` asume no negativos; aquí hace falta el signo y miles en COP. */
function formatPesosDiferencia(n: number): string {
  if (!Number.isFinite(n)) {
    return ''
  }
  if (n === 0) {
    return '0'
  }
  const sign = n < 0 ? '-' : ''
  return sign + formatPesos(Math.abs(n))
}

/** Total ingresos − Total gastos (total egresos). Solo se escribe vía `watch`. */
function syncIngresosDisponiblesBloque(b: EmergenciaCapacidadBloque) {
  const noTi = !String(b.totalIngresos ?? '').trim()
  const noTe = !String(b.totalEgresos ?? '').trim()
  if (noTi && noTe) {
    b.ingDisponibles = ''
    return
  }
  const ti = parsePesosFlexible(b.totalIngresos)
  const te = parsePesosFlexible(b.totalEgresos)
  b.ingDisponibles = formatPesosDiferencia(ti - te)
}

function syncAllIngresosDisponiblesCapacidad() {
  const s = state.value
  syncIngresosDisponiblesBloque(s.capacidadBloque1.a)
  syncIngresosDisponiblesBloque(s.capacidadBloque1.b)
  syncIngresosDisponiblesBloque(s.capacidadBloque2.a)
  syncIngresosDisponiblesBloque(s.capacidadBloque2.b)
}

/**
 * Reserva = ingresos disponibles × (% ING / 100). Parametrización deudor vs codeudor.
 * Solo se escribe vía `watch`.
 */
function syncReservaSobreIngresoBloque(b: EmergenciaCapacidadBloque, pct: number) {
  const p = Number.isFinite(pct) && pct >= 0 ? pct : 0
  if (!String(b.ingDisponibles ?? '').trim()) {
    b.reservaSobreIngreso = ''
    return
  }
  const id = parsePesosFlexible(b.ingDisponibles)
  const val = id * (p / 100)
  b.reservaSobreIngreso = formatPesosDiferencia(val)
}

function syncAllReservasSobreIngresoCapacidad() {
  const s = state.value
  const pd = props.pctReservaDeudor
  const pc = props.pctReservaCodeudor
  syncReservaSobreIngresoBloque(s.capacidadBloque1.a, pd)
  syncReservaSobreIngresoBloque(s.capacidadBloque1.b, pc)
  syncReservaSobreIngresoBloque(s.capacidadBloque2.a, pc)
  syncReservaSobreIngresoBloque(s.capacidadBloque2.b, pc)
}

/** Cada subsección de capacidad: mismo texto que Vr. cuota var. (crédito) para el snapshot. */
function syncValorCuotaDesdeCredito() {
  const v = state.value.credito.vrCuotaVar
  const c = state.value.capacidadBloque1
  const c2 = state.value.capacidadBloque2
  c.a.valorCuota = v
  c.b.valorCuota = v
  c2.a.valorCuota = v
  c2.b.valorCuota = v
}

/**
 * Saldo = ingresos disponibles − reserva ING (fila) − valor de cuota (Vr. cuota var.).
 * Sólo se escribe vía `watch`.
 */
function syncSaldoBloque(b: EmergenciaCapacidadBloque) {
  if (!String(b.ingDisponibles ?? '').trim()) {
    b.saldo = ''
    return
  }
  const id = parsePesosFlexible(b.ingDisponibles)
  const res = parsePesosFlexible(b.reservaSobreIngreso)
  const vc = parsePesosFlexible(state.value.credito.vrCuotaVar)
  b.saldo = formatPesosDiferencia(id - res - vc)
}

function syncAllSaldoCapacidad() {
  const s = state.value
  syncSaldoBloque(s.capacidadBloque1.a)
  syncSaldoBloque(s.capacidadBloque1.b)
  syncSaldoBloque(s.capacidadBloque2.a)
  syncSaldoBloque(s.capacidadBloque2.b)
}

watch(
  () => [
    state.value.credito.vrCuotaVar,
    state.value.capacidadBloque1.a.ingresos,
    state.value.capacidadBloque1.a.otrosIngresos,
    state.value.capacidadBloque1.b.ingresos,
    state.value.capacidadBloque1.b.otrosIngresos,
    state.value.capacidadBloque2.a.ingresos,
    state.value.capacidadBloque2.a.otrosIngresos,
    state.value.capacidadBloque2.b.ingresos,
    state.value.capacidadBloque2.b.otrosIngresos,
    state.value.capacidadBloque1.a.totalEgresos,
    state.value.capacidadBloque1.b.totalEgresos,
    state.value.capacidadBloque2.a.totalEgresos,
    state.value.capacidadBloque2.b.totalEgresos,
    state.value.capacidadBloque1.a.ingDisponibles,
    state.value.capacidadBloque1.b.ingDisponibles,
    state.value.capacidadBloque2.a.ingDisponibles,
    state.value.capacidadBloque2.b.ingDisponibles,
    props.pctReservaDeudor,
    props.pctReservaCodeudor,
  ],
  () => {
    syncAllTotalesIngresosCapacidad()
    syncAllIngresosDisponiblesCapacidad()
    syncAllReservasSobreIngresoCapacidad()
    syncValorCuotaDesdeCredito()
    syncAllSaldoCapacidad()
  },
  { flush: 'post', immediate: true },
)

watch(
  () => [state.value.activos, keysVisiblesActivos.value] as const,
  () => {
    const n = totalActivosGlobalDesdeBloque(state.value.activos, keysVisiblesActivos.value)
    state.value.activos.totalActivos = formatTotalActivosGlobalVista(n)
  },
  { deep: true, immediate: true },
)

/**
 * Total endeudamiento (central de riesgos) = deudas directas + deudas indirectas por persona.
 * Solo se escribe vía `watch`.
 */
function syncTotalEndeudamientoCentralRiesgos(): void {
  const cr = state.value.centralRiesgos
  const keys: ActivoPersonaKey[] = ['deudor', 'codeudor1', 'codeudor2', 'codeudor3']
  for (const k of keys) {
    const d = parsePesosFlexible(cr.deudasDirectas[k])
    const ind = parsePesosFlexible(cr.deudasIndirectas[k])
    const emptyD = !String(cr.deudasDirectas[k] ?? '').trim()
    const emptyI = !String(cr.deudasIndirectas[k] ?? '').trim()
    if (emptyD && emptyI) {
      cr.totalEndeudamiento[k] = ''
    }
    else {
      cr.totalEndeudamiento[k] = formatPesos(d + ind)
    }
  }
}

watch(
  () => [state.value.centralRiesgos.deudasDirectas, state.value.centralRiesgos.deudasIndirectas] as const,
  () => {
    syncTotalEndeudamientoCentralRiesgos()
  },
  { deep: true, immediate: true },
)

const sumaCuotasEntidadesDeudor = computed(() => {
  const lines = state.value.capacidadBloque1.a.cuotasFin ?? []
  return lines.reduce((s, l) => s + parsePesosFlexible(l.cuota), 0)
})

const vrCuotaVarNumDeudor = computed(() => parsePesosFlexible(state.value.credito.vrCuotaVar))
const totalIngresosDeudorNum = computed(() => parsePesosFlexible(state.value.capacidadBloque1.a.totalIngresos))

const rciPorcentoDeudor = computed(() => computeRiesgoAsumidoRciPercento({
  sumaCuotasEntidades: sumaCuotasEntidadesDeudor.value,
  vrCuotaVar: vrCuotaVarNumDeudor.value,
  totalIngresos: totalIngresosDeudorNum.value,
}))

const rciNivelDeudor = computed(() => {
  const p = rciPorcentoDeudor.value
  if (p == null) {
    return null
  }
  return classifyNivelRiesgoAsumidoRci(p)
})

function displayPesosCifra(n: number): string {
  if (!Number.isFinite(n)) {
    return formatPesos(0)
  }
  if (n === 0) {
    return formatPesos(0)
  }
  return formatPesos(Math.round(n))
}

watch(
  [rciPorcentoDeudor, rciNivelDeudor],
  () => {
    const p = rciPorcentoDeudor.value
    if (p == null) {
      state.value.nivel.riesgoAsumidoRci = ''
      state.value.nivel.nivelRiesgoAsumido = ''
    }
    else {
      state.value.nivel.riesgoAsumidoRci = formatRiesgoAsumidoRciPorcentajeVista(p)
      state.value.nivel.nivelRiesgoAsumido = rciNivelDeudor.value ?? ''
    }
  },
  { immediate: true },
)

function onCentralRiesgoMontoUpdate(
  field: 'deudasDirectas' | 'deudasIndirectas',
  key: ActivoPersonaKey,
  v: string,
): void {
  const raw = filterPesosChars(String(v))
  if (!raw.trim()) {
    state.value.centralRiesgos[field][key] = ''
    return
  }
  const n = parsePesosInput(raw)
  state.value.centralRiesgos[field][key] = n === undefined ? raw : formatPesos(n)
}

const { options: bancosOptions, fetchOptions: fetchBancosOptions } = useBancosCatalogOptions()

onMounted(() => {
  void fetchBancosOptions()
})

/** Incluye el valor guardado aunque sea texto legado o no esté en el catálogo. */
function bancoOptionsForLine(line: EmergenciaCuotaLine) {
  const list = bancosOptions.value
  const v = (line.entidad ?? '').trim()
  if (!v) {
    return list
  }
  if (list.some(o => o.value === v)) {
    return list
  }
  return [{ value: v, label: v }, ...list]
}

function addCuotaEntidadFinanciera(b: EmergenciaCapacidadBloque) {
  b.cuotasFin.push({ cuota: '', entidad: '' })
}

function removeCuotaEntidadFinanciera(b: EmergenciaCapacidadBloque, index: number) {
  if (b.cuotasFin.length <= 1) {
    return
  }
  b.cuotasFin.splice(index, 1)
}

/** Crédito: anillo danger en validación; no incluye `tipoValorCuota` (paso 1). */
const camposConErrorCredito = shallowRef<Set<EmergenciaCreditoCampoValidacion>>(new Set())

const creditoBordeValidacion = 'rounded-lg border border-destructive/60 bg-destructive/[0.06] p-0.5 shadow-sm ring-2 ring-destructive/40'

function creditoCampoConError(c: EmergenciaCreditoCampoValidacion): boolean {
  return camposConErrorCredito.value.has(c)
}

function quitarErrorCredito(c: EmergenciaCreditoCampoValidacion) {
  if (!camposConErrorCredito.value.has(c)) {
    return
  }
  const next = new Set(camposConErrorCredito.value)
  next.delete(c)
  camposConErrorCredito.value = next
}

/**
 * Aplica resaltado y foco al primer control del formulario (no incluye paso 1 / tipo de cuota).
 */
function aplicarErroresValidacionCredito(
  v: { ok: false, campos: EmergenciaCreditoCampoValidacion[] },
) {
  const enForm = v.campos.filter(c => c !== 'tipoValorCuota')
  camposConErrorCredito.value = new Set(enForm)
  nextTick(() => {
    const first = v.campos.find(c => c !== 'tipoValorCuota')
    if (first) {
      enfocarEmergenciaCreditoCampo(first)
    }
  })
}

function limpiarErroresValidacionCredito() {
  camposConErrorCredito.value = new Set()
}

defineExpose({
  aplicarErroresValidacionCredito,
  limpiarErroresValidacionCredito,
})
</script>

<template>
  <div class="space-y-6">
    <div class="rounded-md border border-border/80 bg-card/60 px-3 py-2 text-sm sm:px-3 sm:py-2.5">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div class="min-w-0 text-left">
          <p class="text-[10px] font-semibold uppercase leading-none text-muted-foreground sm:text-xs">
            Hoja de análisis
          </p>
          <p class="mt-0.5 line-clamp-2 text-sm font-bold leading-tight sm:text-sm">
            {{ EMERGENCIA_FORM_META.titulo }}
          </p>
        </div>
        <div class="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground sm:justify-end">
          <span class="whitespace-nowrap">
            Cód. <span class="font-mono text-foreground">{{ state.encabezado.codigoFormulario || EMERGENCIA_FORM_META.codigo }}</span>
          </span>
          <span class="whitespace-nowrap">
            Ver. <span class="font-mono text-foreground">{{ state.encabezado.version || EMERGENCIA_FORM_META.version }}</span>
          </span>
          <span class="min-w-0 whitespace-nowrap">
            NIT
            <span class="font-mono text-foreground">
              <template v-if="loadingCompany">…</template>
              <template v-else>{{ (company && company.nit && company.nit.trim()) || '—' }}</template>
            </span>
          </span>
        </div>
      </div>
      <p class="mt-1.5 line-clamp-2 text-center text-[11px] font-medium text-foreground/90 sm:text-left sm:text-xs">
        {{ state.encabezado.entidad || EMERGENCIA_FORM_META.entidadLinea }}
      </p>
      <div class="mt-2 flex max-w-sm flex-col gap-1 sm:mt-2 sm:flex-row sm:items-end sm:gap-2">
        <Label for="emg-fa" class="shrink-0 text-[11px] text-muted-foreground sm:pb-0.5 sm:text-xs">Fecha actualización</Label>
        <Input
          id="emg-fa"
          v-model="state.encabezado.fechaActualizacion"
          class="h-8 w-full text-sm"
          placeholder="DD/MM/AAAA"
        />
      </div>
    </div>

    <div class="rounded-md border p-4">
      <h3 class="mb-3 text-sm font-bold uppercase text-foreground">
        Información del deudor
      </h3>
      <p class="mb-2 text-xs font-semibold uppercase text-foreground">
        Deudor
      </p>
      <div class="grid gap-3 sm:grid-cols-2">
        <div class="space-y-1.5 sm:col-span-2">
          <Label for="emg-deudor">Nombre</Label>
          <Input
            id="emg-deudor"
            v-model="state.deudorCodeudor.deudor"
            :read-only-form="lockDeudorFields"
            :class="cn(lockDeudorFields && deudorReadonlyClass)"
            :tabindex="lockDeudorFields ? -1 : undefined"
          />
        </div>
        <div class="space-y-1.5">
          <Label for="emg-dcto">Cédula</Label>
          <Input
            id="emg-dcto"
            v-model="state.deudorCodeudor.documento"
            class="font-mono"
            :read-only-form="lockDeudorFields"
            :class="cn(lockDeudorFields && deudorReadonlyClass)"
            :tabindex="lockDeudorFields ? -1 : undefined"
          />
        </div>
        <div class="space-y-1.5">
          <Label for="emg-fa2">Fecha de análisis</Label>
          <Input
            id="emg-fa2"
            v-model="state.deudorCodeudor.fechaAnalisis"
            class="font-mono"
            :read-only-form="lockDeudorFields"
            :class="cn(lockDeudorFields && deudorReadonlyClass)"
            :tabindex="lockDeudorFields ? -1 : undefined"
          />
        </div>
      </div>
      <div class="mt-4 border-t pt-4">
        <p class="mb-2 text-xs font-semibold uppercase text-foreground">
          Codeudores
        </p>
        <ul v-if="codeudores.length" class="space-y-4">
          <li
            v-for="(c, idx) in codeudores"
            :key="idx"
            class="grid gap-3 rounded-md border border-dashed border-border/60 bg-muted/10 p-3 sm:grid-cols-2"
          >
            <p class="sm:col-span-2 text-xs font-medium text-muted-foreground">
              Codeudor {{ idx + 1 }}
            </p>
            <div class="space-y-1.5">
              <Label :for="`emg-cod-n-${idx}`">Nombre</Label>
              <div
                :id="`emg-cod-n-${idx}`"
                class="flex min-h-9 w-full items-center rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-foreground"
              >
                {{ c.nombre || '—' }}
              </div>
            </div>
            <div class="space-y-1.5">
              <Label :for="`emg-cod-c-${idx}`">Cédula</Label>
              <div
                :id="`emg-cod-c-${idx}`"
                class="flex min-h-9 w-full items-center rounded-md border border-input bg-muted/50 px-3 py-2 font-mono text-sm text-foreground"
              >
                {{ c.cedula || '—' }}
              </div>
            </div>
          </li>
        </ul>
        <p v-else class="text-sm text-muted-foreground">
          No hay codeudores registrados en la solicitud.
        </p>
      </div>
    </div>

    <div class="rounded-md border p-4">
      <h3 class="mb-3 text-sm font-bold uppercase text-foreground">
        Información de crédito
      </h3>
      <!--
        Tres columnas (md+): 1) Valor crédito + Vr. cuota 2) Plazo + Tasa nom 3) Garantía + Tasa efectivo
        Móvil: fila a fila en el mismo orden.
      -->
      <div class="grid gap-x-3 gap-y-3 md:grid-cols-3 md:items-stretch">
        <div
          class="emg-cred-field flex h-full min-h-0 min-w-0 flex-col"
          :class="cn(creditoCampoConError('vrCredito') && creditoBordeValidacion)"
        >
          <Label for="emg-vc" class="shrink-0 text-sm font-medium leading-snug">Valor de crédito (COP)</Label>
          <p class="emg-cred-hint shrink-0">Monto en pesos colombianos; mismo criterio que Vr. cuota var.</p>
          <div class="mt-auto w-full pt-1">
            <Input
              id="emg-vc"
              v-model="state.credito.vrCredito"
              inputmode="decimal"
              class="h-10 w-full font-mono"
              readonly
              :class="deudorReadonlyClass"
              :tabindex="-1"
              placeholder="Ej. $ 200.000.000,00"
              @update:model-value="() => quitarErrorCredito('vrCredito')"
            />
          </div>
        </div>
        <div
          class="emg-cred-field flex h-full min-h-0 min-w-0 flex-col"
          :class="cn(creditoCampoConError('plazoMeses') && creditoBordeValidacion)"
        >
          <Label for="emg-plz" class="shrink-0 text-sm font-medium leading-snug">Plazo (meses)</Label>
          <p class="emg-cred-hint shrink-0">Plazo del crédito. Viene de la radicación.</p>
          <div class="mt-auto w-full pt-1">
            <Input
              id="emg-plz"
              v-model="state.credito.plazoMeses"
              class="h-10 w-full font-mono"
              readonly
              :class="deudorReadonlyClass"
              :tabindex="-1"
              @update:model-value="() => quitarErrorCredito('plazoMeses')"
            />
          </div>
        </div>
        <div
          class="emg-cred-field flex h-full min-h-0 min-w-0 flex-col"
          :class="cn(creditoCampoConError('garantia') && creditoBordeValidacion)"
        >
          <Label for="emg-gar" class="shrink-0 text-sm font-medium leading-snug">Garantía</Label>
          <p class="emg-cred-hint shrink-0">Cualitativas según perfil (paso 1) y plantilla SCORE.</p>
          <div class="mt-auto w-full pt-1">
            <Multiselect
              id="emg-gar"
              :model-value="state.credito.garantia ? state.credito.garantia : null"
              mode="single"
              :object="false"
              :options="opcionesGarantia"
              :searchable="true"
              :can-clear="true"
              :disabled="!opcionesGarantia.length"
              placeholder="Seleccionar"
              no-options-text="Sin opciones: elija un perfil del deudor (paso 1) o verifique la plantilla SCORE."
              no-results-text="Sin coincidencias"
              class="multiselect-municipality w-full"
              @update:model-value="(v: unknown) => { state.credito.garantia = (v != null && v !== '') ? String(v) : ''; quitarErrorCredito('garantia') }"
            />
          </div>
        </div>
        <div
          class="emg-cred-field flex h-full min-h-0 min-w-0 flex-col"
          :class="cn(creditoCampoConError('vrCuotaVar') && creditoBordeValidacion)"
        >
          <Label for="emg-vcv" class="shrink-0 text-sm font-medium leading-snug">Vr. cuota var. (COP)</Label>
          <p class="emg-cred-hint shrink-0">
            {{ lockVrCuotaVar
              ? 'Calculado; mismo formato monetario que el valor de crédito.'
              : 'Al salir del campo se formatea en pesos (COP).' }}
          </p>
          <div class="mt-auto w-full pt-1">
            <Input
              id="emg-vcv"
              v-model="state.credito.vrCuotaVar"
              class="h-10 w-full font-mono"
              inputmode="decimal"
              :read-only-form="lockVrCuotaVar"
              :class="cn(lockVrCuotaVar && deudorReadonlyClass)"
              :tabindex="lockVrCuotaVar ? -1 : undefined"
              placeholder="Ej. $ 5.200.000,00"
              @blur="onBlurVrCuotaVar"
              @update:model-value="() => quitarErrorCredito('vrCuotaVar')"
            />
          </div>
        </div>
        <div
          class="emg-cred-field flex h-full min-h-0 min-w-0 flex-col"
          :class="cn(creditoCampoConError('tasaNominal') && creditoBordeValidacion)"
        >
          <Label for="emg-tn" class="shrink-0 text-sm font-medium leading-snug">Tasa nominal — % (anual)</Label>
          <p class="emg-cred-hint shrink-0">Valor en %; coma o punto. Se usa con precisión completa en el cálculo de la cuota.</p>
          <div class="mt-auto w-full pt-1">
            <div class="relative">
              <Input
                id="emg-tn"
                v-model="state.credito.tasaNominal"
                class="h-10 w-full font-mono pr-8"
                inputmode="decimal"
                placeholder="Ej. 12,5"
                autocomplete="off"
                @update:model-value="() => quitarErrorCredito('tasaNominal')"
              />
              <span class="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
            </div>
          </div>
        </div>
        <div class="emg-cred-field flex h-full min-h-0 min-w-0 flex-col">
          <Label for="emg-te" class="shrink-0 text-sm font-medium leading-snug">Tasa / efectivo periodo — % (mensual)</Label>
          <p class="emg-cred-hint shrink-0">% mensual; = tasa nominal ÷ 12; hasta 2 decimales. Automático.</p>
          <div class="mt-auto w-full pt-1">
            <div class="relative">
              <Input
                id="emg-te"
                v-model="state.credito.tasaEfectiva"
                class="h-10 w-full font-mono pr-8"
                readonly
                :class="deudorReadonlyClass"
                :tabindex="-1"
                placeholder="—"
              />
              <span class="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Capacidad: una subsección por deudor y por cada posición de codeudor (plantilla) -->
    <div class="space-y-3">
      <div>
        <h3 class="text-sm font-bold uppercase text-foreground">
          Capacidad de pago (deudor y codeudores)
        </h3>
        <p class="mt-1.5 text-sm text-muted-foreground">
          Cargue <strong class="font-medium text-foreground">la capacidad del deudor (titular)</strong> y
          <strong class="font-medium text-foreground">una hoja análoga</strong> por cada codeudor vinculado a <em>esta</em> radicación.
          Aquí <strong class="font-medium text-foreground">sólo se muestran</strong> los recuadros de codeudor que existan en «Información del deudor → Codeudores» (1.º, 2.º, 3.º), hasta tres.
        </p>
        <p
          v-if="codeudores.length === 0"
          class="mt-1 text-xs text-amber-800 dark:text-amber-200/90"
        >
          Sin codeudores en la solicitud: se muestra solo la capacidad del deudor.
        </p>
        <p
          v-else-if="codeudores.length === 1"
          class="mt-1 text-xs text-muted-foreground"
        >
          Con <strong class="text-foreground">un</strong> codeudor se añade únicamente la hoja de <em>primer codeudor</em>; no aparecen apartados de 2.º o 3.er salvo que existan en la radicación.
        </p>
        <p
          v-else
          class="mt-1 text-xs text-muted-foreground"
        >
          Con <strong class="text-foreground">{{ codeudores.length }}</strong> codeudores se muestran, en este orden, las hojas de
          1.º, 2.º<template v-if="codeudores.length >= 3"> y 3.er</template>.
        </p>
      </div>
      <h4 class="text-xs font-bold uppercase text-muted-foreground">
        {{ tituloSubseccionCapacidadBloque1 }}
      </h4>
      <div
        class="grid gap-4"
        :class="filasCapacidadBloque1.length > 1 ? 'lg:grid-cols-2' : 'lg:max-w-2xl'"
      >
        <div
          v-for="(side, sideIdx) in filasCapacidadBloque1"
          :key="side.key"
          class="rounded-md border p-3"
        >
          <p class="text-xs font-semibold text-muted-foreground">
            {{ side.label }}
          </p>
          <p
            v-if="side.key === 'a' && (state.deudorCodeudor.deudor || state.deudorCodeudor.documento)"
            class="mt-0.5 text-xs text-foreground"
          >
            <span class="text-muted-foreground">Solicitud —</span>
            {{ state.deudorCodeudor.deudor || '—' }}
            <span v-if="state.deudorCodeudor.documento" class="font-mono text-muted-foreground">· {{ state.deudorCodeudor.documento }}</span>
          </p>
          <p
            v-else-if="side.key === 'b'"
            class="mt-0.5 text-xs text-foreground"
          >
            <span class="text-muted-foreground">Solicitud —</span>
            {{ codeudorEnSolicitud(0)?.nombre || '—' }}
            <span v-if="codeudorEnSolicitud(0)?.cedula" class="font-mono text-muted-foreground">· {{ codeudorEnSolicitud(0)?.cedula }}</span>
          </p>
          <div class="mt-2 space-y-2">
            <div class="grid grid-cols-2 gap-2">
              <div :class="campoStack">
                <Label :for="`c1-${sideIdx}-ing`" class="text-xs">Ingresos</Label>
                <Input
                  :id="`c1-${sideIdx}-ing`"
                  :model-value="displayPesosStored(state.capacidadBloque1[side.key].ingresos)"
                  type="text"
                  inputmode="decimal"
                  class="h-8 w-full max-w-[15rem] min-w-0 text-right font-mono"
                  readonly
                  :class="deudorReadonlyClass"
                  :tabindex="-1"
                  title="Valor tomado del paso 3 (Datos financieros) de la radicación. No editable."
                />
              </div>
              <div :class="campoStack">
                <Label :for="`c1-${sideIdx}-oing`" class="text-xs">Otros ingresos</Label>
                <Input
                  :id="`c1-${sideIdx}-oing`"
                  :model-value="displayPesosStored(state.capacidadBloque1[side.key].otrosIngresos)"
                  type="text"
                  inputmode="decimal"
                  class="h-8 w-full max-w-[15rem] min-w-0 text-right font-mono"
                  placeholder="0"
                  @keydown="onKeydownPesosOnly"
                  @update:model-value="onOtrosIngresosModelUpdate(state.capacidadBloque1[side.key], $event != null ? String($event) : '')"
                />
              </div>
            </div>
            <div :class="campoStack">
              <Label :for="`c1-${sideIdx}-ti`" class="text-xs">Total ingresos</Label>
              <Input
                :id="`c1-${sideIdx}-ti`"
                :model-value="displayPesosStored(state.capacidadBloque1[side.key].totalIngresos)"
                type="text"
                inputmode="decimal"
                class="h-8 w-full max-w-[15rem] min-w-0 text-right font-mono"
                readonly
                :class="deudorReadonlyClass"
                :tabindex="-1"
                title="Suma de Ingresos y Otros ingresos. No editable."
              />
            </div>
            <div class="space-y-2">
              <p class="pt-1 text-xs font-medium text-muted-foreground">
                Cuota entidades financieras
              </p>
              <div
                v-for="(line, i) in state.capacidadBloque1[side.key].cuotasFin"
                :key="`c1q-${side.key}-${i}`"
                class="space-y-2 rounded-md border border-border/70 bg-background p-2"
              >
                <div class="grid grid-cols-1 items-end gap-2 sm:grid-cols-2 sm:items-end">
                  <div class="min-w-0 space-y-1">
                    <Label :for="`c1q-e-${side.key}-${i}`" class="text-xs font-medium">Entidad</Label>
                    <Multiselect
                      :id="`c1q-e-${side.key}-${i}`"
                      :model-value="line.entidad ? line.entidad : null"
                      :options="bancoOptionsForLine(line)"
                      mode="single"
                      value-prop="value"
                      label="label"
                      :searchable="true"
                      :can-clear="true"
                      :append-to-body="true"
                      :close-on-scroll="true"
                      placeholder="Seleccionar banco"
                      no-options-text="Sin opciones. Configura bancos en Parametrización → Radicación."
                      no-results-text="Sin coincidencias"
                      class="multiselect-entidad-banco w-full"
                      @update:model-value="line.entidad = ($event != null && $event !== '') ? String($event) : ''"
                    />
                  </div>
                  <div class="min-w-0 space-y-1">
                    <Label :for="`c1q-c-${side.key}-${i}`" class="text-xs font-medium">Cuota</Label>
                    <Input
                      :id="`c1q-c-${side.key}-${i}`"
                      :model-value="displayPesosStored(line.cuota)"
                      type="text"
                      inputmode="decimal"
                      class="h-8 w-full max-w-[15rem] min-w-0 bg-background text-right font-mono"
                      placeholder="0"
                      @keydown="onKeydownPesosOnly"
                      @update:model-value="onCuotaFinPesosModelUpdate(line, $event != null ? String($event) : '')"
                    />
                  </div>
                </div>
                <div
                  v-if="state.capacidadBloque1[side.key].cuotasFin.length > 1"
                  class="flex justify-end"
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    class="h-7 text-xs"
                    @click="removeCuotaEntidadFinanciera(state.capacidadBloque1[side.key], i)"
                  >
                    <Icon name="i-lucide-trash-2" class="mr-1 h-3.5 w-3.5" />
                    Quitar
                  </Button>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                class="h-8 gap-1.5 text-xs"
                @click="addCuotaEntidadFinanciera(state.capacidadBloque1[side.key])"
              >
                <Icon name="i-lucide-plus" class="h-3.5 w-3.5" />
                Agregar
              </Button>
            </div>
            <AnalisisEmergenciaGastosRadicacionFields
              :bloque="state.capacidadBloque1[side.key]"
              :lock="lockGastosDesdeRadicacion"
            />
            <div :class="campoMontoClave">
              <Label class="text-xs" :class="labelMontoClave">Ingresos disponibles</Label>
              <Input
                :model-value="displayPesosIngresosDisponibles(state.capacidadBloque1[side.key].ingDisponibles)"
                type="text"
                inputmode="decimal"
                class="h-8 w-full max-w-[15rem] min-w-0 text-right font-mono"
                readonly
                :class="deudorReadonlyClass"
                :tabindex="-1"
                title="Total ingresos − Total gastos. No editable."
              />
            </div>
            <div :class="campoStack">
              <Label class="text-xs">{{ side.reserva }}</Label>
              <Input
                :model-value="displayPesosIngresosDisponibles(state.capacidadBloque1[side.key].reservaSobreIngreso)"
                type="text"
                inputmode="decimal"
                class="h-8 w-full max-w-[15rem] min-w-0 text-right font-mono"
                readonly
                :class="deudorReadonlyClass"
                :tabindex="-1"
                :title="side.key === 'a' ? `Ingresos disponibles × ${props.pctReservaDeudor}% (ING). No editable.` : `Ingresos disponibles × ${props.pctReservaCodeudor}% (ING). No editable.`"
              />
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div :class="campoMontoClave">
                <Label class="text-xs" :class="labelMontoClave">Valor cuota</Label>
                <Input
                  :model-value="displayPesosStored(state.credito.vrCuotaVar)"
                  type="text"
                  inputmode="decimal"
                  class="h-8 w-full max-w-[15rem] min-w-0 text-right font-mono"
                  readonly
                  :class="deudorReadonlyClass"
                  :tabindex="-1"
                  title="Mismo valor que «Vr. cuota var. (COP)» en el apartado de crédito. No editable."
                />
              </div>
              <div :class="campoMontoClave">
                <Label class="text-xs" :class="labelMontoClave">Saldo</Label>
                <Input
                  :model-value="displayPesosIngresosDisponibles(state.capacidadBloque1[side.key].saldo)"
                  type="text"
                  inputmode="decimal"
                  class="h-8 w-full max-w-[15rem] min-w-0 text-right font-mono"
                  readonly
                  :class="deudorReadonlyClass"
                  :tabindex="-1"
                  title="Ingresos disponibles − reserva ING − valor cuota. No editable."
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <template v-if="filasCapacidadBloque2.length">
        <h4 class="pt-1 text-xs font-bold uppercase text-muted-foreground">
          {{ tituloSubseccionCapacidadBloque2 }}
        </h4>
        <div
          class="grid gap-4"
          :class="filasCapacidadBloque2.length > 1 ? 'lg:grid-cols-2' : 'lg:max-w-2xl'"
        >
        <div
          v-for="(side, sideIdx) in filasCapacidadBloque2"
          :key="side.key"
          class="rounded-md border p-3"
        >
          <p class="text-xs font-semibold text-muted-foreground">
            {{ side.label }}
          </p>
          <p class="mt-0.5 text-xs text-foreground">
            <span class="text-muted-foreground">Solicitud —</span>
            {{ codeudorEnSolicitud(side.codIdx)?.nombre || '—' }}
            <span v-if="codeudorEnSolicitud(side.codIdx)?.cedula" class="font-mono text-muted-foreground">· {{ codeudorEnSolicitud(side.codIdx)?.cedula }}</span>
          </p>
          <div class="mt-2 space-y-2">
            <div class="grid grid-cols-2 gap-2">
              <div :class="campoStack">
                <Label :for="`c2-${sideIdx}-ing`" class="text-xs">Ingresos</Label>
                <Input
                  :id="`c2-${sideIdx}-ing`"
                  :model-value="displayPesosStored(state.capacidadBloque2[side.key].ingresos)"
                  type="text"
                  inputmode="decimal"
                  class="h-8 w-full max-w-[15rem] min-w-0 text-right font-mono"
                  readonly
                  :class="deudorReadonlyClass"
                  :tabindex="-1"
                  title="Valor tomado del paso 3 (Datos financieros) de la radicación. No editable."
                />
              </div>
              <div :class="campoStack">
                <Label :for="`c2-${sideIdx}-oing`" class="text-xs">Otros ingresos</Label>
                <Input
                  :id="`c2-${sideIdx}-oing`"
                  :model-value="displayPesosStored(state.capacidadBloque2[side.key].otrosIngresos)"
                  type="text"
                  inputmode="decimal"
                  class="h-8 w-full max-w-[15rem] min-w-0 text-right font-mono"
                  placeholder="0"
                  @keydown="onKeydownPesosOnly"
                  @update:model-value="onOtrosIngresosModelUpdate(state.capacidadBloque2[side.key], $event != null ? String($event) : '')"
                />
              </div>
            </div>
            <div :class="campoStack">
              <Label class="text-xs">Total ingresos</Label>
              <Input
                :model-value="displayPesosStored(state.capacidadBloque2[side.key].totalIngresos)"
                type="text"
                inputmode="decimal"
                class="h-8 w-full max-w-[15rem] min-w-0 text-right font-mono"
                readonly
                :class="deudorReadonlyClass"
                :tabindex="-1"
                title="Suma de Ingresos y Otros ingresos. No editable."
              />
            </div>
            <div class="space-y-2">
              <p class="pt-1 text-xs font-medium text-muted-foreground">
                Cuota entidades financieras
              </p>
              <div
                v-for="(line, i) in state.capacidadBloque2[side.key].cuotasFin"
                :key="`c2q-${side.key}-${i}`"
                class="space-y-2 rounded-md border border-border/70 bg-background p-2"
              >
                <div class="grid grid-cols-1 items-end gap-2 sm:grid-cols-2 sm:items-end">
                  <div class="min-w-0 space-y-1">
                    <Label :for="`c2q-e-${side.key}-${i}`" class="text-xs font-medium">Entidad</Label>
                    <Multiselect
                      :id="`c2q-e-${side.key}-${i}`"
                      :model-value="line.entidad ? line.entidad : null"
                      :options="bancoOptionsForLine(line)"
                      mode="single"
                      value-prop="value"
                      label="label"
                      :searchable="true"
                      :can-clear="true"
                      :append-to-body="true"
                      :close-on-scroll="true"
                      placeholder="Seleccionar banco"
                      no-options-text="Sin opciones. Configura bancos en Parametrización → Radicación."
                      no-results-text="Sin coincidencias"
                      class="multiselect-entidad-banco w-full"
                      @update:model-value="line.entidad = ($event != null && $event !== '') ? String($event) : ''"
                    />
                  </div>
                  <div class="min-w-0 space-y-1">
                    <Label :for="`c2q-c-${side.key}-${i}`" class="text-xs font-medium">Cuota</Label>
                    <Input
                      :id="`c2q-c-${side.key}-${i}`"
                      :model-value="displayPesosStored(line.cuota)"
                      type="text"
                      inputmode="decimal"
                      class="h-8 w-full max-w-[15rem] min-w-0 bg-background text-right font-mono"
                      placeholder="0"
                      @keydown="onKeydownPesosOnly"
                      @update:model-value="onCuotaFinPesosModelUpdate(line, $event != null ? String($event) : '')"
                    />
                  </div>
                </div>
                <div
                  v-if="state.capacidadBloque2[side.key].cuotasFin.length > 1"
                  class="flex justify-end"
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    class="h-7 text-xs"
                    @click="removeCuotaEntidadFinanciera(state.capacidadBloque2[side.key], i)"
                  >
                    <Icon name="i-lucide-trash-2" class="mr-1 h-3.5 w-3.5" />
                    Quitar
                  </Button>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                class="h-8 gap-1.5 text-xs"
                @click="addCuotaEntidadFinanciera(state.capacidadBloque2[side.key])"
              >
                <Icon name="i-lucide-plus" class="h-3.5 w-3.5" />
                Agregar
              </Button>
            </div>
            <AnalisisEmergenciaGastosRadicacionFields
              :bloque="state.capacidadBloque2[side.key]"
              :lock="lockGastosDesdeRadicacion"
            />
            <div :class="campoMontoClave">
              <Label class="text-xs" :class="labelMontoClave">Ingresos disponibles</Label>
              <Input
                :model-value="displayPesosIngresosDisponibles(state.capacidadBloque2[side.key].ingDisponibles)"
                type="text"
                inputmode="decimal"
                class="h-8 w-full max-w-[15rem] min-w-0 text-right font-mono"
                readonly
                :class="deudorReadonlyClass"
                :tabindex="-1"
                title="Total ingresos − Total gastos. No editable."
              />
            </div>
            <div :class="campoStack">
              <Label class="text-xs">{{ etiquetaReservaCodeudor }}</Label>
              <Input
                :model-value="displayPesosIngresosDisponibles(state.capacidadBloque2[side.key].reservaSobreIngreso)"
                type="text"
                inputmode="decimal"
                class="h-8 w-full max-w-[15rem] min-w-0 text-right font-mono"
                readonly
                :class="deudorReadonlyClass"
                :tabindex="-1"
                :title="`Ingresos disponibles × ${props.pctReservaCodeudor}% (ING). No editable.`"
              />
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div :class="campoMontoClave">
                <Label class="text-xs" :class="labelMontoClave">Valor cuota</Label>
                <Input
                  :model-value="displayPesosStored(state.credito.vrCuotaVar)"
                  type="text"
                  inputmode="decimal"
                  class="h-8 w-full max-w-[15rem] min-w-0 text-right font-mono"
                  readonly
                  :class="deudorReadonlyClass"
                  :tabindex="-1"
                  title="Mismo valor que «Vr. cuota var. (COP)» en el apartado de crédito. No editable."
                />
              </div>
              <div :class="campoMontoClave">
                <Label class="text-xs" :class="labelMontoClave">Saldo</Label>
                <Input
                  :model-value="displayPesosIngresosDisponibles(state.capacidadBloque2[side.key].saldo)"
                  type="text"
                  inputmode="decimal"
                  class="h-8 w-full max-w-[15rem] min-w-0 text-right font-mono"
                  readonly
                  :class="deudorReadonlyClass"
                  :tabindex="-1"
                  title="Ingresos disponibles − reserva ING − valor cuota. No editable."
                />
              </div>
            </div>
          </div>
        </div>
        </div>
      </template>
    </div>

    <div class="rounded-md border p-4">
      <div class="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div class="min-w-0 space-y-1">
          <h3 class="text-sm font-bold uppercase text-foreground">
            Activos
          </h3>
          <p class="text-xs text-muted-foreground">
            Se muestran el deudor y los codeudores según la radicación. Bienes raíces: activos con Garantía en el paso 3;
            otros bienes: activos sin Garantía. El total global suma las dos tablas de cada persona.
            Si añadiste o quitaste activos en el paso 3, pulsa <span class="font-medium text-foreground">Actualizar desde radicación</span> o vuelve a abrir este paso para alinear con la base.
          </p>
        </div>
        <Button
          v-if="syncPaso3Radicacion"
          type="button"
          variant="secondary"
          class="h-9 shrink-0 gap-2 font-semibold"
          :disabled="syncPaso3RadicacionBloqueado"
          @click="() => { void syncPaso3Radicacion?.() }"
        >
          <Icon
            v-if="syncPaso3RadicacionBloqueado"
            name="i-lucide-loader-2"
            class="h-4 w-4 shrink-0 animate-spin"
            aria-hidden="true"
          />
          <Icon
            v-else
            name="i-lucide-refresh-cw"
            class="h-4 w-4 shrink-0"
            aria-hidden="true"
          />
          Actualizar desde radicación
        </Button>
      </div>
      <div class="space-y-4">
        <AnalisisEmergenciaActivosPersonaBlock
          v-for="row in filasVistaActivos"
          :key="row.key"
          v-model="state.activos[row.key]"
          :title="row.label"
          :subline="sublineActivoPersona(row)"
        />
      </div>
      <div :class="[campoStack, 'pt-2']">
        <Label for="ac-tot" class="text-xs font-bold">Total activos</Label>
        <Input
          id="ac-tot"
          :model-value="state.activos.totalActivos"
          type="text"
          class="h-8 max-w-md font-mono"
          readonly
          :class="deudorReadonlyClass"
          :tabindex="-1"
          title="Suma de (Total bienes raíces + Total otros bienes) de cada deudor/codeudor en esta sección. No editable."
        />
      </div>
    </div>

    <div class="rounded-md border p-4">
      <h3 class="mb-1 text-sm font-bold uppercase text-foreground">
        Resultado consulta central de riesgos
      </h3>
      <p class="mb-3 text-xs text-muted-foreground">
        Un recuadro por deudor y por cada codeudor de la radicación. Total endeudamiento = deudas directas + deudas indirectas (no editable).
      </p>
      <div class="space-y-4">
        <div
          v-for="row in filasVistaActivos"
          :key="`cr-${row.key}`"
          class="rounded-md border border-border/80 bg-card/20 p-3"
        >
          <p class="text-xs font-semibold text-foreground">
            {{ row.label }}
          </p>
          <p
            v-if="sublineActivoPersona(row)"
            class="mt-0.5 text-xs text-muted-foreground"
          >
            {{ sublineActivoPersona(row) }}
          </p>
          <div class="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div :class="campoStack">
              <Label :for="`cr-dd-${row.key}`" class="text-xs font-medium">Deudas directas</Label>
              <Input
                :id="`cr-dd-${row.key}`"
                :model-value="displayPesosStored(state.centralRiesgos.deudasDirectas[row.key])"
                type="text"
                inputmode="decimal"
                class="h-8 w-full max-w-[15rem] min-w-0 text-right font-mono"
                placeholder="$ 0"
                @keydown="onKeydownPesosOnly"
                @update:model-value="onCentralRiesgoMontoUpdate('deudasDirectas', row.key, $event != null ? String($event) : '')"
              />
            </div>
            <div :class="campoStack">
              <Label :for="`cr-di-${row.key}`" class="text-xs font-medium">Deudas indirectas</Label>
              <Input
                :id="`cr-di-${row.key}`"
                :model-value="displayPesosStored(state.centralRiesgos.deudasIndirectas[row.key])"
                type="text"
                inputmode="decimal"
                class="h-8 w-full max-w-[15rem] min-w-0 text-right font-mono"
                placeholder="$ 0"
                @keydown="onKeydownPesosOnly"
                @update:model-value="onCentralRiesgoMontoUpdate('deudasIndirectas', row.key, $event != null ? String($event) : '')"
              />
            </div>
            <div :class="campoStack">
              <Label :for="`cr-te-${row.key}`" class="text-xs font-medium">Total endeudamiento</Label>
              <Input
                :id="`cr-te-${row.key}`"
                :model-value="displayPesosStored(state.centralRiesgos.totalEndeudamiento[row.key])"
                type="text"
                class="h-8 w-full max-w-[15rem] min-w-0 text-right font-mono"
                readonly
                :class="deudorReadonlyClass"
                :tabindex="-1"
                title="Suma de deudas directas e indirectas. No editable."
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      class="rounded-lg border-2 p-4 transition-colors"
      :class="rciResumenContenedorClasses(rciNivelDeudor)"
    >
      <p class="text-sm font-semibold">
        Nivel de riesgo RCI (deudor)
      </p>
      <p class="mt-1 text-xs opacity-90">
        Riesgo asumido (RCI) = (Suma de cuotas en entidades financieras + Vr. cuota var.) ÷ Total ingresos (deudor, capacidad de pago). Resultado de todo el análisis de flujo; menor porcentaje indica más holgura frente a las cuotas.
      </p>
      <p class="mt-1 text-xs opacity-90">
        {{ AYUDA_NIVEL_RCI_TRAMOS }}
      </p>
      <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <div class="rounded-md border border-border/60 bg-background/60 px-3 py-2">
          <p class="text-xs font-medium text-muted-foreground">
            Suma cuotas (entidades)
          </p>
          <p class="mt-1 font-mono text-xl font-semibold tabular-nums text-foreground">
            {{ displayPesosCifra(sumaCuotasEntidadesDeudor) }}
          </p>
        </div>
        <div class="rounded-md border border-border/60 bg-background/60 px-3 py-2">
          <p class="text-xs font-medium text-muted-foreground">
            Vr. cuota var.
          </p>
          <p class="mt-1 font-mono text-xl font-semibold tabular-nums text-foreground">
            {{ displayPesosCifra(vrCuotaVarNumDeudor) }}
          </p>
        </div>
        <div class="rounded-md border border-border/60 bg-background/60 px-3 py-2">
          <p class="text-xs font-medium text-muted-foreground">
            Total ingresos (deudor)
          </p>
          <p class="mt-1 font-mono text-xl font-semibold tabular-nums text-foreground">
            {{ displayPesosCifra(totalIngresosDeudorNum) }}
          </p>
        </div>
        <div class="rounded-md border border-border/60 bg-background/80 px-3 py-2">
          <p class="text-xs font-medium opacity-80">
            Riesgo asumido (RCI)
          </p>
          <p
            class="mt-1 font-mono text-2xl font-bold tabular-nums tracking-tight"
          >
            {{ rciPorcentoDeudor != null ? formatRiesgoAsumidoRciPorcentajeVista(rciPorcentoDeudor) : '—' }}
          </p>
        </div>
        <div
          class="rounded-md border-2 px-3 py-2 transition-colors"
          :class="rciNivelDeudor ? rciNivelRiesgoBloqueClasses(rciNivelDeudor) : 'border-border/60 bg-background/60'"
        >
          <p class="text-xs font-medium opacity-90">
            Nivel del riesgo asumido (RCI)
          </p>
          <p class="mt-1 text-2xl font-bold tracking-tight">
            {{ rciNivelDeudor ?? '—' }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style src="@vueform/multiselect/themes/default.css"></style>
<style scoped>
/* Ayuda sin min-height; alineación de inputs: grid items-stretch + h-full + mt-auto en el wrapper del control */
.emg-cred-hint {
  font-size: 0.75rem;
  line-height: 1.3;
  color: var(--muted-foreground);
}
/* Mismo criterio que ApplicantFormFields / DynamicFormRenderer (h-9, borde, fondo) */
.multiselect-municipality {
  --ms-font-size: 0.875rem;
  --ms-line-height: 1.25rem;
  --ms-radius: 0.375rem;
  --ms-border-color: var(--border);
  --ms-bg: var(--background);
  --ms-py: 0.5rem;
  min-height: 2.5rem;
  width: 100%;
  min-width: 0;
}
.multiselect-municipality :deep(.multiselect-single-label-text) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  max-width: 100%;
}
/**
 * Alineado a `Input` h-8 (2rem) junto al campo Cuota; lista teletransportada a body (Popper) para
 * no desconectarse al hacer scroll (append-to-body + close-on-scroll).
 */
.multiselect-entidad-banco {
  --ms-font-size: 0.875rem;
  --ms-line-height: 1.25rem;
  --ms-radius: 0.375rem;
  --ms-border-color: var(--border);
  /* Mismo plano que Input editable (fondo sólido, no heredar tono muted del contenedor) */
  --ms-bg: var(--background);
  --ms-bg-disabled: var(--muted);
  --ms-py: 0.25rem;
  min-height: 2rem;
  width: 100%;
  min-width: 0;
  align-items: center;
}
.multiselect-entidad-banco :deep(.multiselect-wrapper) {
  min-height: 0;
  align-items: center;
}
.multiselect-entidad-banco :deep(.multiselect-search) {
  padding-top: 0.125rem;
  padding-bottom: 0.125rem;
}
.multiselect-entidad-banco :deep(.multiselect-single-label-text) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  max-width: 100%;
  line-height: 1.25rem;
}
/* Teleport a body: debe quedar bajo .app-header (sticky z-10) para no tapar el breadcrumb */
:global(.multiselect-dropdown) {
  z-index: 9;
}
</style>
