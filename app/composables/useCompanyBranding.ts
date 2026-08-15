import type { ThemeColor } from '@/constants/themes'
import { DEFAULT_THEME_COLOR } from '@/constants/themes'
import {
  colorsMatchThemePreset,
  defaultInstitutionalColors,
  themeBrandColorsFor,
} from '~/constants/theme-brand-colors'
import {
  applyCompanyBrandingColors,
  clearCompanyBrandingColors,
  hasConfiguredCompanyBrandColors,
  resolveBrandingColors,
} from '~/utils/company-branding'
import type { CompanyBranding } from '~/types/company'

export const COMPANY_CUSTOM_THEME_COLOR = 'personalizado' as const

export interface InstitutionalColors {
  primary: string
  secondary: string
}

export function useCompanyBranding() {
  const config = useRuntimeConfig()
  const colorMode = useColorMode()
  const { theme, updateAppSettings } = useAppSettings()
  const branding = useState<CompanyBranding | null>('company-branding', () => null)
  const institutionalColors = useState<InstitutionalColors>('company-institutional-colors', () => defaultInstitutionalColors())

  const hasConfiguredBrandColors = computed(() => hasConfiguredCompanyBrandColors(branding.value))
  const brandPreviewPrimary = computed(() => institutionalColors.value.primary)

  function setInstitutionalColors(primary: string, secondary: string): void {
    institutionalColors.value = {
      primary: primary.toUpperCase(),
      secondary: secondary.toUpperCase(),
    }

    if (branding.value) {
      branding.value = {
        ...branding.value,
        primary_color: institutionalColors.value.primary,
        secondary_color: institutionalColors.value.secondary,
      }
    }
  }

  function syncInstitutionalColorsFromTheme(themeColor: ThemeColor): void {
    if (themeColor === COMPANY_CUSTOM_THEME_COLOR) {
      const { primary, secondary } = resolveBrandingColors(branding.value)
      setInstitutionalColors(primary, secondary)

      return
    }

    const preset = themeBrandColorsFor(themeColor)
    if (preset) {
      setInstitutionalColors(preset.primary, preset.secondary)
    }
  }

  function activatePersonalizadoTheme(): void {
    if (theme.value?.color !== COMPANY_CUSTOM_THEME_COLOR) {
      updateAppSettings({ theme: { color: COMPANY_CUSTOM_THEME_COLOR } })
    }
  }

  function applyCurrentBranding(): void {
    if (!branding.value || !import.meta.client) {
      return
    }

    if (theme.value?.color !== COMPANY_CUSTOM_THEME_COLOR) {
      clearCompanyBrandingColors()

      return
    }

    const { primary, secondary } = institutionalColors.value
    applyCompanyBrandingColors(primary, secondary, colorMode.value === 'dark')
  }

  function applyThemeAfterInstitutionalSave(): void {
    const currentTheme = (theme.value?.color ?? DEFAULT_THEME_COLOR) as ThemeColor

    if (
      currentTheme === COMPANY_CUSTOM_THEME_COLOR
      || !colorsMatchThemePreset(currentTheme, institutionalColors.value.primary, institutionalColors.value.secondary)
    ) {
      activatePersonalizadoTheme()

      if (import.meta.client) {
        applyCompanyBrandingColors(
          institutionalColors.value.primary,
          institutionalColors.value.secondary,
          colorMode.value === 'dark',
        )
      }

      return
    }

    applyCurrentBranding()
  }

  async function fetchBranding(): Promise<void> {
    const base = String(config.public.apiBase || 'http://localhost:8585').replace(/\/$/, '')

    const response = await $fetch<{ data: CompanyBranding }>(`${base}/api/company/branding`, {
      credentials: 'include',
    })

    branding.value = response.data

    const { primary, secondary } = resolveBrandingColors(branding.value)
    setInstitutionalColors(primary, secondary)

    if (!hasConfiguredCompanyBrandColors(branding.value)) {
      applyCurrentBranding()

      return
    }

    const currentTheme = (theme.value?.color ?? DEFAULT_THEME_COLOR) as ThemeColor

    if (
      currentTheme === COMPANY_CUSTOM_THEME_COLOR
      || !colorsMatchThemePreset(currentTheme, primary, secondary)
    ) {
      activatePersonalizadoTheme()

      if (import.meta.client) {
        applyCompanyBrandingColors(primary, secondary, colorMode.value === 'dark')
      }

      return
    }

    applyCurrentBranding()
  }

  if (import.meta.client) {
    watch(() => colorMode.value, () => {
      applyCurrentBranding()
    })

    watch(() => theme.value?.color, () => {
      applyCurrentBranding()
    })
  }

  const displayName = computed(() => branding.value?.name?.trim() || 'Cooperativa')
  const logoUrl = computed(() => branding.value?.logo_url || null)

  const resolvedLogoUrl = computed(() => {
    const url = logoUrl.value
    if (!url) {
      return null
    }

    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url
    }

    const base = String(config.public.apiBase || 'http://localhost:8585').replace(/\/$/, '')

    return url.startsWith('/') ? `${base}${url}` : `${base}/${url}`
  })

  return {
    branding,
    institutionalColors,
    displayName,
    logoUrl,
    resolvedLogoUrl,
    hasConfiguredBrandColors,
    brandPreviewPrimary,
    fetchBranding,
    refreshBranding: fetchBranding,
    applyCurrentBranding,
    activatePersonalizadoTheme,
    setInstitutionalColors,
    syncInstitutionalColorsFromTheme,
    applyThemeAfterInstitutionalSave,
  }
}
