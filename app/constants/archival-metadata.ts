export const ARCHIVAL_METADATA_SCHEMA_STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  active: 'Activo',
  inactive: 'Inactivo',
  superseded: 'Reemplazado',
}

export const ARCHIVAL_METADATA_APPLICATION_LEVEL_LABELS: Record<string, string> = {
  functional_type: 'Tipo funcional',
  series: 'Serie documental',
  subseries: 'Subserie',
  document_type: 'Tipo documental',
  file_type: 'Tipo de expediente',
}

export const ARCHIVAL_METADATA_APPLICATION_LEVEL_OPTIONS = [
  { value: 'document_type', label: 'Tipo documental' },
  { value: 'subseries', label: 'Subserie' },
  { value: 'series', label: 'Serie documental' },
  { value: 'file_type', label: 'Tipo de expediente' },
  { value: 'functional_type', label: 'Tipo funcional' },
] as const

export const ARCHIVAL_METADATA_FIELD_DATA_TYPE_LABELS: Record<string, string> = {
  text: 'Texto corto',
  textarea: 'Texto largo',
  number: 'Número',
  date: 'Fecha',
  boolean: 'Sí/No',
  select: 'Lista de valores',
  email: 'Correo electrónico',
  currency: 'Valor monetario (COP)',
  nit: 'NIT',
  identifier: 'Identificación numérica',
}

export const ARCHIVAL_METADATA_FIELD_DATA_TYPE_OPTIONS = Object.entries(
  ARCHIVAL_METADATA_FIELD_DATA_TYPE_LABELS,
).map(([value, label]) => ({ value, label }))
