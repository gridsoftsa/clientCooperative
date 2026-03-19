/**
 * Catálogo de municipios/ciudades desde municipalities.json.
 * Usado para ciudad de residencia y datos de dirección en formularios.
 */
import municipalitiesData from '~/lib/municipalities.json'

export interface MunicipalityDepartment {
  id: number
  name: string
  code: string
}

export interface Municipality {
  id: number
  department_id: number
  name: string
  code: string
  department: MunicipalityDepartment
}

const municipalities = municipalitiesData as Municipality[]

export function useMunicipalities() {
  const list = computed(() => municipalities)

  /** Opciones para Select: municipio (departamento) */
  const options = computed(() =>
    list.value.map((m) => ({
      id: m.id,
      name: m.name,
      departmentName: m.department?.name ?? '',
      label: m.department?.name ? `${m.name} (${m.department.name})` : m.name,
    })),
  )

  /** Opciones para @vueform/multiselect: value=id, label=texto (para ciudad residencia) */
  const multiselectOptionsByCity = computed(() =>
    options.value.map((o) => ({ value: o.id, label: o.label })),
  )

  /** Opciones para @vueform/multiselect: value=label (para lugar expedición, guardar texto) */
  const multiselectOptionsByLabel = computed(() =>
    options.value.map((o) => ({ value: o.label, label: o.label })),
  )

  function getById(id: number | undefined): Municipality | undefined {
    if (id == null) return undefined
    return list.value.find((m) => m.id === id)
  }

  /** Obtener municipio por label (ej. "Bogotá (Cundinamarca)") */
  function getByLabel(label: string | undefined): Municipality | undefined {
    if (!label?.trim()) return undefined
    return list.value.find((m) => getLabel(m) === label.trim())
  }

  /** Label para mostrar (municipio + departamento) */
  function getLabel(m: Municipality): string {
    return m.department?.name ? `${m.name} (${m.department.name})` : m.name
  }

  /** Normaliza texto quitando tildes para búsqueda insensible a acentos. */
  function normalizeForSearch(str: string): string {
    return str.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
  }

  /**
   * Opciones filtradas por búsqueda, limitadas para no renderizar miles de ítems.
   * Busca en nombre del municipio y nombre del departamento (insensible a tildes).
   */
  function getFilteredOptions(search: string, limit = 80): Array<{ id: number; label: string }> {
    const q = normalizeForSearch(search.trim())
    if (!q) {
      return options.value.slice(0, limit).map((o) => ({ id: o.id, label: o.label }))
    }
    const filtered: Array<{ id: number; label: string }> = []
    for (const o of options.value) {
      if (filtered.length >= limit) break
      const match =
        normalizeForSearch(o.label).includes(q) || normalizeForSearch(o.departmentName).includes(q)
      if (match) filtered.push({ id: o.id, label: o.label })
    }
    return filtered
  }

  return {
    municipalities: list,
    options,
    multiselectOptionsByCity,
    multiselectOptionsByLabel,
    getById,
    getByLabel,
    getLabel,
    getFilteredOptions,
  }
}
