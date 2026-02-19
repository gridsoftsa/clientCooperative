export interface AuthUser {
  id: number
  name: string
  email: string
  email_verified_at?: string | null
  created_at?: string
  updated_at?: string
  sucursal_id?: number | null
  sucursal?: { id: number; name: string; code: string | null } | null
  roles?: string[]
  permissions?: string[]
}
