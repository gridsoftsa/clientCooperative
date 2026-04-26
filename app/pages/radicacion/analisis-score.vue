<script setup lang="ts">
import { toast } from 'vue-sonner'
import AnalisisEmergenciaForm from '~/components/radicacion/AnalisisEmergenciaForm.vue'
import AnalisisScoreImprimirPanel from '~/components/radicacion/AnalisisScoreImprimirPanel.vue'
import {
  defaultEmergenciaState,
  mergeEmergenciaFromSnapshot,
} from '~/constants/analisis-score-emergencia'
import type { EmergenciaState } from '~/constants/analisis-score-emergencia'
import type { ImprimirVariableRow } from '~/constants/analisis-score-imprimir'
import {
  IMPRIMIR_EMPLEADO_META,
  IMPRIMIR_EMPLEADO_VARIABLES,
  IMPRIMIR_INDEPENDIENTE_META,
  IMPRIMIR_INDEPENDIENTE_VARIABLES,
} from '~/constants/analisis-score-imprimir'
import {
  EMPLEADO_PENSIONADO_MATRIX,
  INDEPENDIENTE_MATRIX,
  type ScoreMatrixLine,
} from '~/constants/analisis-score-matrix'
import type { AnalisisScorePerfilValue } from '~/constants/analisis-score'
import {
  actualizarVrCuotaVarDesdeInputs,
  formatMontoCopVista,
  tasaEfectivaPorcentajeDesdeNominal,
} from '~/utils/analisis-emergencia-cuota'
import {
  descripcionErroresAdicionales,
  validarCreditoEmergenciaCompleto,
  validarTipoValorCuotaPaso1,
} from '~/utils/analisis-emergencia-validacion'
import { caracteristicasGarantiaDesdeMatrix } from '~/utils/analisis-score-matrix-options'
import { isScoreMatrixLinesRenderable, normalizeScoreMatrixLines } from '~/utils/score-matrix-weights'
import {
  classifyNivelRiesgo,
  classifyPuntajeTotalIFS,
  sumImprimirPuntajesPorSeccion,
} from '~/utils/analisis-score-imprimir-totals'
import { totalIngresosRadicacionFormatted } from '~/utils/radicacion-financial-totals'
import { aplicarEgresosCapacidadBloqueDesdeFinancialInfo } from '~/utils/radicacion-financial-egresos'
import type { Company } from '~/types/company'

const { fetchFlatData } = useTemplateFlatData()

type ScoreMatricesApiResponse = {
  data: Record<string, { lines?: ScoreMatrixLine[] } | null>
}

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: ['radicacion_crear', 'radicacion_editar', 'radicacion_ver'],
})

const route = useRoute()
const router = useRouter()
const { hasPermission, hasAnyPermission } = usePermissions()
const { $api } = useNuxtApp()
const { downloadAnalisisScorePdf } = useDocumentDownload()

const solicitudId = computed(() => {
  const q = route.query.solicitud
  if (typeof q === 'string' && q.trim()) return q.trim()
  return null
})

const scoreCabecera = ref({
  fecha: '',
  cedula: '',
  nombre: '',
})

const observacionesScore = ref('')

const emergenciaState = ref(defaultEmergenciaState())

function sincronizarTasaEfectivaDesdeNominal(): void {
  const c = emergenciaState.value.credito
  c.tasaEfectiva = tasaEfectivaPorcentajeDesdeNominal(c.tasaNominal)
}

/** Fórmula de Vr. cuota var. (paso 2) según Tipo de Valor de cuota (paso 1) y tasa, plazo, monto. */
function sincronizarVrCuotaVarFormula(): void {
  const c = emergenciaState.value.credito
  if (c.tipoValorCuota !== 'Corriente' && c.tipoValorCuota !== 'Emergencia') {
    return
  }
  c.vrCuotaVar = actualizarVrCuotaVarDesdeInputs({
    tipoValorCuota: c.tipoValorCuota,
    vrCredito: c.vrCredito,
    plazoMeses: c.plazoMeses,
    tasaNominal: c.tasaNominal,
  })
}

/** Codeudores de la radicación (misma fuente que entrevista / solicitud). Solo lectura en paso 2. */
const codeudoresDeSolicitud = ref<{ nombre: string, cedula: string }[]>([])

/** % ING desde parametrización (template `ing`); reserva = ingresos disponibles × %/100. */
const pctIngDeudor = ref(30)
const pctIngCodeudor = ref(10)

function parsePctIngresoParam(v: unknown, fallback: number): number {
  if (typeof v === 'number' && Number.isFinite(v) && v >= 0) {
    return v
  }
  if (typeof v === 'string' && v.trim()) {
    const n = Number(v.replace(/\s/g, '').replace(',', '.'))
    if (Number.isFinite(n) && n >= 0) {
      return n
    }
  }
  return fallback
}

async function fetchIngParametrizacion(): Promise<void> {
  const d = await fetchFlatData('ing')
  pctIngDeudor.value = parsePctIngresoParam(d.pct_deudor, 30)
  pctIngCodeudor.value = parsePctIngresoParam(d.pct_codeudor, 10)
}

