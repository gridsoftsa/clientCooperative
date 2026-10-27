import type { ArchivalFileModel } from '~/types/archival-file'

export const ARCHIVAL_FILE_MODEL_OPTIONS: Array<{
  value: ArchivalFileModel
  label: string
  question: string
  detail: string
  recommended?: boolean
}> = [
  {
    value: 'entity_case',
    label: 'De una persona o trámite',
    question: '¿Cada expediente es de alguien o de un trámite concreto?',
    detail: 'Se abre un expediente por asociado, crédito, trabajador, contrato, proveedor o PQRS. Ejemplo: el de Juan Pérez o el crédito RAD-2026-000002.',
    recommended: true,
  },
  {
    value: 'org_area',
    label: 'De una oficina',
    question: '¿Es el archivo de toda un área, sin un titular?',
    detail: 'Un solo expediente para la oficina. Los documentos se agrupan por dependencia, no por persona. Ejemplo: el repositorio de Agencias.',
  },
]

export const ARCHIVAL_FILE_MODEL_LABELS: Record<ArchivalFileModel, string> = {
  entity_case: 'De una persona o trámite',
  org_area: 'De una oficina',
}
