export interface AuthUser {
  id: number
  name: string
  full_name?: string | null
  phone?: string | null
  is_active?: boolean
  must_change_password?: boolean
  password_expires_at?: string | null
  password_expired?: boolean
  days_until_password_expiry?: number | null
  password_expiration_enabled?: boolean
  email: string
  email_verified_at?: string | null
  created_at?: string
  updated_at?: string
  sucursal_id?: number | null
  sucursal?: { id: number; name: string; code: string | null } | null
  roles?: string[]
  permissions?: string[]
}
