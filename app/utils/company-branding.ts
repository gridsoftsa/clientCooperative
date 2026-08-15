import {
  DEFAULT_COMPANY_PRIMARY_COLOR,
  DEFAULT_COMPANY_SECONDARY_COLOR,
  type CompanyBranding,
} from '~/types/company'

const BRANDING_CSS_PROPERTIES = [
  '--primary',
  '--primary-foreground',
  '--header',
  '--header-foreground',
  '--header-border',
  '--sidebar-primary',
  '--sidebar-primary-foreground',
  '--sidebar-ring',
  '--ring',
  '--secondary',
  '--secondary-foreground',
  '--accent',
  '--accent-foreground',
  '--vis-primary-color',
] as const

export function resolveCompanyLogoUrl(
  logoUrl: string | null | undefined,
  apiBase: string,
): string | null {
  if (!logoUrl) {
    return null
  }

  if (
    logoUrl.startsWith('http://')
    || logoUrl.startsWith('https://')
    || logoUrl.startsWith('data:')
    || logoUrl.startsWith('blob:')
  ) {
    return logoUrl
  }

  const base = apiBase.replace(/\/$/, '')

  return logoUrl.startsWith('/') ? `${base}${logoUrl}` : `${base}/${logoUrl}`
}

export function normalizeHexColor(value: string | null | undefined, fallback: string): string {
  if (!value || !/^#[0-9A-Fa-f]{6}$/.test(value)) {
    return fallback.toUpperCase()
  }

  return value.toUpperCase()
}

export function contrastForeground(hex: string): string {
  const normalized = normalizeHexColor(hex, '#000000')
  const r = Number.parseInt(normalized.slice(1, 3), 16)
  const g = Number.parseInt(normalized.slice(3, 5), 16)
  const b = Number.parseInt(normalized.slice(5, 7), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

  return luminance > 0.6 ? '#1C1917' : '#FFFFFF'
}

export function hasConfiguredCompanyBrandColors(branding: CompanyBranding | null | undefined): boolean {
  if (!branding) {
    return false
  }

  const hasPrimary = Boolean(branding.primary_color && /^#[0-9A-Fa-f]{6}$/.test(branding.primary_color))
  const hasSecondary = Boolean(branding.secondary_color && /^#[0-9A-Fa-f]{6}$/.test(branding.secondary_color))

  return hasPrimary || hasSecondary
}

export function resolveBrandingColors(branding: CompanyBranding | null): {
  primary: string
  secondary: string
} {
  return {
    primary: normalizeHexColor(branding?.primary_color, DEFAULT_COMPANY_PRIMARY_COLOR),
    secondary: normalizeHexColor(branding?.secondary_color, DEFAULT_COMPANY_SECONDARY_COLOR),
  }
}

function brandingTarget(): HTMLElement | null {
  if (!import.meta.client) {
    return null
  }

  return document.body
}

export function applyCompanyBrandingColors(primary: string, secondary: string, isDark: boolean): void {
  const target = brandingTarget()
  if (!target) {
    return
  }

  const primaryForeground = contrastForeground(primary)
  const secondaryForeground = contrastForeground(secondary)
  const accentBase = isDark ? '#1c1917' : '#ffffff'

  target.style.setProperty('--primary', primary)
  target.style.setProperty('--primary-foreground', primaryForeground)
  target.style.setProperty('--header', primary)
  target.style.setProperty('--header-foreground', primaryForeground)
  target.style.setProperty('--header-border', `color-mix(in srgb, ${primaryForeground} 22%, ${primary})`)
  target.style.setProperty('--sidebar-primary', primary)
  target.style.setProperty('--sidebar-primary-foreground', primaryForeground)
  target.style.setProperty('--sidebar-ring', `color-mix(in srgb, ${primary} 70%, white)`)
  target.style.setProperty('--ring', `color-mix(in srgb, ${primary} 70%, white)`)
  target.style.setProperty('--secondary', secondary)
  target.style.setProperty('--secondary-foreground', secondaryForeground)
  target.style.setProperty('--accent', `color-mix(in srgb, ${secondary} 24%, ${accentBase})`)
  target.style.setProperty('--accent-foreground', isDark ? '#FAFAF9' : '#292524')
  target.style.setProperty('--vis-primary-color', primary)
}

export function clearCompanyBrandingColors(): void {
  const target = brandingTarget()
  if (!target) {
    return
  }

  for (const property of BRANDING_CSS_PROPERTIES) {
    target.style.removeProperty(property)
  }
}
