export type ArchivalManualUploadSource = 'manual' | 'email' | 'scanner' | 'web_form'

export const ARCHIVAL_MANUAL_UPLOAD_SOURCES: Array<{
  value: ArchivalManualUploadSource
  label: string
  description: string
}> = [
  {
    value: 'manual',
    label: 'Carga manual',
    description: 'Archivo digitalizado o recibido por el funcionario en el expediente.',
  },
  {
    value: 'scanner',
    label: 'Escáner',
    description: 'Documento físico digitalizado en mesa de archivo o ventanilla.',
  },
  {
    value: 'email',
    label: 'Correo electrónico',
    description: 'Anexo recibido por correo y asociado directamente al expediente.',
  },
  {
    value: 'web_form',
    label: 'Formulario web',
    description: 'Documento aportado por el ciudadano vía formulario o portal.',
  },
]

export const ARCHIVAL_DOCUMENT_SOURCE_LABELS: Record<string, string> = {
  manual: 'Carga manual',
  ventanilla: 'Ventanilla',
  workflow: 'Workflow',
  radicacion: 'Radicación',
  email: 'Correo electrónico',
  web_form: 'Formulario web',
  scanner: 'Escáner',
  reference: 'Referencia documental',
  migration: 'Migración',
}

export function archivalDocumentSourceLabel(source?: string | null): string | null {
  if (!source) {
    return null
  }

  return ARCHIVAL_DOCUMENT_SOURCE_LABELS[source] ?? source
}
