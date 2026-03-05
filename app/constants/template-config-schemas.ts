/**
 * Esquemas de configuración para la página de configurar plantillas.
 * Define orden, tipos de campo y fórmulas por template_key.
 */
import { computeFormula } from '~/constants/credits-financial-templates'

export type TemplateConfigFieldType = 'money' | 'number' | 'text' | 'formula'

export interface TemplateConfigField {
  key: string
  label: string
  type: TemplateConfigFieldType
  /** Para type='formula': clave de la fórmula en formulaComputers */
  formulaKey?: string
  /** Fórmula legible para mostrar (ej: "precio compra ÷ precio kg") */
  formulaDisplay?: string
}

export interface TemplateConfigSchema {
  template_key: string
  sections: Array<{
    key: string
    title?: string
    fields: TemplateConfigField[]
  }>
}

const schemaGanadoCeba: TemplateConfigSchema = {
  template_key: 'ganado-ceba',
  sections: [
    {
      key: 'valores',
      title: 'Valores estandarizados',
      fields: [
        { key: 'precio_compra_animal', label: 'Precio compra por animal', type: 'money' },
        { key: 'precio_kg_animal', label: 'Precio por kg', type: 'money' },
        {
          key: 'peso_kg_inicial',
          label: 'Peso inicial (kg)',
          type: 'formula',
          formulaKey: 'ganado_ceba_peso_inicial',
          formulaDisplay: 'compra ÷ precio kg',
        },
        { key: 'peso_kg_final', label: 'Peso final kg', type: 'number' },
        { key: 'costo_por_kg', label: 'Costo por kg', type: 'money' },
      ],
    },
    {
      key: 'informacion_referencia',
      title: 'Información de referencia',
      fields: [
        { key: 'ref_levante_edad', label: 'Ref. levante edad', type: 'text' },
        { key: 'ref_levante_peso', label: 'Ref. levante peso', type: 'text' },
        { key: 'ref_ceba_edad', label: 'Ceba edad', type: 'text' },
        { key: 'ref_ceba_peso', label: 'Ref. ceba peso', type: 'text' },
      ],
    },
  ],
}

const schemaCerdosCria: TemplateConfigSchema = {
  template_key: 'cerdos-cria',
  sections: [
    {
      key: 'valores_estandar_cerda',
      title: 'Valores estándar por cerda',
      fields: [
        { key: 'lechones_destetados', label: 'Lechones destetados', type: 'number' },
        { key: 'peso_final_destete_kg', label: 'Peso final del destete (kg)', type: 'number' },
      ],
    },
    {
      key: 'costos',
      title: 'Discriminación de costos',
      fields: [
        { key: 'valor_sostenimiento_madre', label: 'Sostenimiento de madre – Valor', type: 'formula', formulaKey: 'cerdos_cria_valor_sostenimiento_madre', formulaDisplay: 'Costo total × %' },
        { key: 'pct_sostenimiento_madre', label: 'Sostenimiento de madre – %', type: 'number' },
        { key: 'valor_alimentacion_lechon', label: 'Alimentación lechón – Valor', type: 'formula', formulaKey: 'cerdos_cria_valor_alimentacion_lechon', formulaDisplay: 'Costo total × %' },
        { key: 'pct_alimentacion_lechon', label: 'Alimentación lechón – %', type: 'number' },
        { key: 'valor_medicamento_complementos', label: 'Medicamento y complementos – Valor', type: 'formula', formulaKey: 'cerdos_cria_valor_medicamento_complementos', formulaDisplay: 'Costo total × %' },
        { key: 'pct_medicamento_complementos', label: 'Medicamento y complementos – %', type: 'number' },
        { key: 'valor_mano_obra_cerdos', label: 'Mano de obra – Valor', type: 'formula', formulaKey: 'cerdos_cria_valor_mano_obra', formulaDisplay: 'Costo total × %' },
        { key: 'pct_mano_obra_cerdos', label: 'Mano de obra – %', type: 'number' },
        { key: 'valor_mantenimiento_infraestructura', label: 'Mantenimiento infraestructura – Valor', type: 'formula', formulaKey: 'cerdos_cria_valor_mantenimiento_infraestructura', formulaDisplay: 'Costo total × %' },
        { key: 'pct_mantenimiento_infraestructura', label: 'Mantenimiento infraestructura – %', type: 'number' },
        { key: 'total_costos_cerdos_cria', label: 'Total', type: 'formula', formulaKey: 'cerdos_cria_total_costos', formulaDisplay: 'Suma' },
      ],
    },
  ],
}

const TEMPLATE_CONFIG_SCHEMAS: Record<string, TemplateConfigSchema> = {
  'ganado-ceba': schemaGanadoCeba,
  'cerdos-cria': schemaCerdosCria,
}

export function getTemplateConfigSchema(templateKey: string): TemplateConfigSchema | null {
  return TEMPLATE_CONFIG_SCHEMAS[templateKey] ?? null
}

/** Claves que no deben mostrarse en la configuración (son dinámicos, se calculan por radicación). */
export const EXCLUDED_CONFIG_KEYS: Record<string, string[]> = {
  'cerdos-cria': ['pct_costos_estandar'],
}

/** Devuelve las claves de campos que provienen de la configuración (valores estandarizados, etc.). */
export function getConfigFieldKeys(templateKey: string): string[] {
  const schema = getTemplateConfigSchema(templateKey)
  if (!schema) return []
  const keys: string[] = []
  for (const section of schema.sections) {
    for (const field of section.fields) {
      keys.push(field.key)
    }
  }
  return keys
}

export function computeFormulaForConfig(
  formulaKey: string,
  configData: Record<string, unknown>,
): number | null {
  return computeFormula(formulaKey, configData)
}
