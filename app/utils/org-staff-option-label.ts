import type { OrgStaffListItem } from '~/types/org-structure'

export function orgStaffDisplayName(staff: OrgStaffListItem): string {
  if (staff.full_name?.trim()) {
    return staff.full_name.trim()
  }

  return [
    staff.first_name,
    staff.second_name,
    staff.first_last_name,
    staff.second_last_name,
  ].filter(Boolean).join(' ')
}

/**
 * Etiqueta para selects: persona primero (un cargo puede tener varios funcionarios).
 */
export function orgStaffOptionLabel(staff: OrgStaffListItem): string {
  const name = orgStaffDisplayName(staff)
  const doc = staff.document_number?.trim()
    ? `${staff.document_type?.trim() || 'CC'} ${staff.document_number.trim()}`
    : null
  const position = staff.current_assignment?.org_position
  const positionLabel = position
    ? (position.code ? `${position.name} (${position.code})` : position.name)
    : null
  const unit = staff.current_assignment?.org_unit
  const unitLabel = unit ? `${unit.code} — ${unit.name}` : null
  const email = staff.email?.trim() || staff.user?.email?.trim() || null

  return [name, doc, positionLabel, unitLabel, email].filter(Boolean).join(' · ')
}

export interface OrgStaffMultiselectOption {
  value: number
  label: string
  title: string
  subtitle: string
}

/** Opción para multiselect: título corto al elegir y detalle en varias líneas en el listado. */
export function orgStaffMultiselectOption(staff: OrgStaffListItem): OrgStaffMultiselectOption {
  const name = orgStaffDisplayName(staff)
  const doc = staff.document_number?.trim()
    ? `${staff.document_type?.trim() || 'CC'} ${staff.document_number.trim()}`
    : null
  const position = staff.current_assignment?.org_position
  const positionLabel = position
    ? (position.code ? `${position.name} (${position.code})` : position.name)
    : null
  const unit = staff.current_assignment?.org_unit
  const unitLabel = unit ? `${unit.code} — ${unit.name}` : null
  const email = staff.email?.trim() || staff.user?.email?.trim() || null
  const subtitle = [doc, positionLabel, unitLabel, email].filter(Boolean).join(' · ')

  return {
    value: staff.id,
    label: doc ? `${name} · ${doc}` : name,
    title: name,
    subtitle,
  }
}
