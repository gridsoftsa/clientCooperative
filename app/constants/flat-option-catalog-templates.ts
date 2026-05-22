/**
 * Plantillas `activity_template_flat_data` con estructura `{ options: [{ value, label }] }`
 * usadas en parametrización (radicación, estructura, …).
 */
import { ORG_WORK_GROUP_KIND_OPTIONS } from '~/constants/org-work-groups'
import {
  isRadicacionOptionCatalogTemplate,
  RADICACION_OPTION_CATALOG_FIELD_LABELS,
} from '~/constants/radicacion-catalog-templates'

export const ESTRUCTURA_OPTION_CATALOG_TEMPLATE_KEYS = ['org-work-group-kind'] as const

export type EstructuraOptionCatalogTemplateKey = (typeof ESTRUCTURA_OPTION_CATALOG_TEMPLATE_KEYS)[number]

export const ESTRUCTURA_OPTION_CATALOG_FIELD_LABELS: Record<EstructuraOptionCatalogTemplateKey, string> = {
  'org-work-group-kind': 'Tipo de grupo o comité',
}

export function isEstructuraOptionCatalogTemplate(templateKey: string): templateKey is EstructuraOptionCatalogTemplateKey {
  return (ESTRUCTURA_OPTION_CATALOG_TEMPLATE_KEYS as readonly string[]).includes(templateKey)
}

/**
 * Defaults alineados al seeder / migración API (`OrgWorkGroupKindFlatConfig.php`) para mostrar
 * Parametrización → Estructura antes de que exista fila en `activity_template_flat_data`.
 */
export function defaultConfigDataForEstructuraOptionCatalog(
  templateKey: string,
): Record<string, unknown> | null {
  if (templateKey === 'org-work-group-kind') {
    return {
      options: ORG_WORK_GROUP_KIND_OPTIONS.map(o => ({ value: o.value, label: o.label })),
    }
  }

  return null
}

export function isFlatOptionCatalogTemplate(templateKey: string): boolean {
  return isRadicacionOptionCatalogTemplate(templateKey) || isEstructuraOptionCatalogTemplate(templateKey)
}

export function flatOptionCatalogFieldLabel(templateKey: string): string {
  if (isRadicacionOptionCatalogTemplate(templateKey)) {
    return RADICACION_OPTION_CATALOG_FIELD_LABELS[templateKey]
  }
  if (isEstructuraOptionCatalogTemplate(templateKey)) {
    return ESTRUCTURA_OPTION_CATALOG_FIELD_LABELS[templateKey as EstructuraOptionCatalogTemplateKey]
  }
  return ''
}
