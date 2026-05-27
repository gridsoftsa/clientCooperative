/**
 * Catálogo de informes: solo las hojas acordadas del Excel de negocio.
 * Un ítem = una vista (y futuras exportaciones) por separado; `available` tiene ruta propia.
 */
export type ReportDataSource = 'applications' | 'portfolio' | 'configuration' | 'mixed' | 'manual'

export type ReportCatalogStatus = 'available' | 'planned'

export interface ReportCatalogItem {
  /** Slug de ruta bajo /reportes/ cuando status === available */
  slug: string
  title: string
  summary: string
  /** Nombre de hoja en el libro Excel de referencia */
  excelSheet: string
  status: ReportCatalogStatus
  dataSource: ReportDataSource
  /** Viabilidad / qué falta para automatizar */
  note: string
}

/** Alcance actual: Solicitudes tramitadas — SOLIC APROBADAS — ANALISIS — DEVUELTAS Y NEGADAS — NEGADAS O RETIRADAS — PROMEDIO DEMORA — EXPECIONES — PRIVILEGIADOS */
export const REPORTS_CATALOG: ReportCatalogItem[] = [
  {
    slug: 'tramitadas-sucursal',
    title: 'Solicitudes tramitadas',
    summary: 'Por rango de fechas: cantidad de radicaciones generadas y suma de montos solicitados, por sucursal de la radicación y por mes.',
    excelSheet: 'Solicitudes tramitadas',
    status: 'available',
    dataSource: 'applications',
    note: 'Fecha = generación de la radicación (created_at). Monto = suma de amount_requested.',
  },
  {
    slug: 'solicitudes-aprobadas',
    title: 'Solicitudes aprobadas',
    summary: 'Radicaciones en estado Desembolso: cantidad y suma de montos solicitados por sucursal y mes (rango por fecha de creación).',
    excelSheet: 'SOLIC APROBADAS',
    status: 'available',
    dataSource: 'applications',
    note: 'Incluye solo estado Desembolso; mismo criterio de fechas que tramitadas.',
  },
  {
    slug: 'analisis',
    title: 'Análisis',
    summary:
      'Por mes de creación (tramitadas): total de radicaciones frente a las enviadas desde análisis a revisión del director de crédito (paso tras SCORE), con sumatorias de montos.',
    excelSheet: 'ANALISIS',
    status: 'available',
    dataSource: 'applications',
    note: '«A director» = evento de transición In_Analysis → Credit_Director_Review; fechas sobre created_at del total.',
  },
  {
    slug: 'devueltas-negadas',
    title: 'Devueltas y negadas',
    summary:
      'Por mes de creación de la radicación y sucursal: tramitadas, devueltas (al menos una devolución), correcciones (reenvío tras devolución), negadas (director de crédito), % error y variación vs mes anterior.',
    excelSheet: 'DEVUELTAS Y NEGADAS',
    status: 'available',
    dataSource: 'applications',
    note: '% error = (devueltas + correcciones) / tramitadas. Mejoró = % error mes actual − % error mes previo. Fuente: trazabilidad credit_application_events.',
  },
  {
    slug: 'negadas-retiradas',
    title: 'Negadas o retiradas',
    summary:
      'Vista consolidada (totales rechazadas vs canceladas) o detalle por radicación: código, radicado externo, monto, sucursal, decisión, fecha/hora, usuario y concepto o motivo.',
    excelSheet: 'NEGADAS O RETIRADAS',
    status: 'available',
    dataSource: 'applications',
    note: 'Cohorte por fecha de creación. Rechazada / cancelada con actor desde trazabilidad o campos de radicación.',
  },
  {
    slug: 'promedio-demora',
    title: 'Promedio de demora',
    summary:
      'Días promedio entre etapas del flujo (asesor → director de agencia, revisión documentación, análisis, director de crédito, etc.) por sucursal, según trazabilidad.',
    excelSheet: 'PROMEDIO DEMORA',
    status: 'available',
    dataSource: 'applications',
    note: 'Solo radicaciones creadas en el rango; cada columna promedia tramos completos observados (N).',
  },
  {
    slug: 'promedio-demora-excluidos',
    title: 'Excluidos de demora',
    summary:
      'Casos excluidos del indicador de demora: devoluciones por modificación del director de crédito y radicaciones marcadas como inmobiliaria/asegurabilidad en revisión documental.',
    excelSheet: 'EXCLUIDOS DEMORA',
    status: 'available',
    dataSource: 'applications',
    note: 'Este reporte separa casos especiales para no distorsionar los indicadores de asesor ni del flujo estándar.',
  },
  {
    slug: 'indicador',
    title: 'Indicador',
    summary:
      'Total de solicitudes radicadas en el rango (fecha de creación) y, al elegir un estado del flujo, cuántas llegaron a ese estado (actual o por trazabilidad) con el porcentaje sobre el total.',
    excelSheet: 'INDICADOR',
    status: 'available',
    dataSource: 'applications',
    note: 'Denominador = radicaciones creadas en el período; numerador = estado actual o evento con llegada a ese estado.',
  },
  {
    slug: 'excepciones',
    title: 'Excepciones',
    summary:
      'Radicaciones con excepción «Sí» en decisión del director: consolidado por estado actual o detalle con justificación (todas las opciones), fecha/hora y usuario.',
    excelSheet: 'EXPECIONES',
    status: 'available',
    dataSource: 'applications',
    note: 'Campo credit_director_is_exception; justificación en catálogo o texto.',
  },
  {
    slug: 'privilegiados',
    title: 'Privilegiados',
    summary:
      'Radicaciones marcadas como privilegiadas: consolidado (total y suma montos) o detalle con justificación (fragmentos), origen del registro, fecha/hora y usuario.',
    excelSheet: 'PRIVILEGIADOS',
    status: 'available',
    dataSource: 'applications',
    note: 'Campo is_privileged; actor desde evento de director o asesor.',
  },
]

export const REPORTS_AVAILABLE = REPORTS_CATALOG.filter(r => r.status === 'available')

export const REPORTS_PLANNED = REPORTS_CATALOG.filter(r => r.status === 'planned')

const DATA_SOURCE_LABELS: Record<ReportDataSource, string> = {
  applications: 'Radicación / solicitudes',
  portfolio: 'Cartera / colocación',
  configuration: 'Parametrización',
  mixed: 'Varias fuentes',
  manual: 'Registro manual',
}

export function reportDataSourceLabel(source: ReportDataSource): string {
  return DATA_SOURCE_LABELS[source]
}
