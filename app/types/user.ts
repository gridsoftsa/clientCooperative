export interface User {
  id: number
  name: string
  full_name?: string | null
  phone?: string | null
  is_active?: boolean
  email: string
  email_verified_at?: string | null
  sucursal_id?: number | null
  sucursal?: { id: number; name: string; code: string | null } | null
  allowed_sucursal_ids?: number[]
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
