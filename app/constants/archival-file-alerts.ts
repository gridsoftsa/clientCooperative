import type { ArchivalFileAlertType } from '~/types/archival-file'

export const ARCHIVAL_FILE_ALERT_TYPE_LABELS: Record<ArchivalFileAlertType, string> = {
  missing_required_documents: 'Documentos obligatorios faltantes',
  closure_ready: 'Listo para cierre',
  stale_draft: 'Expediente en construcción prolongada',
  closed_without_consolidation: 'Pendiente de consolidación',
  consolidation_pending_reminder: 'Recordatorio de consolidación',
  retention_management_upcoming: 'Fin de archivo de gestión próximo',
  retention_management_overdue: 'Transferencia a archivo central pendiente',
  retention_central_upcoming: 'Fin de archivo central próximo',
  retention_central_overdue: 'Transferencia a archivo histórico pendiente',
  retention_historical_upcoming: 'Fin de archivo histórico próximo',
  retention_historical_overdue: 'Disposición final pendiente',
}

export const ARCHIVAL_FILE_ALERT_SEVERITY_LABELS: Record<string, string> = {
  info: 'Informativa',
  warning: 'Advertencia',
  danger: 'Crítica',
}
