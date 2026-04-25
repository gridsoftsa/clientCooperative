/**
 * Plantillas en `activity_template_flat_data` con estructura `{ options: [{ value, label }] }`
 * para listas de radicación (solicitante, codeudores) y catálogos de análisis (p. ej. bancos).
 */
export const RADICACION_OPTION_CATALOG_TEMPLATE_KEYS = [
  'genero',
  'tipo-documento',
  'tipo-vivienda',
  'actividad-economica',
  'estado-civil',
  'bancos',
] as const

export type RadicacionOptionCatalogTemplateKey = (typeof RADICACION_OPTION_CATALOG_TEMPLATE_KEYS)[number]

export function isRadicacionOptionCatalogTemplate(templateKey: string): templateKey is RadicacionOptionCatalogTemplateKey {
  return (RADICACION_OPTION_CATALOG_TEMPLATE_KEYS as readonly string[]).includes(templateKey)
}

/** Nombre del campo en el formulario de radicación (texto de ayuda en parametrización). */
export const RADICACION_OPTION_CATALOG_FIELD_LABELS: Record<RadicacionOptionCatalogTemplateKey, string> = {
  genero: 'Género',
  'tipo-documento': 'Tipo de documento',
  'tipo-vivienda': 'Tipo de vivienda',
  'actividad-economica': 'Tipo de actividad económica',
  'estado-civil': 'Estado civil',
  bancos: 'Bancos',
}
