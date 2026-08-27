/** Modo de presentación alineado con la API de reportes especiales (`mode`). */
export const REPORT_MODE_CONSOLIDATED = 'consolidated' as const
export const REPORT_MODE_DETAIL = 'detail' as const

export type ReportConsolidationMode = typeof REPORT_MODE_CONSOLIDATED | typeof REPORT_MODE_DETAIL

export const REPORT_CONSOLIDATION_MODE_OPTIONS: { value: ReportConsolidationMode, label: string }[] = [
  { value: REPORT_MODE_CONSOLIDATED, label: 'Consolidado' },
  { value: REPORT_MODE_DETAIL, label: 'Detalle específico' },
]
