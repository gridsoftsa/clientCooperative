export const WORKFLOW_STAGE_TYPE_OPTIONS = [
  { value: 'manual', label: 'Manual' },
  { value: 'automatic', label: 'Automática' },
] as const

export const WORKFLOW_VENTANILLA_ROLE_OPTIONS = [
  { value: 'none', label: 'Sin integración ventanilla' },
  { value: 'assignment', label: 'Asignación (se completa al asignar responsable)' },
  { value: 'management', label: 'Gestión (metadatos e inicio en ventanilla; se puede repetir para subprocesos)' },
  { value: 'response_close', label: 'Cierre / respuesta (valida respuesta obligatoria)' },
] as const

export const WORKFLOW_ASSIGNEE_TYPE_OPTIONS = [
  {
    value: 'org_unit_manager',
    label: 'Jefe del área responsable del radicado',
    hint: 'La tarea llega al jefe del área destinataria (la que responde el trámite).',
    example: 'Radicado interno a Talento Humano → lo recibe el director de TH.',
  },
  {
    value: 'producer_org_unit_manager',
    label: 'Jefe del área productora (quien origina)',
    hint: 'La tarea llega al jefe del área que origina el radicado, no al destinatario.',
    example: 'Sistemas radica hacia TH; esta etapa la ve el jefe de Sistemas (visto bueno).',
  },
  {
    value: 'filing_assigned_user',
    label: 'Usuario asignado al radicado',
    hint: 'La tarea va a la persona que quedó como responsable en ventanilla.',
    example: 'En «Asignar responsable» eligieron a un profesional SST; las etapas siguientes las gestiona esa persona.',
  },
  {
    value: 'specific_user',
    label: 'Usuario específico',
    hint: 'Siempre la misma persona, sin importar el área del radicado. Debe indicarla abajo.',
    example: 'Todas las legalizaciones las ve el tesorero configurado en esta etapa.',
  },
  {
    value: 'org_unit',
    label: 'Jefe de un área fija',
    hint: 'Siempre el jefe del área que elija aquí, aunque el radicado sea de otra dependencia.',
    example: 'El flujo de compras siempre lo ve el jefe de Compras y adquisiciones.',
  },
  {
    value: 'position',
    label: 'Cargo en el área responsable',
    hint: 'Quien ocupe ese cargo en el área destinataria del radicado. Debe indicar el cargo abajo.',
    example: 'Cargo «Profesional SST» en TH: llega a quien tenga ese cargo en el área del radicado.',
  },
] as const

export function labelForWorkflowStageType(value: string) {
  return WORKFLOW_STAGE_TYPE_OPTIONS.find(o => o.value === value)?.label ?? value
}

export function labelForWorkflowAssigneeType(value: string) {
  return WORKFLOW_ASSIGNEE_TYPE_OPTIONS.find(o => o.value === value)?.label ?? value
}

export function helpForWorkflowAssigneeType(value: string) {
  return WORKFLOW_ASSIGNEE_TYPE_OPTIONS.find(o => o.value === value) ?? null
}

export function labelForWorkflowVentanillaRole(value: string | null | undefined) {
  if (!value)
    return 'Sin integración'

  return WORKFLOW_VENTANILLA_ROLE_OPTIONS.find(o => o.value === value)?.label ?? value
}
