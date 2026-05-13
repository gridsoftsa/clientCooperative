/** Estados de cuenta alineados con la API (sin multitenancy). */
export type UserAccountStatus = 'pending' | 'active' | 'inactive' | 'blocked' | 'suspended'

export interface User {
  id: number
  name: string
  full_name?: string | null
  phone?: string | null
  is_active?: boolean
  account_status?: UserAccountStatus
  status_change_reason?: string | null
  last_login_at?: string | null
  locked_until?: string | null
  email: string
  email_verified_at?: string | null
  sucursal_id?: number | null
  sucursal?: { id: number; name: string; code: string | null } | null
  allowed_sucursal_ids?: number[]
  org_staff_id?: number | null
  org_staff?: { id: number; full_name: string; email?: string | null } | null
  roles?: string[]
  permissions?: string[]
  created_at: string
  updated_at: string
}

export interface PaginatedUsers {
  data: User[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}
