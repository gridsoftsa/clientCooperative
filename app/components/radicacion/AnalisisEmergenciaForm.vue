<script setup lang="ts">
import type { Company } from '~/types/company'
import type { EmergenciaCapacidadBloque, EmergenciaCuotaLine, EmergenciaState } from '~/constants/analisis-score-emergencia'
import { EMERGENCIA_FORM_META } from '~/constants/analisis-score-emergencia'
import { cn } from '@/lib/utils'
import Multiselect from '@vueform/multiselect'
import { filterPesosChars, formatPesos, onKeydownPesosOnly, parsePesosInput } from '~/composables/usePesosFormat'
import { formatMontoCopVista, parseMontoCop } from '~/utils/analisis-emergencia-cuota'
import AnalisisEmergenciaGastosRadicacionFields from '~/components/radicacion/AnalisisEmergenciaGastosRadicacionFields.vue'

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
  }>(),
  { lockDeudorFields: true, lockGastosDesdeRadicacion: false, lockVrCuotaVar: false, pctReservaDeudor: 30, pctReservaCodeudor: 10, company: null, loadingCompany: false, codeudores: () => [], opcionesGarantia: () => [] },
)

type FilaCapB1 = { key: 'a' | 'b', label: string, reserva: string, codIdx?: number }
type FilaCapB2 = { key: 'a' | 'b', label: string, codIdx: number }

