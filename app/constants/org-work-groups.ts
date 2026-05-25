/** Valores técnicos `group_kind` (API); etiquetas en español para la UI. */
export const ORG_WORK_GROUP_KIND_OPTIONS = [
  { value: 'committee_archives', label: 'Comité de archivo' },
  { value: 'committee_credit', label: 'Comité de crédito' },
  { value: 'committee_risk', label: 'Comité de riesgos' },
  { value: 'committee_information_security', label: 'Comité de seguridad de la información' },
  { value: 'work_team', label: 'Equipo de trabajo / comité ad-hoc' },
] as const

export type OrgWorkGroupKindValue = (typeof ORG_WORK_GROUP_KIND_OPTIONS)[number]['value']

/** Etiquetas para resumen de miembros (valores `kind` en inglés en API). */
export const ORG_WORK_GROUP_MEMBER_KIND_LABELS: Record<'staff' | 'position' | 'unit', string> = {
  staff: 'Funcionario concreto',
  position: 'Cargo en un área concreta (en catálogo cada cargo ya pertenece a un área)',
  unit: 'Área completa (todos los asignados a esa dependencia)',
}

/** Roles directivos del comité (API `office_role`). */
export const ORG_WORK_GROUP_OFFICE_ROLE_LABELS: Record<
  'president' | 'secretary' | 'president_delegate' | 'secretary_delegate',
  string
> = {
  president: 'Presidente(a)',
  secretary: 'Secretario(a)',
  president_delegate: 'Delegado(a) del presidente',
  secretary_delegate: 'Delegado(a) del secretario',
}

