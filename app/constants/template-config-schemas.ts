/**
 * Esquemas de configuración para la página de configurar plantillas.
 * Define orden, tipos de campo y fórmulas por template_key.
 */
import { computeFormula } from '~/constants/credits-financial-templates'
import { getAvesCostBreakdownFieldKeys } from '~/constants/aves-cost-breakdown'
import { getCicloCortoCostBreakdownFieldKeys } from '~/constants/cultivo-ciclo-corto-cost-breakdown'

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
    /** Layout alternativo: tabla de desglose de costos (aves-ponedoras, cultivo-ciclo-corto) */
    layout?: 'avesCostBreakdownTable' | 'cultivoCicloCortoCostBreakdownTable' | 'cultivoPermanenteFinagroTable' | 'cultivoPermanenteReferencia'
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
        { key: 'pct_costos_estandar', label: '% de costo estándar', type: 'number' },
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
        { key: 'pct_costos_estandar', label: '% de costo estándar', type: 'number' },
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
        { key: 'pct_costos_estandar', label: '% de costo estándar', type: 'number' },
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
        { key: 'pct_costos_estandar', label: '% de costo estándar', type: 'number' },
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

const schemaGanadoDobleProposito: TemplateConfigSchema = {
  template_key: 'ganado-doble-proposito',
  sections: [
    {
      key: 'discriminacion_costos',
      title: 'Discriminación de costos',
      fields: [
        { key: 'pct_alimentacion', label: 'Alimentación – %', type: 'number' },
        { key: 'pct_mano_obra', label: 'Mano de obra – %', type: 'number' },
        { key: 'pct_mantenimiento_pasturas', label: 'Mantenimiento pasturas – %', type: 'number' },
        { key: 'pct_mantenimiento_infraestructura', label: 'Mantenimiento infraestructura – %', type: 'number' },
        { key: 'pct_insumos_veterinarios', label: 'Insumos veterinarios – %', type: 'number' },
      ],
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

const schemaCultivoCicloCorto: TemplateConfigSchema = {
  template_key: 'cultivo-ciclo-corto',
  sections: [
    {
      key: 'discriminacion_costos',
      title: 'Discriminación de costos',
      layout: 'cultivoCicloCortoCostBreakdownTable',
      fields: [],
    },
    {
      key: 'estandar',
      title: 'Valores estándar Finagro (referencia)',
      fields: [
        { key: 'pct_costos_kg', label: '% de costos x kg estándar', type: 'number' },
        { key: 'kg_x_ha', label: 'KG x hectárea', type: 'number' },
        { key: 'plantas_x_ha', label: 'Plantas x hectárea', type: 'number' },
        { key: 'cuantas_plantas', label: '¿Cuántas plantas?', type: 'number' },
        {
          key: 'plantas_x_ha_div_cuantas',
          label: 'Plantas x ha ÷ Cuántas plantas',
          type: 'formula',
          formulaKey: 'cultivo_ciclo_corto_plantas_x_ha_div_cuantas',
          formulaDisplay: 'plantas x hectárea ÷ cuántas plantas',
        },
      ],
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
        { key: 'pct_costos_estandar', label: '% de costo estándar', type: 'number' },
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

const schemaCanaPanela: TemplateConfigSchema = {
  template_key: 'cana-panela',
  sections: [
    {
      key: 'valores_estandar',
      title: 'Valores estándar',
      fields: [
        { key: 'pct_costos', label: '% de costo estándar', type: 'number' },
      ],
    },
  ],
}

const schemaServicios: TemplateConfigSchema = {
  template_key: 'servicios',
  sections: [
    {
      key: 'valores_estandar',
      title: 'Valores estándar',
      fields: [
        { key: 'pct_contribucion_estandar', label: '% Contribución estándar', type: 'number' },
        { key: 'semanas_mes_default', label: 'Semanas al mes (default)', type: 'number' },
      ],
    },
  ],
}

const schemaPlantillaComercial: TemplateConfigSchema = {
  template_key: 'plantilla-comercial',
  sections: [
    {
      key: 'valores_estandar',
      title: 'Valores estándar',
      fields: [
        { key: 'semanas_mes_default', label: 'Semanas al mes (default)', type: 'number' },
        { key: 'pct_utilidad_default', label: '% Utilidad (default)', type: 'number' },
        { key: 'pct_costos_default', label: '% Costos (default)', type: 'number' },
      ],
    },
  ],
}

const schemaTransporteCarga: TemplateConfigSchema = {
  template_key: 'transporte-carga',
  sections: [
    {
      key: 'valores_estandar',
      title: 'Valores estándar',
      fields: [
        { key: 'cantidad_viajes_semana', label: 'Cantidad viajes por semana', type: 'number' },
        { key: 'cambios_aceite_anual', label: '# Cambios de aceite (anual)', type: 'number' },
      ],
    },
  ],
}

const schemaTransportePasajeros: TemplateConfigSchema = {
  template_key: 'transporte-pasajeros',
  sections: [
    {
      key: 'valores_estandar',
      title: 'Valores estándar',
      fields: [
        { key: 'viajes_semana_default', label: 'Viajes por semana (default)', type: 'number' },
        { key: 'capacidad_buseta_default', label: 'Capacidad buseta (default)', type: 'number' },
        { key: 'pct_ocupacion_ajuste', label: '% Ocupación (ajuste)', type: 'number' },
        { key: 'cambios_aceite_anual', label: '# Cambios de aceite (anual)', type: 'number' },
      ],
    },
  ],
}

const TEMPLATE_CONFIG_SCHEMAS: Record<string, TemplateConfigSchema> = {
  'ganado-ceba': schemaGanadoCeba,
  'ganado-doble-proposito': schemaGanadoDobleProposito,
  'cerdos-cria': schemaCerdosCria,
  'cerdos-ceba': schemaCerdosCeba,
  'pollos-engorde': schemaPollosEngorde,
  'aves-ponedoras': schemaAvesPonedoras,
  'cultivo-permanente': schemaCultivoPermanente,
  'cultivo-ciclo-corto': schemaCultivoCicloCorto,
  'peces-tilapia': schemaPecesTilapia,
  'cana-panela': schemaCanaPanela,
  'servicios': schemaServicios,
  'plantilla-comercial': schemaPlantillaComercial,
  'transporte-carga': schemaTransporteCarga,
  'transporte-pasajeros': schemaTransportePasajeros,
}

export function getTemplateConfigSchema(templateKey: string): TemplateConfigSchema | null {
  return TEMPLATE_CONFIG_SCHEMAS[templateKey] ?? null
}

/** Claves que no deben mostrarse en la configuración (son dinámicos, se calculan por radicación). */
export const EXCLUDED_CONFIG_KEYS: Record<string, string[]> = {}

/** Devuelve las claves de campos que provienen de la configuración (valores estandarizados, etc.). */
export function getConfigFieldKeys(templateKey: string): string[] {
  const schema = getTemplateConfigSchema(templateKey)
  if (!schema) return []
  const keys: string[] = []
  for (const section of schema.sections) {
    if (section.layout === 'avesCostBreakdownTable') {
      keys.push(...getAvesCostBreakdownFieldKeys())
    } else if (section.layout === 'cultivoCicloCortoCostBreakdownTable') {
      keys.push(...getCicloCortoCostBreakdownFieldKeys())
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
