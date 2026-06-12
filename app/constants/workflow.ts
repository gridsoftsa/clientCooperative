export const WORKFLOW_STAGE_TYPE_OPTIONS = [
  { value: 'manual', label: 'Manual' },
  { value: 'automatic', label: 'Automática' },
] as const

export const WORKFLOW_VENTANILLA_ROLE_OPTIONS = [
  { value: 'none', label: 'Sin integración ventanilla' },
  { value: 'assignment', label: 'Asignación (se completa al asignar responsable)' },
  { value: 'management', label: 'Gestión (sigue el inicio de gestión en ventanilla)' },
  { value: 'response_close', label: 'Cierre / respuesta (valida respuesta obligatoria)' },
] as const

export const WORKFLOW_ASSIGNEE_TYPE_OPTIONS = [
  { value: 'org_unit_manager', label: 'Jefe del área responsable del radicado' },
  { value: 'filing_assigned_user', label: 'Usuario asignado al radicado' },
  { value: 'specific_user', label: 'Usuario específico' },
  { value: 'org_unit', label: 'Jefe de un área fija' },
  { value: 'position', label: 'Cargo en el área responsable' },
] as const

export function labelForWorkflowStageType(value: string) {
  return WORKFLOW_STAGE_TYPE_OPTIONS.find(o => o.value === value)?.label ?? value
}

export function labelForWorkflowAssigneeType(value: string) {
  return WORKFLOW_ASSIGNEE_TYPE_OPTIONS.find(o => o.value === value)?.label ?? value
}

export function labelForWorkflowVentanillaRole(value: string | null | undefined) {
  if (!value)
    return 'Sin integración'

  return WORKFLOW_VENTANILLA_ROLE_OPTIONS.find(o => o.value === value)?.label ?? value
}