const companyPrincipal = ref<Company | null>(null)
const loadingCompany = ref(false)

const loadingSolicitud = ref(false)
/** Hay filas guardadas en servidor (`analisis_score_snapshot`) para generar PDF. */
const tieneAnalisisScoreGuardado = ref(false)
const descargandoScorePdf = ref(false)

const scoreLinesIndep = ref<ScoreMatrixLine[]>(normalizeScoreMatrixLines(INDEPENDIENTE_MATRIX))
const scoreLinesEmp = ref<ScoreMatrixLine[]>(normalizeScoreMatrixLines(EMPLEADO_PENSIONADO_MATRIX))

async function fetchScoreMatrices(): Promise<void> {
  try {
    const res = await $api('/score-template-matrices') as ScoreMatricesApiResponse
    const d = res.data
    if (d.independiente?.lines?.length) {
      const normalized = normalizeScoreMatrixLines(d.independiente.lines)
      if (isScoreMatrixLinesRenderable(normalized)) {
        scoreLinesIndep.value = normalized
      }
    }
    if (d.empleado_pensionado?.lines?.length) {
      const normalized = normalizeScoreMatrixLines(d.empleado_pensionado.lines)
      if (isScoreMatrixLinesRenderable(normalized)) {
        scoreLinesEmp.value = normalized
      }
    }
  } catch {
    // Se mantienen los valores normalizados por defecto (misma base que score-template).
  }
}

async function fetchCompanyPrincipal(): Promise<void> {
  loadingCompany.value = true
  try {
    const res = await $api<{ data: Company }>('/company')
    companyPrincipal.value = res.data
  }
  catch {
    companyPrincipal.value = null
  }
  finally {
    loadingCompany.value = false
  }
}

/** Alinea deudor / documento / fecha del paso 2 con la cabecera de SCORE (misma que la solicitud en paso 3). */
function aplicarCabeceraALineaEmergenciaDeudor(): void {
  const c = scoreCabecera.value
  emergenciaState.value.deudorCodeudor.deudor = c.nombre
  emergenciaState.value.deudorCodeudor.documento = c.cedula
  emergenciaState.value.deudorCodeudor.fechaAnalisis = c.fecha
}

function formatFechaRadicacion(createdAt: unknown): string {
  if (createdAt == null || createdAt === '') {
    return new Date().toLocaleDateString('es-CO')
  }
  const d = new Date(String(createdAt))
  if (Number.isNaN(d.getTime())) {
    return new Date().toLocaleDateString('es-CO')
  }
  return d.toLocaleDateString('es-CO')
}

function pickStr(row: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k]
    if (typeof v === 'string' && v.trim()) {
      return v
    }
  }
  return ''
}

function debtorDisplayName(debtor: Record<string, unknown>): string {
  const parts = [
    pickStr(debtor, 'first_name', 'firstName'),
    pickStr(debtor, 'second_name', 'secondName'),
    pickStr(debtor, 'first_last_name', 'firstLastName'),
    pickStr(debtor, 'second_last_name', 'secondLastName'),
  ].filter((p) => p.length > 0)
  return parts.join(' ').trim()
}

function cedulaDesdeSolicitante(row: Record<string, unknown>): string {
  const docType = pickStr(row, 'document_type', 'documentType')
  const numRaw = row.document_number ?? row.documentNumber
  const docNum = numRaw != null ? String(numRaw).trim() : ''
  return [docType, docNum].filter(Boolean).join(' ').trim()
}

/** Lista de filas de codeudor desde el JSON de la solicitud (soporta anidado `applicant` y clave `coDebtors`). */
function pickCoDebtorRowsFromSolicitudData(data: Record<string, unknown>): Record<string, unknown>[] {
  const a = data.co_debtors
  const b = (data as { coDebtors?: unknown }).coDebtors
  const fromA = Array.isArray(a) ? a : []
  const fromB = Array.isArray(b) ? b : []
  const raw = fromA.length > 0 ? fromA : fromB
  return raw
    .map((row): Record<string, unknown> | null => {
      if (row == null || typeof row !== 'object') {
        return null
      }
      const r = row as Record<string, unknown>
      const ap = r.applicant
      if (ap && typeof ap === 'object' && ap !== null) {
        return { ...r, ...(ap as Record<string, unknown>) }
      }
      return r
    })
    .filter((r): r is Record<string, unknown> => r != null)
}

function buildCodeudoresDesdeCoDebtors(coRows: unknown): { nombre: string, cedula: string }[] {
  if (!Array.isArray(coRows) || coRows.length === 0) {
    return []
  }
  return coRows
    .filter((r): r is Record<string, unknown> => r !== null && typeof r === 'object')
    .map((row) => ({
      nombre: debtorDisplayName(row),
      cedula: cedulaDesdeSolicitante(row),
    }))
}

/**
 * Monto solicitado y plazo (meses) desde el paso «Datos de la solicitud» de radicación.
 * Siempre prioriza la solicitud viva sobre un snapshot de emergencia previo.
 */
/**
 * Campo «Ingresos» en capacidad de pago = mismo total que el paso 3 (Datos financieros)
 * de radicación (deudor y cada codeudor). Siempre la solicitud actual, no un snapshot.
 */
