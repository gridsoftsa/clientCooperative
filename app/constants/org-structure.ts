import type { OrgOfficeType } from '~/types/org-structure'

/** Valores internos del multiselect de estado (API sigue usando `boolean` en `is_active`). */
export type OrgRecordActiveValue = 'active' | 'inactive'

export const ORG_RECORD_ACTIVE_OPTIONS_MASC: { value: OrgRecordActiveValue; label: string }[] = [
  { value: 'active', label: 'Activo' },
  { value: 'inactive', label: 'Inactivo' },
]

export const ORG_RECORD_ACTIVE_OPTIONS_FEM: { value: OrgRecordActiveValue; label: string }[] = [
  { value: 'active', label: 'Activa' },
  { value: 'inactive', label: 'Inactiva' },
]

export function orgActiveValueToBool(value: OrgRecordActiveValue): boolean {
  return value === 'active'
}

export function boolToOrgActiveValue(isActive: boolean): OrgRecordActiveValue {
  return isActive ? 'active' : 'inactive'
}

/** Sí / No para multiselects de una sola opción (p. ej. «a cargo del área»). */
export type OrgYesNoChoice = 'yes' | 'no'

export const ORG_YES_NO_OPTIONS: { value: OrgYesNoChoice; label: string }[] = [
  { value: 'no', label: 'No' },
  { value: 'yes', label: 'Sí' },
]

export const ORG_OFFICE_TYPE_OPTIONS: { value: OrgOfficeType; label: string }[] = [
  { value: 'main', label: 'Principal' },
  { value: 'branch', label: 'Agencia / sucursal' },
  { value: 'headquarters', label: 'Sede / matriz' },
]
