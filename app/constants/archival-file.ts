import type { ArchivalFileModel } from '~/types/archival-file'

export const ARCHIVAL_FILE_MODEL_OPTIONS: Array<{
  value: ArchivalFileModel
  label: string
  summary: string
  when: string
  examples: string
}> = [
  {
    value: 'entity_case',
    label: 'Entidad / caso',
    summary: 'Un expediente por persona, contrato o trámite.',
    when: 'Úselo si el expediente “pertenece” a alguien o a un caso concreto.',
    examples: 'Asociado, crédito, trabajador, proveedor, PQRS.',
  },
  {
    value: 'org_area',
    label: 'Área productora',
    summary: 'Un archivo compartido de la dependencia u oficina.',
    when: 'Úselo si el expediente es del área, no de una persona.',
    examples: 'Repositorio por área, auditoría institucional.',
  },
]

export const ARCHIVAL_FILE_MODEL_LABELS: Record<ArchivalFileModel, string> = {
  entity_case: 'Entidad / caso',
  org_area: 'Área productora',
}