function aplicarIngresosCapacidadDesdeRadicacion(data: Record<string, unknown>): void {
  const e = emergenciaState.value
  const debtor = data.debtor as Record<string, unknown> | null | undefined
  e.capacidadBloque1.a.ingresos = totalIngresosRadicacionFormatted(debtor?.financial_info ?? null)
  const co = pickCoDebtorRowsFromSolicitudData(data)
  e.capacidadBloque1.b.ingresos = co[0] ? totalIngresosRadicacionFormatted(co[0].financial_info) : ''
  e.capacidadBloque2.a.ingresos = co[1] ? totalIngresosRadicacionFormatted(co[1].financial_info) : ''
  e.capacidadBloque2.b.ingresos = co[2] ? totalIngresosRadicacionFormatted(co[2].financial_info) : ''
}

/**
 * Egresos / descripción de gastos: mismo desglose que el paso 3 (tabla de gastos) de radicación.
 * Prioriza la solicitud actual, no un snapshot.
 */
function aplicarEgresosCapacidadDesdeRadicacion(data: Record<string, unknown>): void {
  const e = emergenciaState.value
  const debtor = data.debtor as Record<string, unknown> | null | undefined
  aplicarEgresosCapacidadBloqueDesdeFinancialInfo(e.capacidadBloque1.a, debtor?.financial_info ?? null)
  const co = pickCoDebtorRowsFromSolicitudData(data)
  aplicarEgresosCapacidadBloqueDesdeFinancialInfo(e.capacidadBloque1.b, co[0]?.financial_info ?? null)
  aplicarEgresosCapacidadBloqueDesdeFinancialInfo(e.capacidadBloque2.a, co[1]?.financial_info ?? null)
  aplicarEgresosCapacidadBloqueDesdeFinancialInfo(e.capacidadBloque2.b, co[2]?.financial_info ?? null)
}

function aplicarMontoYPlazoCreditoDesdeSolicitud(data: Record<string, unknown>): void {
  const rawAmount = data.amount_requested
  if (rawAmount == null || rawAmount === '') {
    emergenciaState.value.credito.vrCredito = ''
  }
  else {
    const n = Number(rawAmount)
    emergenciaState.value.credito.vrCredito = Number.isFinite(n)
      ? formatMontoCopVista(n)
      : String(rawAmount)
  }
  const t = data.term_months
  emergenciaState.value.credito.plazoMeses = t != null && t !== '' ? String(t) : ''
}

function cloneImprimirRows(rows: ImprimirVariableRow[]): ImprimirVariableRow[] {
  return rows.map(r => ({ ...r }))
}

function mergeRowsFromSnapshot(
  defaults: ImprimirVariableRow[],
  saved: unknown,
): ImprimirVariableRow[] {
  if (!Array.isArray(saved) || saved.length === 0) {
    return cloneImprimirRows(defaults)
  }
  const byVar = new Map(
    saved
      .filter((r): r is Record<string, unknown> => r !== null && typeof r === 'object')
      .map(r => [String(r.variable ?? '').trim(), r]),
  )
  return defaults.map((def) => {
    const s = byVar.get(def.variable.trim())
    if (!s) {
      return { ...def }
    }

    return {
      variable: def.variable,
      caracteristica: typeof s.caracteristica === 'string' ? s.caracteristica : '',
      puntaje: typeof s.puntaje === 'string' ? s.puntaje : '',
    }
  })
}

function isPerfilDeudor(v: unknown): v is AnalisisScorePerfilValue {
  return v === 'independiente' || v === 'empleado' || v === 'pensionado'
}

/** Un solo perfil: define qué hoja de impresión SCORE se muestra (paso 3). */
const perfilDeudor = ref<AnalisisScorePerfilValue | undefined>(undefined)

const currentStep = ref(1)
const maxStep = 3

const variableRowsForIndep = ref<ImprimirVariableRow[]>(cloneImprimirRows(IMPRIMIR_INDEPENDIENTE_VARIABLES))
const variableRowsForEmp = ref<ImprimirVariableRow[]>(cloneImprimirRows(IMPRIMIR_EMPLEADO_VARIABLES))

const opcionesGarantia = computed(() => {
  const p = perfilDeudor.value
  if (p == null) {
    return [] as string[]
  }
  const lines = p === 'independiente' ? scoreLinesIndep.value : scoreLinesEmp.value
  return caracteristicasGarantiaDesdeMatrix(lines)
})

type CreditoEmergenciaExt = EmergenciaState['credito'] & { garantiaSelecciones?: string[] }

/**
 * Una sola opción (Cualitativas → Garantía). Migra snapshot con varias opciones o `garantia` con «·»; borra clave legada.
 */
