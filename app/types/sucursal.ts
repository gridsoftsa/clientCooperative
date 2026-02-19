export interface Sucursal {
  id: number
  name: string
  code: string | null
  address: string | null
  phone: string | null
  city: string | null
  is_main: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}
