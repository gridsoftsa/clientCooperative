import type { ArchivalFileEventType } from '~/types/archival-file'

export const ARCHIVAL_FILE_EVENT_TYPE_LABELS: Record<ArchivalFileEventType, string> = {
  created: 'Creación',
  document_uploaded: 'Carga de documento',
  document_referenced: 'Referencia documental',
  document_viewed: 'Consulta',
  document_downloaded: 'Descarga',
  metadata_updated: 'Modificación de metadatos',
  status_changed: 'Cambio de estado',
  closed: 'Cierre',
  consolidated: 'Consolidación',
  transferred: 'Transferencia entre archivos',
  disposition_final: 'Disposición final',
  access_report_exported: 'Exportación tabla de acceso',
}