function sincronizarGarantiaConPlantilla(): void {
  const c = emergenciaState.value.credito as CreditoEmergenciaExt
  const p = perfilDeudor.value
  if (p == null) {
    c.garantia = ''
    if (c.garantiaSelecciones) {
      delete c.garantiaSelecciones
    }
    return
  }
  const lines = p === 'independiente' ? scoreLinesIndep.value : scoreLinesEmp.value
  const opts = caracteristicasGarantiaDesdeMatrix(lines)
  const valid = new Set(opts)
  const g = (c.garantia || '').trim()
  const legacy = Array.isArray(c.garantiaSelecciones) ? c.garantiaSelecciones : []
  let next = ''
  if (g && valid.has(g)) {
    next = g
  }
  else if (legacy.length) {
    const first = legacy.find(s => valid.has(s))
    if (first) {
      next = first
    }
  }
  if (!next && g) {
    const byNl = g.split('\n').map(s => s.trim()).filter(s => s.length > 0)
    const byDot = g.includes('·') ? g.split(/\s*·\s*/).map(s => s.trim()).filter(s => s.length > 0) : []
    const candidates
      = byNl.length > 1 ? byNl
        : (byDot.length > 0 ? byDot : (byNl.length === 1 ? byNl : [g]))
    const hit = candidates.find(s => valid.has(s))
    if (hit) {
      next = hit
    }
  }
  c.garantia = next
  if (c.garantiaSelecciones) {
    delete c.garantiaSelecciones
  }
}

onMounted(() => {
  fetchScoreMatrices()
  fetchCompanyPrincipal()
  void fetchIngParametrizacion()
})

watch(companyPrincipal, (co) => {
  const nit = co?.nit?.trim()
  if (nit) {
    emergenciaState.value.encabezado.nit = nit
  }
})

watch(
  () => [currentStep.value, scoreCabecera.value] as const,
  () => {
    if (currentStep.value === 2) {
      aplicarCabeceraALineaEmergenciaDeudor()
    }
  },
  { deep: true },
)

watch(
  [perfilDeudor, scoreLinesIndep, scoreLinesEmp],
  () => {
    sincronizarGarantiaConPlantilla()
  },
  { deep: true, immediate: true },
)

watch(
  () => [
    emergenciaState.value.credito.tipoValorCuota,
    emergenciaState.value.credito.vrCredito,
    emergenciaState.value.credito.plazoMeses,
    emergenciaState.value.credito.tasaNominal,
  ],
  () => {
    sincronizarTasaEfectivaDesdeNominal()
    sincronizarVrCuotaVarFormula()
  },
  { deep: true, immediate: true },
)

const isVrCuotaVarBloqueada = computed(
  () =>
    emergenciaState.value.credito.tipoValorCuota === 'Corriente'
    || emergenciaState.value.credito.tipoValorCuota === 'Emergencia',
)

async function loadSolicitudParaAnalisis(id: string): Promise<void> {
  loadingSolicitud.value = true
  try {
    const res = await $api<{ data?: Record<string, unknown> } & Record<string, unknown>>(`/credit-applications/${id}`)
    const data = (res?.data ?? res) as Record<string, unknown>
    const snap = data.analisis_score_snapshot as Record<string, unknown> | null | undefined

    let cabeceraDesdeSnap = false
    if (snap && typeof snap === 'object' && snap.cabecera && typeof snap.cabecera === 'object') {
      const c = snap.cabecera as Record<string, unknown>
      scoreCabecera.value = {
        fecha: String(c.fecha ?? ''),
        cedula: String(c.cedula ?? ''),
        nombre: String(c.nombre ?? ''),
      }
      cabeceraDesdeSnap = true
    }

    if (!cabeceraDesdeSnap) {
      const debtor = data.debtor as Record<string, unknown> | null | undefined
      if (debtor && typeof debtor === 'object') {
        const docType = typeof debtor.document_type === 'string' ? debtor.document_type.trim() : ''
        const docNum = debtor.document_number != null ? String(debtor.document_number).trim() : ''
        const cedula = [docType, docNum].filter(Boolean).join(' ').trim()
        scoreCabecera.value = {
          fecha: formatFechaRadicacion(data.created_at),
          cedula,
          nombre: debtorDisplayName(debtor),
        }
      } else {
        scoreCabecera.value = { fecha: formatFechaRadicacion(data.created_at), cedula: '', nombre: '' }
      }
    }

    if (snap && typeof snap === 'object' && isPerfilDeudor(snap.perfil_deudor)) {
      perfilDeudor.value = snap.perfil_deudor
    }

    emergenciaState.value = mergeEmergenciaFromSnapshot(
      snap && typeof snap === 'object' ? (snap as { emergencia?: unknown }).emergencia : undefined,
    )

    variableRowsForIndep.value = mergeRowsFromSnapshot(
      IMPRIMIR_INDEPENDIENTE_VARIABLES,
      snap?.variant === 'independiente' ? snap.variable_rows : null,
    )
    variableRowsForEmp.value = mergeRowsFromSnapshot(
      IMPRIMIR_EMPLEADO_VARIABLES,
      snap?.variant === 'empleado' ? snap.variable_rows : null,
    )

    observacionesScore.value
      = snap && typeof snap === 'object' && typeof snap.observaciones === 'string'
        ? snap.observaciones
        : ''

    tieneAnalisisScoreGuardado.value = Boolean(
      snap
      && typeof snap === 'object'
      && Array.isArray(snap.variable_rows)
      && snap.variable_rows.length > 0,
    )

    const dPre = data.debtor as Record<string, unknown> | null | undefined
    if (dPre && typeof dPre === 'object') {
      if (!emergenciaState.value.deudorCodeudor.deudor.trim()) {
        emergenciaState.value.deudorCodeudor.deudor = debtorDisplayName(dPre)
      }
      if (!emergenciaState.value.deudorCodeudor.documento.trim()) {
        emergenciaState.value.deudorCodeudor.documento = cedulaDesdeSolicitante(dPre)
      }
    }
    const co = pickCoDebtorRowsFromSolicitudData(data)
    codeudoresDeSolicitud.value = buildCodeudoresDesdeCoDebtors(co)
    if (codeudoresDeSolicitud.value.length > 0) {
      const primero = codeudoresDeSolicitud.value[0]
      if (primero) {
        emergenciaState.value.deudorCodeudor.codeudor = primero.nombre
      }
    }
    if (!emergenciaState.value.deudorCodeudor.fechaAnalisis.trim() && scoreCabecera.value.fecha) {
      emergenciaState.value.deudorCodeudor.fechaAnalisis = scoreCabecera.value.fecha
    }
    aplicarMontoYPlazoCreditoDesdeSolicitud(data)
    aplicarIngresosCapacidadDesdeRadicacion(data)
    aplicarEgresosCapacidadDesdeRadicacion(data)
    aplicarCabeceraALineaEmergenciaDeudor()
    sincronizarGarantiaConPlantilla()
    sincronizarTasaEfectivaDesdeNominal()
    sincronizarVrCuotaVarFormula()
  } catch (e) {
    console.error('Error cargando solicitud para SCORE:', e)
    scoreCabecera.value = { fecha: '', cedula: '', nombre: '' }
    variableRowsForIndep.value = cloneImprimirRows(IMPRIMIR_INDEPENDIENTE_VARIABLES)
    variableRowsForEmp.value = cloneImprimirRows(IMPRIMIR_EMPLEADO_VARIABLES)
    observacionesScore.value = ''
    tieneAnalisisScoreGuardado.value = false
    emergenciaState.value = defaultEmergenciaState()
    codeudoresDeSolicitud.value = []
  } finally {
    loadingSolicitud.value = false
  }
}

