/**
 * Vista previa de clave de flujo (misma convención que el API al crear).
 */
export function suggestWorkflowDefinitionKey(name: string): string {
  let base = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

  if (!base) {
    base = 'workflow'
  }

  if (!base.endsWith('_workflow')) {
    base = `${base}_workflow`
  }

  return base.slice(0, 64).replace(/_+$/, '') || 'workflow'
}

/**
 * Vista previa de clave de etapa (misma convención que el API al crear).
 */
export function suggestWorkflowStageKey(name: string): string {
  let base = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

  if (!base) {
    base = 'stage'
  }

  return base.slice(0, 64).replace(/_+$/, '') || 'stage'
}
