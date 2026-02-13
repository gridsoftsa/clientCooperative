export interface Permission {
  id: number
  name: string
  guard_name: string
}

export interface Role {
  id: number
  name: string
  guard_name: string
  permissions?: string[]
  permissions_count?: number
  created_at: string
  updated_at: string
}

export interface PaginatedRoles {
  data: Role[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}

export interface PaginatedPermissions {
  data: Permission[]
}
