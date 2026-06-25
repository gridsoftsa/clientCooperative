import type { UserAccountStatus } from '~/types/user'

export interface UserCreateDraft {
  form: {
    name: string
    full_name: string
    phone: string
    is_active: boolean
    email: string
    password: string
    password_confirmation: string
    sucursal_id: number | null
    org_staff_id: number | null
    allowed_sucursal_ids: number[]
    roles: string[]
  }
  accountStatus: UserAccountStatus
  selectedRole: string | null
  returnTo: string | null
}

export const USER_CREATE_DRAFT_KEY = 'user-create-draft'
export const USER_CREATE_RETURN_PATH = '/settings/users/create'

export function saveUserCreateDraft(draft: UserCreateDraft): void {
  if (!import.meta.client) {
    return
  }
  sessionStorage.setItem(USER_CREATE_DRAFT_KEY, JSON.stringify(draft))
}

export function readUserCreateDraft(): UserCreateDraft | null {
  if (!import.meta.client) {
    return null
  }
  const raw = sessionStorage.getItem(USER_CREATE_DRAFT_KEY)
  if (!raw) {
    return null
  }
  try {
    return JSON.parse(raw) as UserCreateDraft
  } catch {
    return null
  }
}

export function clearUserCreateDraft(): void {
  if (!import.meta.client) {
    return
  }
  sessionStorage.removeItem(USER_CREATE_DRAFT_KEY)
}