watch(
  solicitudId,
  (id) => {
    if (!id) {
      scoreCabecera.value = { fecha: '', cedula: '', nombre: '' }
      observacionesScore.value = ''
      variableRowsForIndep.value = cloneImprimirRows(IMPRIMIR_INDEPENDIENTE_VARIABLES)
      variableRowsForEmp.value = cloneImprimirRows(IMPRIMIR_EMPLEADO_VARIABLES)
      perfilDeudor.value = undefined
      currentStep.value = 1
      tieneAnalisisScoreGuardado.value = false
      emergenciaState.value = defaultEmergenciaState()
      codeudoresDeSolicitud.value = []
      return
    }
    loadSolicitudParaAnalisis(id)
  },
  { immediate: true },
)

/** Vista de impresión según perfil: empleado y pensionado comparten la misma plantilla. */
const vistaImprimirScore = computed<'independiente' | 'empleado' | null>(() => {
  const p = perfilDeudor.value
  if (p == null) {
    return null
  }
  if (p === 'independiente') {
    return 'independiente'
  }
  return 'empleado'
})

const stepsScore = [
  { num: 1, title: 'Perfil del deudor' },
  { num: 2, title: 'Análisis' },
  { num: 3, title: 'Hoja SCORE' },
] as const

const activeStepMeta = computed(() => {
  if (currentStep.value === 1) {
    return {
      title: 'Perfil del deudor',
      description:
        'Elige el perfil del deudor (independiente, empleado o pensionado). El análisis de capacidad de pago (hoja EMERGENCIA) y la hoja SCORE siguen en los pasos 2 y 3. Las matrices de SCORE se configuran en Configuración → Plantilla Score.',
    }
  }
  if (currentStep.value === 2) {
    return {
      title: 'Análisis',
      description: '',
    }
  }
  if (vistaImprimirScore.value === 'independiente') {
    return {
      title: 'IMPRIMIR INDEPENDIENTE',
      description:
        'Hoja Excel IMPRIMIR INDEPENDIENTE — Formato AIR-SARC-FO-02.',
    }
  }
  if (vistaImprimirScore.value === 'empleado') {
    return {
      title: 'IMPRIMIR EMPLEADO - PENSIONADO',
      description:
        'Hoja Excel IMPRIMIR EMPLEADO -PENSIONADO — Formato AIR-SARC-FO-03.',
    }
  }
  return {
    title: 'Hoja SCORE',
    description: 'Selecciona un perfil en el paso 1 para ver el formulario de puntajes.',
  }
})

function goToStep(num: number): void {
  if (num === 1) {
    currentStep.value = 1
    return
  }
  if (perfilDeudor.value == null) {
    toast.error('Primero elige un perfil del deudor en el paso 1.')
    return
  }
  if (num === 3) {
    const v = validarCreditoEmergenciaCompleto(emergenciaState.value.credito)
    if (!v.ok) {
      toast.error(
        v.errores[0] ?? 'Complete la hoja de análisis (paso 2) para abrir el SCORE.',
        { description: descripcionErroresAdicionales(v.errores) },
      )
      return
    }
  }
  if (num >= 2) {
    currentStep.value = num
  }
}

