/**
 * Hoja EMERGENCIA (Excel) — Código AIR-SARC-FO-01.
 * Misma estructura que se persiste en `analisis_score_snapshot.emergencia`.
 */
import type { TipoValorCuota } from '~/utils/analisis-emergencia-cuota'

export type EmergenciaCuotaLine = { cuota: string, entidad: string }

export type EmergenciaCapacidadBloque = {
  ingresos: string
  otrosIngresos: string
  totalIngresos: string
  cuotasFin: EmergenciaCuotaLine[]
  /** Gastos personales / alimentación / otros — mismo criterio que paso 3 radicación (`expenses`). */
  gastoPersonal: string
  /** `expenses.rent` — Gastos servicios/arriendo (un solo valor en radicación). */
  gastosServiciosArriendo: string
  /** @deprecated Legado; vaciar al sincronizar desde radicación. */
  arriendo: string
  alimentacion: string
  /** @deprecated Legado; vaciar al sincronizar desde radicación. */
  serviciosPublicos: string
  gastoSalud: string
  gastoPension: string
  gastoArl: string
  otrosGastos: string
  totalEgresos: string
  ingDisponibles: string
  reservaSobreIngreso: string
  valorCuota: string
  saldo: string
}

/** Fila de tabla (bienes en garantía u otros bienes) en hoja emergency / snapshot. */
export type EmergenciaFilaActivo = {
  nombre: string
  /** Monto en COP, mismo criterio de formato que el resto de la hoja. */
  valor: string
  matricula: string
}

export type EmergenciaTablaActivos = {
  filas: EmergenciaFilaActivo[]
  observaciones: string
}

export type EmergenciaPersonaActivo = {
  /** Bienes raíces: activos del paso 3 con check «Garantía». */
  bienesGarantia: EmergenciaTablaActivos
  /** Otros bienes: activos reportados sin Garantía. */
  otrosBienes: EmergenciaTablaActivos
}

export type EmergenciaCentralRiesgoColumna = {
  deudor: string
  codeudor1: string
  codeudor2: string
  codeudor3: string
}

export type EmergenciaState = {
  encabezado: {
    codigoFormulario: string
    version: string
    entidad: string
    nit: string
    fechaActualizacion: string
  }
  deudorCodeudor: {
    deudor: string
    codeudor: string
    documento: string
    fechaAnalisis: string
  }
  credito: {
    /** Paso 1: define fórmula de Vr. cuota var. en el paso 2 (Corriente / Emergencia). */
    tipoValorCuota: TipoValorCuota
    vrCredito: string
    plazoMeses: string
    /** Característica de Garantía (Cualitativas) según plantilla SCORE, una sola por etiqueta. */
    garantia: string
    vrCuotaVar: string
    /** Tasa nominal **anual** en % (coma o punto para decimales, ej. 12,5). */
    tasaNominal: string
    /**
     * Tasa / efectivo **por periodo** (mensual) en %.
     * En la app: = tasa nominal ÷ 12; solo lectura, se recalcula con la nominal.
     */
    tasaEfectiva: string
    comentarioGarantia: string
  }
  /** Deudor | codeudor 1 (reserva % ING parametrizable × ingresos disponibles) */
  capacidadBloque1: { a: EmergenciaCapacidadBloque, b: EmergenciaCapacidadBloque }
  /** Codeudor 2 | 3 (reserva 10% / 10%) */
  capacidadBloque2: { a: EmergenciaCapacidadBloque, b: EmergenciaCapacidadBloque }
  activos: {
    deudor: EmergenciaPersonaActivo
    codeudor1: EmergenciaPersonaActivo
    codeudor2: EmergenciaPersonaActivo
    codeudor3: EmergenciaPersonaActivo
    totalActivos: string
  }
  centralRiesgos: {
    calificacion: EmergenciaCentralRiesgoColumna
    deudasDirectas: EmergenciaCentralRiesgoColumna
    deudasIndirectas: EmergenciaCentralRiesgoColumna
    totalEndeudamiento: EmergenciaCentralRiesgoColumna
  }
  nivel: {
    riesgoAsumidoRci: string
    nivelRiesgoAsumido: string
    puntajeScore: string
    nivelRiesgoPerfilDeudor: string
  }
  asesorNombre: string
}

