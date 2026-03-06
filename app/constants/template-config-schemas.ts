/**
 * Esquemas de configuración para la página de configurar plantillas.
 * Define orden, tipos de campo y fórmulas por template_key.
 */
import { computeFormula } from '~/constants/credits-financial-templates'
import { getAvesCostBreakdownFieldKeys } from '~/constants/aves-cost-breakdown'

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
    /** Layout alternativo: tabla de desglose de costos (aves-ponedoras) */
    layout?: 'avesCostBreakdownTable' | 'cultivoPermanenteFinagroTable' | 'cultivoPermanenteReferencia'
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
        { key: 'pct_sostenimiento_madre', label: 'Sostenimiento de madre – %', type: 'number' },
        { key: 'pct_alimentacion_lechon', label: 'Alimentación lechón – %', type: 'number' },
        { key: 'pct_medicamento_complementos', label: 'Medicamento y complementos – %', type: 'number' },
        { key: 'pct_mano_obra_cerdos', label: 'Mano de obra – %', type: 'number' },
        { key: 'pct_mantenimiento_infraestructura', label: 'Mantenimiento infraestructura – %', type: 'number' },
      ],
    },
  ],
}

const schemaCerdosCeba: TemplateConfigSchema = {
  template_key: 'cerdos-ceba',
  sections: [
    {
      key: 'valores_estandar_cerdo_ceba',
      title: 'Valores estándar por cerdo',
      fields: [
        { key: 'peso_promedio_kg_ceba', label: 'Peso final para la venta (kg)', type: 'number' },
      ],
    },
    {
      key: 'costos',
      title: 'Discriminación de costos',
      fields: [
        { key: 'pct_lechon_destetado', label: 'Lechón destetado – %', type: 'number' },
        { key: 'pct_alimentacion_ceba', label: 'Alimentación – %', type: 'number' },
        { key: 'pct_medicamento_complementos_ceba', label: 'Medicamento y complementos – %', type: 'number' },
        { key: 'pct_mano_obra_ceba', label: 'Mano de obra – %', type: 'number' },
      ],
    },
  ],
}

const schemaPollosEngorde: TemplateConfigSchema = {
  template_key: 'pollos-engorde',
  sections: [
    {
      key: 'valores_estandar_fenavi',
      title: 'Valores estándar FENAVI',
      fields: [
        { key: 'peso_kg_venta', label: 'Peso kg venta', type: 'number' },
        { key: 'precio_venta_pie_kg', label: 'Precio de venta en pie kg', type: 'money' },
        { key: 'costo_kg_venta', label: 'Costo x kg venta', type: 'money' },
        { key: 'tasa_mortalidad_pct', label: 'Tasa mortalidad (%)', type: 'number' },
        { key: 'precio_libra_conversion', label: 'Precio de libra conversión', type: 'money' },
      ],
    },
  ],
}

const schemaAvesPonedoras: TemplateConfigSchema = {
  template_key: 'aves-ponedoras',
  sections: [
    {
      key: 'valores_estandar_fenavi',
      title: 'Valores estándar FENAVI',
      fields: [
        { key: 'pct_costo_huevo', label: '% Costo x huevo', type: 'number' },
        { key: 'pct_mortalidad_postura', label: '% Mortalidad y postura', type: 'number' },
        { key: 'produccion_huevos_ave', label: 'Producción huevos x ave', type: 'number' },
      ],
    },
    {
      key: 'desglose_costos',
      title: 'Desglose de costos (SIPSA pequeño productor Santander)',
      layout: 'avesCostBreakdownTable',
      fields: [],
    },
  ],
}

const schemaCultivoPermanente: TemplateConfigSchema = {
  template_key: 'cultivo-permanente',
  sections: [
    {
      key: 'finagro',
      title: '% Costos y productividad por edad – FINAGRO (rangos configurables por producto)',
      layout: 'cultivoPermanenteFinagroTable',
      fields: [],
    },
    {
      key: 'referencia',
      title: 'Información de referencia y valores estándar',
      layout: 'cultivoPermanenteReferencia',
      fields: [],
    },
  ],
}

const schemaPecesTilapia: TemplateConfigSchema = {
  template_key: 'peces-tilapia',
  sections: [
    {
      key: 'valores_estandar',
      title: 'Valores estándar',
      fields: [
        { key: 'peces_por_estanque', label: 'Peces por estanque', type: 'number' },
        { key: 'unidad_por_m2', label: 'Unidad por m²', type: 'number' },
        { key: 'peso_final_libras', label: 'Peso final en libras', type: 'number' },
        { key: 'duracion_ciclo_dias', label: 'Duración del ciclo (días)', type: 'number' },
        { key: 'precio_venta_libra', label: 'Precio de venta por libra', type: 'money' },
      ],
    },
    {
      key: 'discriminacion_costos',
      title: 'Discriminación de costos (%)',
      fields: [
        { key: 'pct_mano_obra_tilapia', label: 'Mano de obra', type: 'number' },
        { key: 'pct_preparacion_estanque', label: 'Preparación estanque', type: 'number' },
        { key: 'pct_compra_especies', label: 'Compra de especies', type: 'number' },
        { key: 'pct_tratamientos_tilapia', label: 'Tratamientos', type: 'number' },
        { key: 'pct_sacrificio_tilapia', label: 'Sacrificio', type: 'number' },
        { key: 'pct_alimentacion_tilapia', label: 'Alimentación', type: 'number' },
      ],
    },
  ],
}

const TEMPLATE_CONFIG_SCHEMAS: Record<string, TemplateConfigSchema> = {
  'ganado-ceba': schemaGanadoCeba,
  'cerdos-cria': schemaCerdosCria,
  'cerdos-ceba': schemaCerdosCeba,
  'pollos-engorde': schemaPollosEngorde,
  'aves-ponedoras': schemaAvesPonedoras,
  'cultivo-permanente': schemaCultivoPermanente,
  'peces-tilapia': schemaPecesTilapia,
}

export function getTemplateConfigSchema(templateKey: string): TemplateConfigSchema | null {
  return TEMPLATE_CONFIG_SCHEMAS[templateKey] ?? null
}

/** Claves que no deben mostrarse en la configuración (son dinámicos, se calculan por radicación). */
export const EXCLUDED_CONFIG_KEYS: Record<string, string[]> = {
  'cerdos-cria': ['pct_costos_estandar'],
  'cerdos-ceba': ['pct_costos_estandar'],
  'pollos-engorde': ['pct_costos_estandar'],
  'aves-ponedoras': ['pct_costos_estandar'],
  'peces-tilapia': ['pct_costos_estandar'],
}

/** Devuelve las claves de campos que provienen de la configuración (valores estandarizados, etc.). */
export function getConfigFieldKeys(templateKey: string): string[] {
  const schema = getTemplateConfigSchema(templateKey)
  if (!schema) return []
  const keys: string[] = []
  for (const section of schema.sections) {
    if (section.layout === 'avesCostBreakdownTable') {
      keys.push(...getAvesCostBreakdownFieldKeys())
    } else if (section.layout === 'cultivoPermanenteFinagroTable') {
      keys.push('finagro_ranges')
    } else if (section.layout === 'cultivoPermanenteReferencia') {
      keys.push('plantas_x_ha', 'anio_inicio_produccion', 'descripcion')
    } else {
      for (const field of section.fields) {
        keys.push(field.key)
      }
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