function nextStep(): void {
  if (currentStep.value === 1) {
    if (perfilDeudor.value == null) {
      toast.error('Selecciona un perfil del deudor para continuar.')
      return
    }
    const t = validarTipoValorCuotaPaso1(emergenciaState.value.credito.tipoValorCuota)
    if (!t.ok) {
      toast.error(t.mensaje)
      return
    }
    currentStep.value = 2
    return
  }
  if (currentStep.value === 2) {
    const v = validarCreditoEmergenciaCompleto(emergenciaState.value.credito)
    if (!v.ok) {
      toast.error(
        v.errores[0] ?? 'Complete la hoja de análisis antes de abrir el SCORE.',
        { description: descripcionErroresAdicionales(v.errores) },
      )
      return
    }
    currentStep.value = 3
  }
}

function prevStep(): void {
  if (currentStep.value > 1) {
    currentStep.value = currentStep.value - 1
  }
}

watch(perfilDeudor, (p) => {
  if (p == null && (currentStep.value === 2 || currentStep.value === 3)) {
    currentStep.value = 1
  }
})

async function onScoreGuardado(): Promise<void> {
  const id = solicitudId.value
  if (id) {
    await loadSolicitudParaAnalisis(id)
  }
}

function variantAnalisisAlGuardar(): 'independiente' | 'empleado' {
  return perfilDeudor.value === 'independiente' ? 'independiente' : 'empleado'
}

function filasImprimirActuales(): ImprimirVariableRow[] {
  return variantAnalisisAlGuardar() === 'independiente'
    ? variableRowsForIndep.value
    : variableRowsForEmp.value
}

const guardandoEmergenciaBorrador = ref(false)

async function guardarBorradorAnalisisEmergencia(): Promise<void> {
  const id = solicitudId.value
  if (!id) {
    toast.error('Abre el análisis desde el listado de radicación para vincular una solicitud.')
    return
  }
  if (perfilDeudor.value == null) {
    toast.error('Selecciona el perfil del deudor en el paso 1.')
    return
  }
  const valCred = validarCreditoEmergenciaCompleto(emergenciaState.value.credito)
  if (!valCred.ok) {
    toast.error(
      valCred.errores[0] ?? 'Complete la hoja de análisis (información de crédito) antes de guardar.',
      { description: descripcionErroresAdicionales(valCred.errores) },
    )
    return
  }
  if (!hasAnyPermission(['radicacion_crear', 'radicacion_editar'])) {
    return
  }
  guardandoEmergenciaBorrador.value = true
  try {
    const { $api, $csrf } = useNuxtApp()
    await $csrf()
    const rows = filasImprimirActuales().map(r => ({ ...r }))
    const sums = sumImprimirPuntajesPorSeccion(rows)
    const total = sums.total
    await $api<{
      data?: { analisis_score_snapshot?: Record<string, unknown> | null }
      message?: string
    }>(`/credit-applications/${id}/analisis-score`, {
      method: 'PUT',
      body: {
        perfil_deudor: perfilDeudor.value,
        variant: variantAnalisisAlGuardar(),
        cabecera: { ...scoreCabecera.value },
        variable_rows: rows,
        sums: { ...sums },
        nivel_ifs: classifyPuntajeTotalIFS(total),
        nivel_riesgo: classifyNivelRiesgo(total),
        observaciones: observacionesScore.value.trim() === '' ? null : observacionesScore.value,
        emergencia: JSON.parse(JSON.stringify(emergenciaState.value)) as Record<string, unknown>,
      },
    })
    toast.success('Hoja de análisis (EMERGENCIA) guardada con la solicitud.')
    if (solicitudId.value) {
      await loadSolicitudParaAnalisis(solicitudId.value)
    }
  }
  catch (e: unknown) {
    const err = e as { data?: { message?: string } }
    toast.error(err?.data?.message ?? 'No se pudo guardar la hoja de análisis.')
  }
  finally {
    guardandoEmergenciaBorrador.value = false
  }
}

type ScorePanelExpose = {
  guardarAnalisisScore: () => Promise<void>
  guardandoScore: boolean
  puedeGuardarScore: boolean
}

const scorePanelRef = ref<ScorePanelExpose | null>(null)

const mostrarBotonGuardarEmergencia = computed(
  () =>
    currentStep.value === 2
    && hasAnyPermission(['radicacion_crear', 'radicacion_editar']),
)

const mostrarBotonGuardarScore = computed(
  () =>
    currentStep.value === 3
    && vistaImprimirScore.value != null
    && hasAnyPermission(['radicacion_crear', 'radicacion_editar']),
)

const mostrarBotonDescargarPdfScore = computed(
  () =>
    currentStep.value === 3
    && vistaImprimirScore.value != null
    && hasPermission('radicacion_descargar_pdf'),
)

async function ejecutarGuardarScore(): Promise<void> {
  await scorePanelRef.value?.guardarAnalisisScore()
}