function emptyCapacidad(): EmergenciaCapacidadBloque {
  return {
    ingresos: '',
    otrosIngresos: '',
    totalIngresos: '',
    cuotasFin: [{ cuota: '', entidad: '' }],
    gastoPersonal: '',
    gastosServiciosArriendo: '',
    arriendo: '',
    alimentacion: '',
    serviciosPublicos: '',
    gastoSalud: '',
    gastoPension: '',
    gastoArl: '',
    otrosGastos: '',
    totalEgresos: '',
    ingDisponibles: '',
    reservaSobreIngreso: '',
    valorCuota: '',
    saldo: '',
  }
}

function emptyActivo(): EmergenciaPersonaActivo {
  return {
    bienesGarantia: { filas: [], observaciones: '' },
    otrosBienes: { filas: [], observaciones: '' },
  }
}

function emptyCentral(): EmergenciaCentralRiesgoColumna {
  return { deudor: '', codeudor1: '', codeudor2: '', codeudor3: '' }
}

export const EMERGENCIA_FORM_META = {
  titulo: 'HOJA DE ANÁLISIS',
  codigo: 'AIR-SARC-FO-01',
  version: '02',
  entidadLinea: 'ADMINISTRACIÓN INTEGRAL DE RIESGOS',
} as const

export function defaultEmergenciaState(): EmergenciaState {
  return {
    encabezado: {
      codigoFormulario: EMERGENCIA_FORM_META.codigo,
      version: EMERGENCIA_FORM_META.version,
      entidad: EMERGENCIA_FORM_META.entidadLinea,
      nit: '',
      fechaActualizacion: '',
    },
    deudorCodeudor: {
      deudor: '',
      codeudor: '',
      documento: '',
      fechaAnalisis: '',
    },
    credito: {
      tipoValorCuota: '',
      vrCredito: '',
      plazoMeses: '',
      garantia: '',
      vrCuotaVar: '',
      tasaNominal: '',
      tasaEfectiva: '',
      comentarioGarantia: '',
    },
    capacidadBloque1: { a: emptyCapacidad(), b: emptyCapacidad() },
    capacidadBloque2: { a: emptyCapacidad(), b: emptyCapacidad() },
    activos: {
      deudor: emptyActivo(),
      codeudor1: emptyActivo(),
      codeudor2: emptyActivo(),
      codeudor3: emptyActivo(),
      totalActivos: '',
    },
    centralRiesgos: {
      calificacion: emptyCentral(),
      deudasDirectas: emptyCentral(),
      deudasIndirectas: emptyCentral(),
      totalEndeudamiento: emptyCentral(),
    },
    nivel: {
      riesgoAsumidoRci: '',
      nivelRiesgoAsumido: '',
      puntajeScore: '',
      nivelRiesgoPerfilDeudor: '',
    },
    asesorNombre: '',
  }
}

function isPlainObject(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === 'object' && !Array.isArray(x)
}

/**
 * Fusión profunda conservando estructura por defecto; arrays se fusionan por índice
 * o se reemplazan si la longitud difiere.
 */
function deepMerge<T>(base: T, patch: unknown): T {
  if (patch === undefined || patch === null) {
    return base
  }
  if (Array.isArray(patch)) {
    if (Array.isArray(base)) {
      const n = Math.max(base.length, patch.length)
      return Array.from({ length: n }, (_, i) => {
        if (i < base.length && i < (patch as unknown[]).length) {
          return deepMerge(base[i] as T, (patch as unknown[])[i])
        }
        if (i < base.length) {
          return base[i]
        }
        return (patch as unknown[])[i]
      }) as T
    }
    return patch as T
  }
  if (isPlainObject(patch) && isPlainObject(base as object)) {
    const out = { ...base } as Record<string, unknown>
    for (const k of Object.keys(patch)) {
      if (k in out) {
        out[k] = deepMerge(out[k], (patch as Record<string, unknown>)[k])
      }
      else {
        out[k] = (patch as Record<string, unknown>)[k]
      }
    }
    return out as T
  }
  return patch as T
}

