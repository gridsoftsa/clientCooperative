import type { ThemeColor } from '@/constants/themes'
import {
  DEFAULT_COMPANY_PRIMARY_COLOR,
  DEFAULT_COMPANY_SECONDARY_COLOR,
} from '~/types/company'
import { normalizeHexColor } from '~/utils/company-branding'

export interface ThemeBrandColors {
  primary: string
  secondary: string
}

/** Colores institucionales equivalentes a cada paleta del selector de tema. */
export const THEME_BRAND_COLORS: Record<Exclude<ThemeColor, 'personalizado'>, ThemeBrandColors> = {
  default: { primary: '#44403C', secondary: '#78716C' },
  cooperative: { primary: '#125EAD', secondary: '#FBAC18' },
  blue: { primary: '#1D4ED8', secondary: '#60A5FA' },
  green: { primary: '#65A30D', secondary: '#A3E635' },
  red: { primary: '#DC2626', secondary: '#F87171' },
  rose: { primary: '#E11D48', secondary: '#FB7185' },
  violet: { primary: '#7C3AED', secondary: '#A78BFA' },
  orange: { primary: '#EA580C', secondary: '#FB923C' },
  yellow: { primary: '#CA8A04', secondary: '#FACC15' },
  teal: { primary: '#0D9488', secondary: '#2DD4BF' },
}

export function themeBrandColorsFor(themeColor: ThemeColor): ThemeBrandColors | null {
  if (themeColor === 'personalizado') {
    return null
  }

  return THEME_BRAND_COLORS[themeColor] ?? null
}

export function colorsMatchThemePreset(
  themeColor: ThemeColor,
  primary: string,
  secondary: string,
): boolean {
  const preset = themeBrandColorsFor(themeColor)
  if (!preset) {
    return false
  }

  return normalizeHexColor(primary, '') === normalizeHexColor(preset.primary, '')
    && normalizeHexColor(secondary, '') === normalizeHexColor(preset.secondary, '')
}

export function defaultInstitutionalColors(): ThemeBrandColors {
  return {
    primary: DEFAULT_COMPANY_PRIMARY_COLOR,
    secondary: DEFAULT_COMPANY_SECONDARY_COLOR,
  }
}
