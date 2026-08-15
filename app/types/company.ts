export interface Company {
  id: number
  name: string
  nit: string | null
  razon_social: string | null
  legal_representative: string | null
  logo: string | null
  logo_url: string | null
  primary_color: string | null
  secondary_color: string | null
  created_at: string
  updated_at: string
}

export interface CompanyBranding {
  name: string
  logo_url: string | null
  primary_color: string | null
  secondary_color: string | null
}

export const DEFAULT_COMPANY_PRIMARY_COLOR = '#125EAD'
export const DEFAULT_COMPANY_SECONDARY_COLOR = '#FBAC18'
