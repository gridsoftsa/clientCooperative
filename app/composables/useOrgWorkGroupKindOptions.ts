import { ORG_WORK_GROUP_KIND_OPTIONS } from '~/constants/org-work-groups'

/**
 * Opciones de `group_kind` para grupos/comités: GET `/catalogs/template-flat-data/org-work-group-kind`
 * con respaldo a `ORG_WORK_GROUP_KIND_OPTIONS`.
 */
export function useOrgWorkGroupKindOptions() {
  const fallbacks = ORG_WORK_GROUP_KIND_OPTIONS.map(o => ({ value: o.value, label: o.label }))
  return useTemplateFlatCatalogOptions('org-work-group-kind', fallbacks)
}
