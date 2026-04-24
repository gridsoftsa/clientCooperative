import type { FlatCatalogOption } from './useTemplateFlatCatalogOptions'

const FALLBACK_GENDER_OPTIONS: FlatCatalogOption[] = [
  { value: 'M', label: 'Masculino' },
  { value: 'F', label: 'Femenino' },
  { value: 'Otro', label: 'Otro' },
  { value: 'Prefiero no decir', label: 'Prefiero no decir' },
]

export type GenderCatalogOption = FlatCatalogOption

/**
 * Opciones de género parametrizadas (template_key `genero`).
 */
export function useGenderCatalogOptions() {
  const { options, loading, fetchOptions, labelForValue, fallbacks } = useTemplateFlatCatalogOptions(
    'genero',
    FALLBACK_GENDER_OPTIONS,
  )
  return {
    options,
    loading,
    fetchOptions,
    labelForValue,
    FALLBACK_GENDER_OPTIONS,
    fallbacks,
  }
}
