import type { OrgOfficeType } from '~/types/org-structure'

export const ORG_OFFICE_TYPE_OPTIONS: { value: OrgOfficeType; label: string }[] = [
  { value: 'main', label: 'Principal' },
  { value: 'branch', label: 'Agencia / sucursal' },
  { value: 'headquarters', label: 'Sede / matriz' },
]