/** Sólo deudor si no hay codeudores; con 1+ se añade el recuadro del 1.er codeudor. */
const filasCapacidadBloque1 = computed((): FilaCapB1[] => {
  const pd = props.pctReservaDeudor
  const pc = props.pctReservaCodeudor
  const rows: FilaCapB1[] = [
    { key: 'a', label: 'Capacidad de pago deudor', reserva: `(-) ${pd}% ing.` },
  ]
  if (props.codeudores.length >= 1) {
    rows.push({
      key: 'b',
      label: 'Capacidad de pago primer codeudor',
      reserva: `(-) ${pc}% ing.`,
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

const etiquetaReservaCodeudor = computed(
  () => `(-) ${props.pctReservaCodeudor}% ing.`,
)

const deudorReadonlyClass = 'cursor-default bg-muted/50 text-foreground read-only:opacity-100'

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

/** Muestra valor almacenado con el mismo criterio que la radicación (miles, decimales). */
function displayPesosStored(s: string | undefined | null): string {
  if (s == null || !String(s).trim()) {
    return ''
  }
  return formatPesos(parsePesosFlexible(s))
}

/** `ingDisponibles` puede ser negativo (Total ingresos − Total gastos); `displayPesosStored` no conserva el signo. */
function displayPesosIngresosDisponibles(s: string | undefined | null): string {
  if (s == null || !String(s).trim()) {
    return ''
  }
  const t = String(s).trim()
  if (t.startsWith('-')) {
    const cuerpo = displayPesosStored(t.slice(1).trim())
    return cuerpo ? `-${cuerpo}` : ''
  }
  return displayPesosStored(t)
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

watch(
  () => [
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
  },
  { flush: 'post', immediate: true },
)

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
</script>

<template>
  <div class="space-y-6">
    <div class="rounded-lg border bg-card p-4 text-center text-sm">
      <p class="text-base font-bold leading-snug">
        {{ EMERGENCIA_FORM_META.titulo }}
      </p>
      <div class="mt-2 flex flex-wrap justify-center gap-x-6 gap-y-1 text-muted-foreground">
        <span>Código: <span class="font-mono text-foreground">{{ state.encabezado.codigoFormulario || EMERGENCIA_FORM_META.codigo }}</span></span>
        <span>Versión: <span class="font-mono text-foreground">{{ state.encabezado.version || EMERGENCIA_FORM_META.version }}</span></span>
        <span>
          NIT:
          <span class="font-mono text-foreground">
            <template v-if="loadingCompany">…</template>
            <template v-else>{{ (company && company.nit && company.nit.trim()) || '—' }}</template>
          </span>
        </span>
      </div>
      <p class="mt-2 text-sm font-semibold text-foreground">
        {{ state.encabezado.entidad || EMERGENCIA_FORM_META.entidadLinea }}
      </p>
      <div class="mx-auto mt-3 max-w-md">
        <div class="space-y-1 text-left">
          <Label for="emg-fa">Fecha actualización (formato)</Label>
          <Input id="emg-fa" v-model="state.encabezado.fechaActualizacion" class="w-full" placeholder="DD/MM/AAAA" />
        </div>
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
            :readonly="lockDeudorFields"
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
            :readonly="lockDeudorFields"
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
            :readonly="lockDeudorFields"
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
        <div class="emg-cred-field flex h-full min-h-0 min-w-0 flex-col">
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
            />
          </div>
        </div>
        <div class="emg-cred-field flex h-full min-h-0 min-w-0 flex-col">
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
            />
          </div>
        </div>
        <div class="emg-cred-field flex h-full min-h-0 min-w-0 flex-col">
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
              @update:model-value="(v: unknown) => { state.credito.garantia = (v != null && v !== '') ? String(v) : '' }"
            />
          </div>
        </div>
        <div class="emg-cred-field flex h-full min-h-0 min-w-0 flex-col">
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
              :readonly="lockVrCuotaVar"
              :class="cn(lockVrCuotaVar && deudorReadonlyClass)"
              :tabindex="lockVrCuotaVar ? -1 : undefined"
              placeholder="Ej. $ 5.200.000,00"
              @blur="onBlurVrCuotaVar"
            />
          </div>
        </div>
        <div class="emg-cred-field flex h-full min-h-0 min-w-0 flex-col">
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
        <div class="flex min-h-0 flex-col gap-1 md:col-span-3">
          <Label for="emg-cg" class="text-sm font-medium">Observación garantía (texto largo en plantilla)</Label>
          <Input id="emg-cg" v-model="state.credito.comentarioGarantia" />
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
              <div>
                <Label :for="`c1-${sideIdx}-ing`" class="text-xs">Ingresos</Label>
                <Input
                  :id="`c1-${sideIdx}-ing`"
                  :model-value="displayPesosStored(state.capacidadBloque1[side.key].ingresos)"
                  type="text"
                  inputmode="decimal"
                  class="h-8 w-full text-right font-mono"
                  readonly
                  :class="deudorReadonlyClass"
                  :tabindex="-1"
                  title="Valor tomado del paso 3 (Datos financieros) de la radicación. No editable."
                />
              </div>
              <div>
                <Label :for="`c1-${sideIdx}-oing`" class="text-xs">Otros ingresos</Label>
                <Input
                  :id="`c1-${sideIdx}-oing`"
                  :model-value="displayPesosStored(state.capacidadBloque1[side.key].otrosIngresos)"
                  type="text"
                  inputmode="decimal"
                  class="h-8 w-full text-right font-mono"
                  placeholder="0"
                  @keydown="onKeydownPesosOnly"
                  @update:model-value="onOtrosIngresosModelUpdate(state.capacidadBloque1[side.key], $event != null ? String($event) : '')"
                />
              </div>
            </div>
            <div>
              <Label :for="`c1-${sideIdx}-ti`" class="text-xs">Total ingresos</Label>
              <Input
                :id="`c1-${sideIdx}-ti`"
                :model-value="displayPesosStored(state.capacidadBloque1[side.key].totalIngresos)"
                type="text"
                inputmode="decimal"
                class="h-8 w-full text-right font-mono"
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
                      class="h-8 w-full bg-background text-right font-mono"
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
            <div>
              <Label class="text-xs">Ingresos disponibles</Label>
              <Input
                :model-value="displayPesosIngresosDisponibles(state.capacidadBloque1[side.key].ingDisponibles)"
                type="text"
                inputmode="decimal"
                class="h-8 w-full text-right font-mono"
                readonly
                :class="deudorReadonlyClass"
                :tabindex="-1"
                title="Total ingresos − Total gastos. No editable."
              />
            </div>
            <div>
              <Label class="text-xs">{{ side.reserva }}</Label>
              <Input
                :model-value="displayPesosIngresosDisponibles(state.capacidadBloque1[side.key].reservaSobreIngreso)"
                type="text"
                inputmode="decimal"
                class="h-8 w-full text-right font-mono"
                readonly
                :class="deudorReadonlyClass"
                :tabindex="-1"
                :title="side.key === 'a' ? `Ingresos disponibles × ${props.pctReservaDeudor}% (ING). No editable.` : `Ingresos disponibles × ${props.pctReservaCodeudor}% (ING). No editable.`"
              />
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <Label class="text-xs">Valor cuota</Label>
                <Input v-model="state.capacidadBloque1[side.key].valorCuota" class="h-8 font-mono" />
              </div>
              <div>
                <Label class="text-xs">Saldo</Label>
                <Input v-model="state.capacidadBloque1[side.key].saldo" class="h-8 font-mono" />
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
              <div>
                <Label :for="`c2-${sideIdx}-ing`" class="text-xs">Ingresos</Label>
                <Input
                  :id="`c2-${sideIdx}-ing`"
                  :model-value="displayPesosStored(state.capacidadBloque2[side.key].ingresos)"
                  type="text"
                  inputmode="decimal"
                  class="h-8 w-full text-right font-mono"
                  readonly
                  :class="deudorReadonlyClass"
                  :tabindex="-1"
                  title="Valor tomado del paso 3 (Datos financieros) de la radicación. No editable."
                />
              </div>
              <div>
                <Label :for="`c2-${sideIdx}-oing`" class="text-xs">Otros ingresos</Label>
                <Input
                  :id="`c2-${sideIdx}-oing`"
                  :model-value="displayPesosStored(state.capacidadBloque2[side.key].otrosIngresos)"
                  type="text"
                  inputmode="decimal"
                  class="h-8 w-full text-right font-mono"
                  placeholder="0"
                  @keydown="onKeydownPesosOnly"
                  @update:model-value="onOtrosIngresosModelUpdate(state.capacidadBloque2[side.key], $event != null ? String($event) : '')"
                />
              </div>
            </div>
            <div>
              <Label class="text-xs">Total ingresos</Label>
              <Input
                :model-value="displayPesosStored(state.capacidadBloque2[side.key].totalIngresos)"
                type="text"
                inputmode="decimal"
                class="h-8 w-full text-right font-mono"
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
                      class="h-8 w-full bg-background text-right font-mono"
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
            <div>
              <Label class="text-xs">Ingresos disponibles</Label>
              <Input
                :model-value="displayPesosIngresosDisponibles(state.capacidadBloque2[side.key].ingDisponibles)"
                type="text"
                inputmode="decimal"
                class="h-8 w-full text-right font-mono"
                readonly
                :class="deudorReadonlyClass"
                :tabindex="-1"
                title="Total ingresos − Total gastos. No editable."
              />
            </div>
            <div>
              <Label class="text-xs">{{ etiquetaReservaCodeudor }}</Label>
              <Input
                :model-value="displayPesosIngresosDisponibles(state.capacidadBloque2[side.key].reservaSobreIngreso)"
                type="text"
                inputmode="decimal"
                class="h-8 w-full text-right font-mono"
                readonly
                :class="deudorReadonlyClass"
                :tabindex="-1"
                :title="`Ingresos disponibles × ${props.pctReservaCodeudor}% (ING). No editable.`"
              />
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <Label class="text-xs">Valor cuota</Label>
                <Input v-model="state.capacidadBloque2[side.key].valorCuota" class="h-8 font-mono" />
              </div>
              <div>
                <Label class="text-xs">Saldo</Label>
                <Input v-model="state.capacidadBloque2[side.key].saldo" class="h-8 font-mono" />
              </div>
            </div>
          </div>
        </div>
        </div>
      </template>
    </div>

    <div class="rounded-md border p-4">
      <h3 class="mb-3 text-sm font-bold uppercase text-foreground">
        Activos
      </h3>
      <div
        v-for="(k, i) in [
          { key: 'deudor' as const, t: 'Deudor principal' },
          { key: 'codeudor1' as const, t: 'Codeudor 1' },
          { key: 'codeudor2' as const, t: 'Codeudor 2' },
          { key: 'codeudor3' as const, t: 'Codeudor 3' },
        ]"
        :key="k.key"
        class="mb-4 last:mb-0"
      >
        <p class="mb-2 text-xs font-semibold text-muted-foreground">
          {{ k.t }}
        </p>
        <div class="grid gap-2 sm:grid-cols-3">
          <div>
            <Label :for="`ac-br-${i}`" class="text-xs">Bienes raíces</Label>
            <Input :id="`ac-br-${i}`" v-model="state.activos[k.key].bienesRaices" class="h-8 font-mono" />
          </div>
          <div>
            <Label :for="`ac-ot-d-${i}`" class="text-xs">Otros bienes (detalle)</Label>
            <Input :id="`ac-ot-d-${i}`" v-model="state.activos[k.key].otrosBienesDetalle" class="h-8" />
          </div>
          <div>
            <Label :for="`ac-ot-v-${i}`" class="text-xs">Otros bienes (valor)</Label>
            <Input :id="`ac-ot-v-${i}`" v-model="state.activos[k.key].otrosBienesValor" class="h-8 font-mono" />
          </div>
        </div>
      </div>
      <div class="pt-2">
        <Label for="ac-tot" class="text-xs font-bold">Total activos</Label>
        <Input id="ac-tot" v-model="state.activos.totalActivos" class="mt-1 max-w-md font-mono" />
      </div>
    </div>

    <div class="rounded-md border p-4">
      <h3 class="mb-3 text-sm font-bold uppercase text-foreground">
        Resultado consulta central de riesgos
      </h3>
      <div class="space-y-3">
        <div
          v-for="row in [
            { f: 'calificacion' as const, l: 'Calificación' },
            { f: 'deudasDirectas' as const, l: 'Deudas directas' },
            { f: 'deudasIndirectas' as const, l: 'Deudas indirectas' },
            { f: 'totalEndeudamiento' as const, l: 'Total endeudamiento' },
          ]"
          :key="row.f"
        >
          <p class="mb-1 text-xs font-medium text-muted-foreground">
            {{ row.l }}
          </p>
          <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div
              v-for="col in [
                { k: 'deudor' as const, t: 'Deudor' },
                { k: 'codeudor1' as const, t: 'C.1' },
                { k: 'codeudor2' as const, t: 'C.2' },
                { k: 'codeudor3' as const, t: 'C.3' },
              ]"
              :key="col.k"
            >
              <Label class="text-xs">{{ col.t }}</Label>
              <Input v-model="state.centralRiesgos[row.f][col.k]" class="h-8 font-mono" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="rounded-md border p-4">
      <h3 class="mb-3 text-sm font-bold uppercase text-foreground">
        Nivel de riesgo RCI y perfil
      </h3>
      <div class="grid gap-3 sm:grid-cols-2">
        <div>
          <Label for="n-rci" class="text-xs">Riesgo asumido (RCI)</Label>
          <Input id="n-rci" v-model="state.nivel.riesgoAsumidoRci" class="mt-1 font-mono" />
        </div>
        <div>
          <Label for="n-nra" class="text-xs">Nivel de riesgo asumido (RCI)</Label>
          <Input id="n-nra" v-model="state.nivel.nivelRiesgoAsumido" class="mt-1" />
        </div>
        <div>
          <Label for="n-ps" class="text-xs">Puntaje score</Label>
          <Input id="n-ps" v-model="state.nivel.puntajeScore" class="mt-1 font-mono" />
        </div>
        <div>
          <Label for="n-pd" class="text-xs">Nivel de riesgo perfil deudor (score)</Label>
          <Input id="n-pd" v-model="state.nivel.nivelRiesgoPerfilDeudor" class="mt-1" />
        </div>
      </div>
    </div>

    <div class="rounded-md border p-4">
      <h3 class="mb-2 text-sm font-bold uppercase text-foreground">
        Firma análisis
      </h3>
      <div>
        <Label for="emg-ase">Nombre (asesor / quien consigna en plantilla)</Label>
        <Input id="emg-ase" v-model="state.asesorNombre" class="mt-1" />
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