function ensureCuotasFinMinimo(b: EmergenciaCapacidadBloque) {
  if (!Array.isArray(b.cuotasFin) || b.cuotasFin.length === 0) {
    b.cuotasFin = [{ cuota: '', entidad: '' }]
  }
}

function asTablaActivos(t: unknown): EmergenciaTablaActivos | null {
  if (t == null || typeof t !== 'object' || !Array.isArray((t as { filas?: unknown }).filas)) {
    return null
  }
  const o = t as { filas: unknown[], observaciones?: unknown }
  return {
    filas: o.filas.map((f) => {
      if (f == null || typeof f !== 'object') {
        return { nombre: '', valor: '', matricula: '' }
      }
      const r = f as Record<string, unknown>
      return {
        nombre: String(r.nombre ?? ''),
        valor: String(r.valor ?? ''),
        matricula: String(r.matricula ?? ''),
      }
    }),
    observaciones: typeof o.observaciones === 'string' ? o.observaciones : '',
  }
}

/**
 * Migra `bienesRaices` / `otrosBienesDetalle` / `otrosBienesValor` (legado) o normaliza
 * filas/observaciones faltantes.
 */
function normalizarPersonaActivo(p: unknown): EmergenciaPersonaActivo {
  const e = emptyActivo()
  if (p == null || typeof p !== 'object') {
    return e
  }
  const o = p as Record<string, unknown>
  const tG = asTablaActivos(o.bienesGarantia)
  const tO = asTablaActivos(o.otrosBienes)
  if (tG != null || tO != null) {
    e.bienesGarantia = tG ?? emptyActivo().bienesGarantia
    e.otrosBienes = tO ?? emptyActivo().otrosBienes
    return e
  }
  const br = o.bienesRaices
  const otd = o.otrosBienesDetalle
  const otv = o.otrosBienesValor
  e.bienesGarantia = {
    filas: typeof br === 'string' && br.trim() !== '' ? [{ nombre: 'Consolidado (histórico)', valor: br, matricula: '' }] : [],
    observaciones: '',
  }
  e.otrosBienes = {
    filas:
      typeof otv === 'string' && otv.trim() !== ''
        ? [{ nombre: typeof otd === 'string' && otd.trim() ? otd : 'Otros bienes (hist.)', valor: otv, matricula: '' }]
        : [],
    observaciones: typeof otd === 'string' && otd.trim() && (typeof otv !== 'string' || !otv.trim()) ? otd : '',
  }
  return e
}

function normalizarBloqueActivos(a: EmergenciaState['activos']): void {
  a.deudor = normalizarPersonaActivo(a.deudor)
  a.codeudor1 = normalizarPersonaActivo(a.codeudor1)
  a.codeudor2 = normalizarPersonaActivo(a.codeudor2)
  a.codeudor3 = normalizarPersonaActivo(a.codeudor3)
  if (typeof a.totalActivos !== 'string') {
    a.totalActivos = ''
  }
}

export function mergeEmergenciaFromSnapshot(saved: unknown): EmergenciaState {
  const merged = deepMerge(defaultEmergenciaState(), saved) as EmergenciaState
  ensureCuotasFinMinimo(merged.capacidadBloque1.a)
  ensureCuotasFinMinimo(merged.capacidadBloque1.b)
  ensureCuotasFinMinimo(merged.capacidadBloque2.a)
  ensureCuotasFinMinimo(merged.capacidadBloque2.b)
  normalizarBloqueActivos(merged.activos)
  return merged
}

/**
 * Clon estructural completo de EMERGENCIA para el snapshot (API, PDF, histórico).
 * Sin recortar cadenas vacías ni claves: misma fidelidad que en pantalla.
 */
export function emergenciaStateToSnapshotObject(state: EmergenciaState): Record<string, unknown> {
  return JSON.parse(JSON.stringify(state)) as Record<string, unknown>
}
