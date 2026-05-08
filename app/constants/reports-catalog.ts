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
    summary: 'Cantidad de radicaciones que tienen estado Análisis (In_Analysis), con sumatoria de montos por sucursal y mes.',
    excelSheet: 'ANALISIS',
    status: 'available',
    dataSource: 'applications',
    note: 'Filtro por estado actual In_Analysis; fechas sobre created_at.',
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
    summary: 'Detalle de solicitudes negadas o retiradas con identificación y montos.',
    excelSheet: 'NEGADAS O RETIRADAS',
    status: 'planned',
    dataSource: 'applications',
    note: 'Listado desde estados finales; validar pagaré y códigos.',
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
    slug: 'excepciones',
    title: 'Excepciones',
    summary: 'Casos con excepción (SCORE, RCI, analista, aprobador).',
    excelSheet: 'EXPECIONES',
    status: 'planned',
    dataSource: 'manual',
    note: 'Marcar excepciones en BD o módulo de registro.',
  },
  {
    slug: 'privilegiados',
    title: 'Privilegiados',
    summary: 'Casos con atribuciones del consejo, actas y condiciones especiales.',
    excelSheet: 'PRIVILEGIADOS',
    status: 'planned',
    dataSource: 'manual',
    note: 'Registro manual o flujo dedicado.',
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
