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
  document_published_to_library: 'Publicación en biblioteca institucional',
  document_unpublished_from_library: 'Retiro de biblioteca institucional',
}

export function archivalFileEventTypeLabel(eventType: string | null | undefined): string {
  if (!eventType) {
    return 'Evento'
  }

  return ARCHIVAL_FILE_EVENT_TYPE_LABELS[eventType as ArchivalFileEventType]
    ?? eventType.replaceAll('_', ' ')
}
