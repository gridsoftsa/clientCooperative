export const ARCHIVAL_AUDIT_SCOPE_OPTIONS = [
  { value: 'all', label: 'Catálogo y TRD' },
  { value: 'catalog', label: 'Catálogo documental' },
  { value: 'trd', label: 'Tablas TRD' },
] as const

export type ArchivalAuditScope = typeof ARCHIVAL_AUDIT_SCOPE_OPTIONS[number]['value']

export const ARCHIVAL_AUDIT_EVENT_OPTIONS = [
  { value: '__all__', label: 'Todas las acciones' },
  { value: 'created', label: 'Creación' },
  { value: 'updated', label: 'Actualización' },
  { value: 'deleted', label: 'Eliminación' },
  { value: 'sync', label: 'Sincronización (asociaciones)' },
  { value: 'attach', label: 'Vinculación' },
  { value: 'detach', label: 'Desvinculación' },
] as const
