/**
 * Sincroniza el valor del Multiselect de municipio (radicación) con los campos `city` / `state` del API de agencias (org-offices).
 */
export function useOrgOfficeMunicipalitySync() {
  const { getByLabel } = useMunicipalities()

  /** Valor mostrado en el Multiselect a partir de lo guardado en servidor. */
  function labelForForm(city?: string | null, state?: string | null): string {
    const c = (city ?? '').trim()
    const s = (state ?? '').trim()
    if (!c) {
      return ''
    }
    if (s) {
      return `${c} (${s})`
    }

    return c
  }

  /**
   * Campos `city` / `state` para el API.
   * Si coincide con el catálogo, separa municipio y departamento; si no, solo `city`.
   * Vacío → `null` (mismo criterio que el formulario anterior al guardar edición).
   */
  function apiBodyLocation(label: string): { city: string | null; state: string | null } {
    const trimmed = label.trim()
    if (!trimmed) {
      return { city: null, state: null }
    }

    const m = getByLabel(trimmed)
    if (m) {
      const cityName = (m.name || '').trim().slice(0, 120)
      const dept = (m.department?.name || '').trim().slice(0, 120)

      return {
        city: cityName !== '' ? cityName : null,
        state: dept !== '' ? dept : null,
      }
    }

    return {
      city: trimmed.slice(0, 120),
      state: null,
    }
  }

  return { labelForForm, apiBodyLocation }
}
