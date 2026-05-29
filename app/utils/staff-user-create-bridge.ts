export interface StaffCreateDraft {
  user_id: number | null
  first_name: string
  second_name: string
  first_last_name: string
  second_last_name: string
  email: string
  phone: string
  extension: string
  document_number: string
  is_active: boolean
}

export interface UserCreatePrefillFromStaff {
  name: string
  full_name: string
  email: string
  phone: string
}

export const STAFF_CREATE_DRAFT_KEY = 'org-staff-create-draft'
export const USER_CREATE_PREFILL_FROM_STAFF_KEY = 'user-create-prefill-from-staff'
export const STAFF_CREATE_RETURN_PATH = '/settings/organizational-structure/staff/create'

export function buildFullNameFromStaffParts(
  firstName: string,
  secondName: string,
  firstLastName: string,
  secondLastName: string,
): string {
  return [firstName, secondName, firstLastName, secondLastName]
    .map(part => part.trim())
    .filter(Boolean)
    .join(' ')
}

export function suggestUsernameFromStaff(
  staff: Pick<StaffCreateDraft, 'email' | 'first_name' | 'first_last_name'>,
): string {
  const email = staff.email.trim()
  if (email.includes('@')) {
    return email.split('@')[0]!.toLowerCase().replace(/[^a-z0-9._-]/g, '')
  }

  const base = `${staff.first_name.trim()}.${staff.first_last_name.trim()}`.toLowerCase()

  return base.replace(/\s+/g, '.').replace(/[^a-z0-9._-]/g, '')
}

export function userCreatePrefillFromStaff(staff: StaffCreateDraft): UserCreatePrefillFromStaff {
  return {
    name: suggestUsernameFromStaff(staff),
    full_name: buildFullNameFromStaffParts(
      staff.first_name,
      staff.second_name,
      staff.first_last_name,
      staff.second_last_name,
    ),
    email: staff.email.trim(),
    phone: staff.phone.trim(),
  }
}

export function hasStaffPersonalInfoForUserPrefill(staff: StaffCreateDraft): boolean {
  return Boolean(
    staff.first_name.trim()
    || staff.first_last_name.trim()
    || staff.email.trim()
    || staff.phone.trim(),
  )
}
