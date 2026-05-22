export const ARCHIVAL_PHASE_LABELS: Record<string, string> = {
  management: 'Archivo de gestión',
  central: 'Archivo central',
  historical: 'Archivo histórico',
  disposed: 'Dispuesto',
}

export const ARCHIVAL_DISPOSITION_ACT_STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  approved: 'Aprobada',
  executed: 'Ejecutada',
}

export const ARCHIVAL_DISPOSITION_TYPE_OPTIONS = [
  { value: 'elimination', label: 'Eliminación' },
  { value: 'full_conservation', label: 'Conservación total' },
  { value: 'selection', label: 'Selección' },
] as const