async function ejecutarDescargaScorePdf(): Promise<void> {
  const id = solicitudId.value
  if (!id) {
    return
  }
  descargandoScorePdf.value = true
  try {
    await downloadAnalisisScorePdf(id)
    toast.success('PDF del SCORE abierto en una nueva pestaña. Puede guardarlo desde el visor si lo desea.')
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'No se pudo generar el PDF del SCORE.')
  } finally {
    descargandoScorePdf.value = false
  }
}

</script>

<template>
  <div class="mx-auto flex w-full max-w-6xl flex-col gap-4 px-0 pb-10 pt-4">
    <div class="flex items-center justify-between gap-3">
      <div>
        <div class="mb-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <NuxtLink
            to="/radicacion"
            class="font-medium text-primary underline-offset-4 hover:underline"
          >
            Radicación
          </NuxtLink>
          <Icon name="i-lucide-chevron-right" class="h-4 w-4 shrink-0 opacity-60" />
          <span class="text-foreground">Análisis y SCORE</span>
        </div>
        <h2 class="text-2xl font-bold tracking-tight">
          Análisis y SCORE
        </h2>
        <p class="text-muted-foreground">
          Radicación — Análisis de riesgo
        </p>
      </div>
      <Button variant="outline" class="shrink-0" @click="router.push('/radicacion')">
        <Icon name="i-lucide-arrow-left" class="mr-2 h-4 w-4" />
        Volver
      </Button>
    </div>

    <div
      v-if="solicitudId"
      class="rounded-xl border bg-card p-4"
    >
      <p class="text-sm">
        <span class="text-muted-foreground">Solicitud vinculada:</span>
        <span class="ml-1 font-mono font-medium text-foreground">#{{ solicitudId }}</span>
        <span v-if="loadingSolicitud" class="ml-2 text-muted-foreground">Cargando datos del deudor…</span>
      </p>
    </div>
    <div
      v-else
      class="rounded-xl border border-dashed border-muted-foreground/25 bg-muted/20 p-4 text-sm text-muted-foreground"
    >
      Sin solicitud vinculada en la URL. Puedes usar esta vista en modo prueba o abrir SCORE desde el listado de radicación.
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <template v-for="(step, idx) in stepsScore" :key="step.num">
        <button
          type="button"
          class="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          :class="[
            currentStep === step.num
              ? 'cursor-default bg-primary text-primary-foreground'
              : 'cursor-pointer hover:bg-muted',
          ]"
          :aria-current="currentStep === step.num ? 'step' : undefined"
          @click="goToStep(step.num)"
        >
          <div
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ring-1 ring-border/50"
            :class="currentStep === step.num
              ? 'bg-primary text-primary-foreground ring-primary'
              : currentStep > step.num
                ? 'bg-primary/30 text-primary ring-primary/30'
                : 'bg-background text-foreground ring-muted-foreground/40'"
          >
            {{ step.num }}
          </div>
          <span
            class="hidden text-sm font-semibold sm:inline"
            :class="currentStep === step.num ? 'text-primary-foreground' : 'text-foreground'"
          >
            {{ step.title }}
          </span>
        </button>
        <Icon
          v-if="idx < stepsScore.length - 1"
          name="i-lucide-chevron-right"
          class="h-4 w-4 shrink-0 text-muted-foreground"
        />
      </template>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>
          {{ activeStepMeta.title }}
        </CardTitle>
        <CardDescription class="max-w-3xl space-y-2">
          <span>{{ activeStepMeta.description }}</span>
          <span
            v-if="currentStep === 1"
            class="mt-2 block text-muted-foreground"
          >
            <NuxtLink
              v-if="hasPermission('plantillas_ver')"
              to="/parametrizacion/plantilla-score"
              class="font-medium text-primary underline-offset-4 hover:underline"
            >
              Plantilla Score
            </NuxtLink>
            <template v-else>
              <span class="font-medium text-foreground">Plantilla Score</span> (requiere permiso).
            </template>
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-6">
        <div
          v-if="currentStep === 1"
          class="grid min-w-0 grid-cols-1 items-start gap-4 sm:grid-cols-2 sm:items-stretch"
        >
          <RadicacionAnalisisScorePerfilPicker v-model="perfilDeudor" />
          <RadicacionAnalisisTipoValorCuotaPicker v-model="emergenciaState.credito.tipoValorCuota" />
        </div>

        <div v-else-if="currentStep === 2" class="space-y-4">
          <AnalisisEmergenciaForm
            v-model="emergenciaState"
            :lock-deudor-fields="true"
            :lock-gastos-desde-radicacion="true"
            :lock-vr-cuota-var="isVrCuotaVarBloqueada"
            :pct-reserva-deudor="pctIngDeudor"
            :pct-reserva-codeudor="pctIngCodeudor"
            :company="companyPrincipal"
            :loading-company="loadingCompany"
            :codeudores="codeudoresDeSolicitud"
            :opciones-garantia="opcionesGarantia"
          />
        </div>

        <div v-else-if="currentStep === 3" class="space-y-4">
          <AnalisisScoreImprimirPanel
            v-if="vistaImprimirScore === 'independiente'"
            ref="scorePanelRef"
            v-model:cabecera="scoreCabecera"
            v-model:observaciones="observacionesScore"
            variant="independiente"
            :meta="IMPRIMIR_INDEPENDIENTE_META"
            :variable-rows="variableRowsForIndep"
            :matrix-lines="scoreLinesIndep"
            :credit-application-id="solicitudId"
            :perfil-deudor="perfilDeudor"
            :emergencia="emergenciaState"
            :company="companyPrincipal"
            :loading-company="loadingCompany"
            @saved="onScoreGuardado"
          />
          <AnalisisScoreImprimirPanel
            v-else-if="vistaImprimirScore === 'empleado'"
            ref="scorePanelRef"
            v-model:cabecera="scoreCabecera"
            v-model:observaciones="observacionesScore"
            variant="empleado"
            :meta="IMPRIMIR_EMPLEADO_META"
            :variable-rows="variableRowsForEmp"
            :matrix-lines="scoreLinesEmp"
            :credit-application-id="solicitudId"
            :perfil-deudor="perfilDeudor"
            :emergencia="emergenciaState"
            :company="companyPrincipal"
            :loading-company="loadingCompany"
            @saved="onScoreGuardado"
          />
          <p v-else class="text-sm text-muted-foreground">
            Selecciona un perfil en el paso 1 para cargar la hoja de score.
          </p>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-4 border-t pt-4">
          <div class="flex flex-wrap gap-2">
            <Button
              v-if="currentStep > 1"
              type="button"
              variant="outline"
              @click="prevStep"
            >
              Anterior
            </Button>
            <Button
              v-if="currentStep < maxStep"
              type="button"
              @click="nextStep"
            >
              Siguiente
            </Button>
          </div>
          <div
            v-if="mostrarBotonGuardarEmergencia || mostrarBotonGuardarScore || mostrarBotonDescargarPdfScore"
            class="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:items-end"
          >
            <p
              v-if="!solicitudId && (mostrarBotonGuardarEmergencia || mostrarBotonGuardarScore)"
              class="text-right text-xs text-amber-700 dark:text-amber-400"
            >
              Sin solicitud en la URL: abre esta pantalla desde Radicación para poder guardar.
            </p>
            <p
              v-else-if="mostrarBotonGuardarEmergencia"
              class="text-right text-xs text-muted-foreground"
            >
              Guarda la hoja de análisis (EMERGENCIA) con la misma solicitud; puedes continuar a la hoja SCORE después.
            </p>
            <p
              v-else-if="mostrarBotonGuardarScore"
              class="text-right text-xs text-muted-foreground"
            >
              Se guarda en la solicitud vinculada (borrador o en análisis).
            </p>
            <p
              v-if="mostrarBotonDescargarPdfScore && solicitudId"
              class="text-right text-xs text-muted-foreground"
            >
              Se abre en una nueva pestaña; el contenido es el último SCORE guardado en el servidor.
            </p>
            <div class="flex flex-wrap justify-end gap-2">
              <Button
                v-if="mostrarBotonDescargarPdfScore"
                type="button"
                variant="outline"
                class="shrink-0 !border-red-200/90 !bg-red-50 text-red-900 hover:!border-red-300 hover:!bg-red-100 dark:!border-red-800/50 dark:!bg-red-950/45 dark:text-red-100 dark:hover:!border-red-700 dark:hover:!bg-red-950/70"
                :disabled="!solicitudId || !tieneAnalisisScoreGuardado || descargandoScorePdf"
                @click="ejecutarDescargaScorePdf"
              >
                <Icon
                  v-if="descargandoScorePdf"
                  name="i-lucide-loader-2"
                  class="mr-2 h-4 w-4 animate-spin"
                />
                <Icon
                  v-else
                  name="i-simple-icons-adobeacrobatreader"
                  class="mr-2 h-4 w-4 text-red-600 dark:text-red-300"
                />
                {{ descargandoScorePdf ? 'Abriendo…' : 'Ver PDF SCORE' }}
              </Button>
              <Button
                v-if="mostrarBotonGuardarEmergencia"
                type="button"
                class="shrink-0"
                :disabled="!solicitudId || guardandoEmergenciaBorrador"
                @click="guardarBorradorAnalisisEmergencia"
              >
                <Icon
                  v-if="guardandoEmergenciaBorrador"
                  name="i-lucide-loader-2"
                  class="mr-2 h-4 w-4 animate-spin"
                />
                <Icon
                  v-else
                  name="i-lucide-save"
                  class="mr-2 h-4 w-4"
                />
                {{ guardandoEmergenciaBorrador ? 'Guardando…' : 'Guardar hoja de análisis' }}
              </Button>
              <Button
                v-if="mostrarBotonGuardarScore"
                type="button"
                class="shrink-0"
                :disabled="!solicitudId || scorePanelRef?.guardandoScore"
                @click="ejecutarGuardarScore"
              >
                <Icon
                  v-if="scorePanelRef?.guardandoScore"
                  name="i-lucide-loader-2"
                  class="mr-2 h-4 w-4 animate-spin"
                />
                <Icon
                  v-else
                  name="i-lucide-save"
                  class="mr-2 h-4 w-4"
                />
                {{ scorePanelRef?.guardandoScore ? 'Guardando…' : 'Guardar análisis SCORE' }}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
