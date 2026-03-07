/**
 * Plantillas de actividad financiera basadas en OFICIAL PLANTILLAS AGRO AREA CREDITO 2026.
 * Consolidadas por sector: Ganadería, Pecuaria, Cultivos Permanentes, Cultivos Ciclo Corto.
 */
import type { FormSchemaInput } from '~/types/credits'

/** Sectores con sus plantillas disponibles */
export interface SectorTemplate {
  value: string
  label: string
}

export interface SectorConfig {
  value: string
  label: string
  templates: SectorTemplate[]
}

/** Opciones de producto para plantillas consolidadas */
export const CULTIVO_PERMANENTE_PRODUCTOS = [
  { value: 'cacao', label: 'Cacao' },
  { value: 'cafe', label: 'Café' },
  { value: 'bananito', label: 'Bananito' },
  { value: 'platano', label: 'Plátano Hartón/Dominico' },
  { value: 'aguacate', label: 'Aguacate Criollo' },
  { value: 'bijao', label: 'Bijao' },
  { value: 'guayaba', label: 'Guayaba' },
  { value: 'guanabana', label: 'Guanábana' },
  { value: 'mora', label: 'Mora' },
  { value: 'lulo', label: 'Lulo' },
] as const

export const CULTIVO_CICLO_CORTO_PRODUCTOS = [
  { value: 'maiz', label: 'Maíz' },
  { value: 'papa', label: 'Papa' },
  { value: 'habichuela', label: 'Habichuela' },
  { value: 'yuca', label: 'Yuca' },
  { value: 'tomate', label: 'Tomate' },
] as const

export const CULTIVO_ESPECIAL_PRODUCTOS = [
  { value: 'cana', label: 'Caña de Azúcar (Panela)' },
] as const

export const sectorsConfig: SectorConfig[] = [
  {
    value: 'ganaderia',
    label: 'Ganadería',
    templates: [
      { value: 'ganado-ceba', label: 'Ganado para la Ceba' },
      { value: 'ganado-doble-proposito', label: 'Ganado Doble Propósito' },
    ],
  },
  {
    value: 'pecuaria',
    label: 'Pecuaria',
    templates: [
      { value: 'cerdos-cria', label: 'Cerdos de Cría' },
      { value: 'cerdos-ceba', label: 'Cerdos de Ceba' },
      { value: 'pollos-engorde', label: 'Pollos de Engorde' },
      { value: 'aves-ponedoras', label: 'Aves Ponedoras (Huevos)' },
      { value: 'peces-tilapia', label: 'Peces (Tilapia, Cachama, Otros)' },
    ],
  },
  {
    value: 'cultivos-permanentes',
    label: 'Cultivos Permanentes',
    templates: [
      {
        value: 'cultivo-permanente',
        label: 'Cultivos permanentes (Cacao, Café, Bananito, Plátano, Aguacate, Frutales...)',
      },
    ],
  },
  {
    value: 'cultivos-ciclo-corto',
    label: 'Cultivos de Ciclo Corto',
    templates: [
      {
        value: 'cultivo-ciclo-corto',
        label: 'Cultivos ciclo corto (Maíz, Papa, Habichuela, Yuca, Tomate)',
      },
      {
        value: 'cana-panela',
        label: 'Caña de Azúcar (Panela)',
      },
    ],
  },
]

/** Plantilla: Ganado para la Ceba */
function schemaGanadoCeba(): FormSchemaInput {
  return {
    sections: [
      {
        key: 'resumen_utilidad',
        title: 'Resumen de utilidad',
        fields: [
          {
            key: 'total_utilidad',
            label: 'TOTAL UTILIDAD',
            type: 'computed',
            meta: 'Solo lectura (ventas - costos)',
            formulaKey: 'ganado_ceba_total_utilidad',
            formulaFormat: 'money',
            cols: 1,
          },
          {
            key: 'ventas',
            label: 'VENTAS',
            type: 'computed',
            meta: 'Solo lectura (cantidad × peso final × precio kg)',
            formulaKey: 'ganado_ceba_ventas',
            formulaFormat: 'money',
            cols: 1,
          },
          {
            key: 'utilidad_mensual',
            label: 'UTILIDAD MENSUAL',
            type: 'computed',
            meta: 'Solo lectura ((total utilidad / tiempo ceba) × % respuesta)',
            formulaKey: 'ganado_ceba_utilidad_mensual',
            formulaFormat: 'money',
            cols: 1,
          },
          {
            key: 'costos',
            label: 'COSTOS',
            type: 'computed',
            meta: 'Solo lectura: (cantidad×(peso_final-peso_inicial)×costo_kg)+(precio_compra×cantidad)',
            formulaKey: 'ganado_ceba_costos',
            formulaFormat: 'money',
            cols: 1,
          },
        ],
      },
      {
        key: 'balance',
        title: 'Balance de Producción',
        fields: [
          {
            key: 'cantidad_ganado',
            label: 'Cantidad de ganado',
            type: 'number',
            meta: 'Int',
            required: true,
            cols: 2,
          },
          {
            key: 'tiempo_meses_ceba',
            label: 'Tiempo en meses de ceba',
            type: 'number',
            meta: 'Decimal',
            required: true,
            cols: 1,
          },
          {
            key: 'cantidad_ganado_calculada',
            label: 'Cantidad calculada (fórmula)',
            type: 'computed',
            meta: 'Solo lectura',
            formulaKey: 'ganado_ceba_cantidad',
            cols: 1,
          },
          {
            key: 'ganado_en_aumento',
            label: '¿Ganado es en aumento?',
            type: 'select',
            options: [
              { value: 'no', label: 'No' },
              { value: 'si', label: 'Sí' },
            ],
            cols: 1,
          },
          {
            key: 'pct_segun_aumento',
            label: '% según respuesta',
            type: 'computed',
            meta: 'Solo lectura (No=100%, Sí=50%)',
            formulaKey: 'ganado_ceba_pct_aumento',
            formulaFormat: 'percent',
            cols: 1,
          },
        ],
      },
      {
        key: 'valores',
        title: 'Valores estandarizados',
        fields: [
          { key: 'precio_compra_animal', label: 'Precio de compra por animal', type: 'money', cols: 1 },
          { key: 'precio_kg_animal', label: 'Precio del kg x animal', type: 'money', meta: 'Para fórmula de peso inicial', cols: 1 },
          {
            key: 'peso_kg_inicial',
            label: 'Peso en kg inicial',
            type: 'computed',
            meta: 'Solo lectura (precio compra ÷ precio kg)',
            formulaKey: 'ganado_ceba_peso_inicial',
            cols: 1,
          },
          { key: 'peso_kg_final', label: 'Peso en kg final para la venta', type: 'number', meta: 'Decimal', cols: 1 },
          { key: 'costo_por_kg', label: 'Costo por kg', type: 'money', cols: 1 },
        ],
      },
      {
        key: 'informacion_referencia',
        title: 'Información de referencia',
        layout: 'referenciaInfoCeba',
        fields: [],
      },
    ],
  }
}

/** Plantilla: Ganado Doble Propósito */
function schemaGanadoDobleProposito(): FormSchemaInput {
  return {
    sections: [
      {
        key: 'resumen_utilidad',
        title: 'Utilidad mensual crías y leche',
        fields: [
          {
            key: 'utilidad_mensual_crias_leche',
            label: 'Utilidad mensual de las crías y la leche',
            type: 'computed',
            meta: 'Solo lectura ((valor total crías / ciclo) + utilidad mensual leche)',
            formulaKey: 'ganado_doble_utilidad_mensual_crias_leche',
            formulaFormat: 'money',
            cols: 2,
          },
        ],
      },
      {
        key: 'crias',
        title: 'Crías',
        fields: [
          {
            key: 'numero_crias',
            label: 'Número de crías',
            type: 'number',
            meta: 'Decimal',
            required: true,
            cols: 1,
          },
          {
            key: 'edad_vacas_crias',
            label: 'Edad de las vacas (años)',
            type: 'number',
            meta: 'Int',
            cols: 1,
          },
          {
            key: 'ciclo_produccion_terneros_meses',
            label: 'Ciclo de producción terneros (meses)',
            type: 'number',
            meta: 'Int',
            cols: 1,
          },
          {
            key: 'valor_unitario_venta_cria',
            label: 'Valor unitario venta cría',
            type: 'money',
            cols: 1,
          },
          {
            key: 'valor_total_crias',
            label: 'Valor total crías',
            type: 'computed',
            meta: 'Solo lectura (número de crías × valor unitario venta cría)',
            formulaKey: 'ganado_doble_valor_total_crias',
            formulaFormat: 'money',
            cols: 1,
          },
        ],
      },
      {
        key: 'leche',
        title: 'Recolección de leche',
        fields: [
          { key: 'vacas_cria', label: 'Vacas de cría', type: 'number', meta: 'Int', cols: 1 },
          { key: 'edad_vacas_leche', label: 'Edad de las vacas (años)', type: 'number', meta: 'Int', cols: 1 },
          {
            key: 'produccion_lt_ciclo',
            label: 'Producción LT del ciclo',
            type: 'number',
            meta: 'Decimal',
            cols: 1,
          },
          {
            key: 'ciclo_produccion_leche',
            label: 'Ciclo de producción leche (meses)',
            type: 'number',
            meta: 'Int',
            cols: 1,
          },
          {
            key: 'precio_lt_leche',
            label: 'Precio por LT leche',
            type: 'money',
            meta: 'Solo modificar este precio',
            cols: 1,
          },
          {
            key: 'valor_total_produccion_leche',
            label: 'Valor total de producción de leche',
            type: 'computed',
            meta: 'Solo lectura (producción LT ciclo × precio por LT leche)',
            formulaKey: 'ganado_doble_valor_total_produccion_leche',
            formulaFormat: 'money',
            cols: 1,
          },
          {
            key: 'costo_total_leche',
            label: 'Costo total',
            type: 'computed',
            meta: 'Solo lectura (valor total producción × costo producción estándar %)',
            formulaKey: 'ganado_doble_costo_total_leche',
            formulaFormat: 'money',
            cols: 1,
          },
          {
            key: 'produccion_mensual_lt',
            label: 'Producción mensual LT',
            type: 'computed',
            meta: 'Solo lectura (valor total / ciclo de producción en meses)',
            formulaKey: 'ganado_doble_produccion_mensual_lt',
            formulaFormat: 'money',
            cols: 1,
          },
          {
            key: 'utilidad_mensual_leche',
            label: 'Utilidad mensual',
            type: 'computed',
            meta: 'Solo lectura ((valor total - costo total) / ciclo meses)',
            formulaKey: 'ganado_doble_utilidad_mensual_leche',
            formulaFormat: 'money',
            cols: 2,
          },
        ],
      },
      {
        key: 'tasa_mortalidad',
        title: 'Tasa de mortalidad',
        fields: [
          {
            key: 'pct_tasa_mortalidad',
            label: 'Tasa de mortalidad (%)',
            type: 'number',
            meta: 'Ej: 10',
            cols: 1,
          },
        ],
      },
      {
        key: 'valores_por_vaca',
        title: 'Valores por 1 vaca durante todo el ciclo',
        fields: [
          {
            key: 'produccion_litros_vaca',
            label: 'Producción en litros',
            type: 'number',
            meta: 'Decimal (ej: 2000)',
            cols: 1,
          },
          {
            key: 'pct_costo_produccion_estandar',
            label: 'Costo de producción estándar (%)',
            type: 'number',
            meta: 'Ej: 79. Base para distribución de costos.',
            cols: 1,
          },
        ],
      },
      {
        key: 'discriminacion_costos',
        title: 'Discriminación de costos',
        fields: [
          { key: 'valor_alimentacion', label: 'Alimentación – Valor', type: 'computed', formulaKey: 'ganado_doble_valor_alimentacion', formulaFormat: 'money', meta: 'Costo total × %', cols: 1 },
          { key: 'pct_alimentacion', label: 'Alimentación – %', type: 'number', meta: 'Editable', cols: 1 },
          { key: 'valor_mano_obra', label: 'Mano de obra – Valor', type: 'computed', formulaKey: 'ganado_doble_valor_mano_obra', formulaFormat: 'money', meta: 'Costo total × %', cols: 1 },
          { key: 'pct_mano_obra', label: 'Mano de obra – %', type: 'number', meta: 'Editable', cols: 1 },
          { key: 'valor_mantenimiento_pasturas', label: 'Mantenimiento pasturas – Valor', type: 'computed', formulaKey: 'ganado_doble_valor_mantenimiento_pasturas', formulaFormat: 'money', meta: 'Costo total × %', cols: 1 },
          { key: 'pct_mantenimiento_pasturas', label: 'Mantenimiento pasturas – %', type: 'number', meta: 'Editable', cols: 1 },
          { key: 'valor_mantenimiento_infraestructura', label: 'Mantenimiento infraestructura – Valor', type: 'computed', formulaKey: 'ganado_doble_valor_mantenimiento_infraestructura', formulaFormat: 'money', meta: 'Costo total × %', cols: 1 },
          { key: 'pct_mantenimiento_infraestructura', label: 'Mantenimiento infraestructura – %', type: 'number', meta: 'Editable', cols: 1 },
          { key: 'valor_insumos_veterinarios', label: 'Insumos veterinarios – Valor', type: 'computed', formulaKey: 'ganado_doble_valor_insumos_veterinarios', formulaFormat: 'money', meta: 'Costo total × %', cols: 1 },
          { key: 'pct_insumos_veterinarios', label: 'Insumos veterinarios – %', type: 'number', meta: 'Editable', cols: 1 },
          {
            key: 'total_costos_leche',
            label: 'Total',
            type: 'computed',
            meta: 'Solo lectura (suma de todos los valores)',
            formulaKey: 'ganado_doble_total_costos',
            formulaFormat: 'money',
            cols: 2,
          },
        ],
      },
    ],
  }
}

/** Plantilla: Cerdos de Cría */
function schemaCerdosCria(): FormSchemaInput {
  return {
    sections: [
      {
        key: 'resumen_utilidad',
        title: 'Resumen de utilidad',
        fields: [
          {
            key: 'total_utilidad_cerdos_cria',
            label: 'TOTAL UTILIDAD',
            type: 'computed',
            meta: 'Solo lectura (ventas - costos)',
            formulaKey: 'cerdos_cria_total_utilidad',
            formulaFormat: 'money',
            cols: 1,
          },
          {
            key: 'total_utilidad_mensual_cerdos_cria',
            label: 'TOTAL UTILIDAD MENSUAL',
            type: 'computed',
            meta: 'Solo lectura ((total utilidad / días ciclo) × 30)',
            formulaKey: 'cerdos_cria_total_utilidad_mensual',
            formulaFormat: 'money',
            cols: 1,
          },
          {
            key: 'ventas_cerdos_cria',
            label: 'VENTAS',
            type: 'computed',
            meta: 'Solo lectura (cerdos × precio destetado)',
            formulaKey: 'cerdos_cria_ventas',
            formulaFormat: 'money',
            cols: 1,
          },
          {
            key: 'costos_cerdos_cria',
            label: 'COSTOS',
            type: 'computed',
            meta: 'Solo lectura (ventas × % costo estándar)',
            formulaKey: 'cerdos_cria_costos_resumen',
            formulaFormat: 'money',
            cols: 1,
          },
        ],
      },
      {
        key: 'valores_estandar_cerda',
        title: 'Valores estándar por cerda',
        fields: [
          {
            key: 'lechones_destetados',
            label: 'Lechones destetados',
            type: 'number',
            meta: 'Editable (ej: 10)',
            cols: 1,
          },
          {
            key: 'peso_final_destete_kg',
            label: 'Peso final del destete (kg)',
            type: 'number',
            meta: 'Editable (ej: 15)',
            cols: 1,
          },
        ],
      },
      {
        key: 'produccion',
        title: 'Cerdos para la cría',
        fields: [
          { key: 'cerdas_cria', label: 'Cerdas de cría', type: 'number', meta: 'Int', required: true, cols: 1 },
          {
            key: 'cerdos_para_cria',
            label: 'Cerdos para la cría',
            type: 'computed',
            meta: 'Solo lectura (cerdas × lechones destetados)',
            formulaKey: 'cerdos_cria_cerdos_para_cria',
            formulaFormat: 'number',
            cols: 1,
          },
          { key: 'precio_cerdo_destetado', label: 'Precio cerdo destetado', type: 'money', cols: 1 },
          {
            key: 'duracion_ciclo_dias',
            label: 'Duración del ciclo (días)',
            type: 'number',
            meta: 'Int',
            cols: 1,
          },
          {
            key: 'pct_costos_estandar',
            label: '% costos estándar',
            type: 'number',
            meta: 'Decimal (ej: 0.85)',
            cols: 1,
          },
          {
            key: 'costo_total_cerdos_cria',
            label: 'Costo total',
            type: 'computed',
            meta: 'Solo lectura (valor venta × % costos estándar)',
            formulaKey: 'cerdos_cria_costo_total',
            formulaFormat: 'money',
            cols: 1,
          },
        ],
      },
      {
        key: 'costos',
        title: 'Discriminación de costos',
        fields: [
          { key: 'valor_sostenimiento_madre', label: 'Sostenimiento de madre – Valor', type: 'computed', formulaKey: 'cerdos_cria_valor_sostenimiento_madre', formulaFormat: 'money', meta: 'Costo total × %', cols: 1 },
          { key: 'pct_sostenimiento_madre', label: 'Sostenimiento de madre – %', type: 'number', meta: 'Editable', cols: 1 },
          { key: 'valor_alimentacion_lechon', label: 'Alimentación lechón – Valor', type: 'computed', formulaKey: 'cerdos_cria_valor_alimentacion_lechon', formulaFormat: 'money', meta: 'Costo total × %', cols: 1 },
          { key: 'pct_alimentacion_lechon', label: 'Alimentación lechón – %', type: 'number', meta: 'Editable', cols: 1 },
          { key: 'valor_medicamento_complementos', label: 'Medicamento y complementos – Valor', type: 'computed', formulaKey: 'cerdos_cria_valor_medicamento_complementos', formulaFormat: 'money', meta: 'Costo total × %', cols: 1 },
          { key: 'pct_medicamento_complementos', label: 'Medicamento y complementos – %', type: 'number', meta: 'Editable', cols: 1 },
          { key: 'valor_mano_obra_cerdos', label: 'Mano de obra – Valor', type: 'computed', formulaKey: 'cerdos_cria_valor_mano_obra', formulaFormat: 'money', meta: 'Costo total × %', cols: 1 },
          { key: 'pct_mano_obra_cerdos', label: 'Mano de obra – %', type: 'number', meta: 'Editable', cols: 1 },
          { key: 'valor_mantenimiento_infraestructura', label: 'Mantenimiento infraestructura – Valor', type: 'computed', formulaKey: 'cerdos_cria_valor_mantenimiento_infraestructura', formulaFormat: 'money', meta: 'Costo total × %', cols: 1 },
          { key: 'pct_mantenimiento_infraestructura', label: 'Mantenimiento infraestructura – %', type: 'number', meta: 'Editable', cols: 1 },
          {
            key: 'total_costos_cerdos_cria',
            label: 'Total',
            type: 'computed',
            meta: 'Solo lectura (suma de todos los valores)',
            formulaKey: 'cerdos_cria_total_costos',
            formulaFormat: 'money',
            cols: 2,
          },
        ],
      },
    ],
  }
}

/** Plantilla: Cerdos de Ceba */
function schemaCerdosCeba(): FormSchemaInput {
  return {
    sections: [
      {
        key: 'resumen_utilidad',
        title: 'Resumen de utilidad',
        fields: [
          {
            key: 'total_utilidad_cerdos_ceba',
            label: 'TOTAL UTILIDAD',
            type: 'computed',
            meta: 'Solo lectura (ventas - costos)',
            formulaKey: 'cerdos_ceba_total_utilidad',
            formulaFormat: 'money',
            cols: 1,
          },
          {
            key: 'total_utilidad_mensual_cerdos_ceba',
            label: 'TOTAL UTILIDAD MENSUAL',
            type: 'computed',
            meta: 'Solo lectura (total utilidad / meses ciclo)',
            formulaKey: 'cerdos_ceba_total_utilidad_mensual',
            formulaFormat: 'money',
            cols: 1,
          },
          {
            key: 'ventas_cerdos_ceba',
            label: 'VENTAS',
            type: 'computed',
            meta: 'Solo lectura (cerdos × peso kg × precio kg)',
            formulaKey: 'cerdos_ceba_ventas',
            formulaFormat: 'money',
            cols: 1,
          },
          {
            key: 'costos_cerdos_ceba',
            label: 'COSTOS',
            type: 'computed',
            meta: 'Solo lectura (ventas × % costo estándar)',
            formulaKey: 'cerdos_ceba_costos_resumen',
            formulaFormat: 'money',
            cols: 1,
          },
        ],
      },
      {
        key: 'valores_estandar_cerdo_ceba',
        title: 'Valores estándar por cerdo',
        fields: [
          {
            key: 'peso_promedio_kg_ceba',
            label: 'Peso promedio (kg)',
            type: 'number',
            meta: 'Editable',
            cols: 1,
          },
        ],
      },
      {
        key: 'produccion',
        title: 'Cerdos para la ceba',
        fields: [
          { key: 'cerdos_para_ceba', label: 'Cerdos para la ceba', type: 'number', meta: 'Int', required: true, cols: 1 },
          { key: 'precio_kg_pie', label: 'Precio de kg en pie', type: 'money', cols: 1 },
          {
            key: 'duracion_ciclo_meses',
            label: 'Duración del ciclo (meses)',
            type: 'number',
            meta: 'Decimal',
            cols: 1,
          },
          {
            key: 'pct_costos_estandar',
            label: '% costos estándar',
            type: 'number',
            meta: 'Decimal (ej: 0.7)',
            cols: 1,
          },
          {
            key: 'costo_total_cerdos_ceba',
            label: 'Costo total',
            type: 'computed',
            meta: 'Solo lectura (ventas × % costos estándar)',
            formulaKey: 'cerdos_ceba_costo_total',
            formulaFormat: 'money',
            cols: 1,
          },
        ],
      },
      {
        key: 'costos',
        title: 'Discriminación de costos',
        fields: [
          { key: 'valor_lechon_destetado', label: 'Lechón destetado – Valor', type: 'computed', formulaKey: 'cerdos_ceba_valor_lechon_destetado', formulaFormat: 'money', meta: 'Costo total × %', cols: 1 },
          { key: 'pct_lechon_destetado', label: 'Lechón destetado – %', type: 'number', meta: 'Editable', cols: 1 },
          { key: 'valor_alimentacion_ceba', label: 'Alimentación – Valor', type: 'computed', formulaKey: 'cerdos_ceba_valor_alimentacion', formulaFormat: 'money', meta: 'Costo total × %', cols: 1 },
          { key: 'pct_alimentacion_ceba', label: 'Alimentación – %', type: 'number', meta: 'Editable', cols: 1 },
          { key: 'valor_medicamento_complementos_ceba', label: 'Medicamento y complementos – Valor', type: 'computed', formulaKey: 'cerdos_ceba_valor_medicamento_complementos', formulaFormat: 'money', meta: 'Costo total × %', cols: 1 },
          { key: 'pct_medicamento_complementos_ceba', label: 'Medicamento y complementos – %', type: 'number', meta: 'Editable', cols: 1 },
          { key: 'valor_mano_obra_ceba', label: 'Mano de obra – Valor', type: 'computed', formulaKey: 'cerdos_ceba_valor_mano_obra', formulaFormat: 'money', meta: 'Costo total × %', cols: 1 },
          { key: 'pct_mano_obra_ceba', label: 'Mano de obra – %', type: 'number', meta: 'Editable', cols: 1 },
          {
            key: 'total_costos_cerdos_ceba',
            label: 'Total',
            type: 'computed',
            meta: 'Solo lectura (suma de todos los valores)',
            formulaKey: 'cerdos_ceba_total_costos',
            formulaFormat: 'money',
            cols: 2,
          },
        ],
      },
    ],
  }
}

/** Plantilla: Pollos de Engorde */
function schemaPollosEngorde(): FormSchemaInput {
  return {
    sections: [
      {
        key: 'resumen_utilidad',
        title: 'Resumen de utilidad',
        fields: [
          {
            key: 'total_utilidad_pollos',
            label: 'TOTAL UTILIDAD',
            type: 'computed',
            meta: 'Solo lectura (ventas - costos)',
            formulaKey: 'pollos_engorde_total_utilidad',
            formulaFormat: 'money',
            cols: 1,
          },
          {
            key: 'total_utilidad_mensual_pollos',
            label: 'TOTAL UTILIDAD MENSUAL',
            type: 'computed',
            meta: 'Solo lectura ((total utilidad / días ciclo) × 30)',
            formulaKey: 'pollos_engorde_total_utilidad_mensual',
            formulaFormat: 'money',
            cols: 1,
          },
          {
            key: 'ventas_pollos',
            label: 'VENTAS',
            type: 'computed',
            meta: 'Solo lectura (pollos en engorde × precio pie kg × peso kg venta)',
            formulaKey: 'pollos_engorde_ventas',
            formulaFormat: 'money',
            cols: 1,
          },
          {
            key: 'costos_pollos',
            label: 'COSTOS',
            type: 'computed',
            meta: 'Solo lectura (pollos supervivientes × peso kg × costo kg)',
            formulaKey: 'pollos_engorde_costos',
            formulaFormat: 'money',
            cols: 1,
          },
        ],
      },
      {
        key: 'valores_estandar_fenavi',
        title: 'Valores estándar FENAVI',
        fields: [
          {
            key: 'peso_kg_venta',
            label: 'Peso kg venta',
            type: 'number',
            meta: 'Decimal (ej: 2,5)',
            cols: 1,
          },
          {
            key: 'precio_venta_pie_kg',
            label: 'Precio de venta en pie kg',
            type: 'money',
            meta: 'Editable',
            cols: 1,
          },
          {
            key: 'costo_kg_venta',
            label: 'Costo x kg venta',
            type: 'money',
            meta: 'Editable',
            cols: 1,
          },
          {
            key: 'tasa_mortalidad_pct',
            label: 'Tasa mortalidad (%)',
            type: 'number',
            meta: 'Ej: 10',
            cols: 1,
          },
          {
            key: 'precio_libra_conversion',
            label: 'Precio de libra conversión',
            type: 'money',
            meta: 'Editable',
            cols: 1,
          },
          {
            key: 'precio_kg_pie_fenavi',
            label: 'Precio kg en pie FENAVI (referencia)',
            type: 'money',
            meta: 'Referencia externa',
            cols: 1,
          },
        ],
      },
      {
        key: 'produccion',
        title: 'Balance de producción',
        fields: [
          {
            key: 'cantidad_pollos',
            label: 'Pollos para engorde - Cantidad',
            type: 'number',
            meta: 'Int',
            required: true,
            cols: 1,
          },
          {
            key: 'tiempo_ciclo_dias',
            label: 'Tiempo ciclo de engorde (días)',
            type: 'number',
            meta: 'Int',
            cols: 1,
          },
          {
            key: 'pollos_en_engorde',
            label: 'Pollos en engorde',
            type: 'computed',
            meta: 'Solo lectura (pollos para engorde × (1 - tasa mortalidad))',
            formulaKey: 'pollos_engorde_cantidad',
            formulaFormat: 'number',
            cols: 1,
          },
          {
            key: 'pct_costos_estandar',
            label: '% costos estándar',
            type: 'number',
            meta: 'Decimal (ej: 0.7)',
            cols: 1,
          },
        ],
      },
    ],
  }
}

/** Keys y valores por defecto para % participación en desglose de costos (aves ponedoras) */
export const AVES_COST_PCT_DEFAULTS: Record<string, number> = {
  cost_pct_pollita: 2.8,
  cost_pct_instalacion: 0.8,
  cost_pct_desinfeccion: 0.2,
  cost_pct_materiales_cama: 0.4,
  cost_pct_calefaccion: 0.2,
  cost_pct_levante_nutricion: 9.38,
  cost_pct_levante_sanidad: 1.7,
  cost_pct_levante_vacunas: 0.4,
  cost_pct_levante_medicamento: 0.02,
  cost_pct_levante_otros: 1.0,
  cost_pct_prod_nutricion: 70.73,
  cost_pct_prod_sanidad: 0.3,
  cost_pct_prod_vacunas: 0.1,
  cost_pct_prod_medicamento: 0.07,
  cost_pct_prod_otros: 0.2,
  cost_pct_mano_directa: 4.7,
  cost_pct_mano_ocasional: 0.3,
  cost_pct_ind_asistencia: 0.3,
  cost_pct_ind_cartones: 1.3,
  cost_pct_ind_otros: 0.1,
  cost_pct_ind_transporte: 2.3,
  cost_pct_ind_imprevistos: 2.5,
  cost_pct_ajuste_mortalidad: 1.0,
}

/** Plantilla: Aves Ponedoras (Huevos) */
function schemaAvesPonedoras(): FormSchemaInput {
  return {
    sections: [
      {
        key: 'resumen_utilidad',
        title: 'Resumen de utilidad',
        fields: [
          {
            key: 'total_utilidad_aves',
            label: 'TOTAL UTILIDAD',
            type: 'computed',
            meta: 'Solo lectura (ventas - costos)',
            formulaKey: 'aves_ponedoras_total_utilidad',
            formulaFormat: 'money',
            cols: 1,
          },
          {
            key: 'total_utilidad_mensual_aves',
            label: 'TOTAL UTILIDAD MENSUAL',
            type: 'computed',
            meta: 'Solo lectura',
            formulaKey: 'aves_ponedoras_total_utilidad_mensual',
            formulaFormat: 'money',
            cols: 1,
          },
          {
            key: 'ventas_aves',
            label: 'VENTAS',
            type: 'computed',
            meta: 'Solo lectura (cubetas × precio promedio)',
            formulaKey: 'aves_ponedoras_ventas',
            formulaFormat: 'money',
            cols: 1,
          },
          {
            key: 'costos_aves',
            label: 'COSTOS',
            type: 'computed',
            meta: 'Solo lectura (ventas × % costo)',
            formulaKey: 'aves_ponedoras_costos',
            formulaFormat: 'money',
            cols: 1,
          },
        ],
      },
      {
        key: 'valores_estandar_fenavi',
        title: 'Valores estándar FENAVI',
        fields: [
          {
            key: 'pct_costo_huevo',
            label: '% Costo x huevo',
            type: 'number',
            meta: 'Ej: 76',
            cols: 1,
          },
          {
            key: 'pct_mortalidad_postura',
            label: '% Mortalidad y postura',
            type: 'number',
            meta: 'Ej: 10',
            cols: 1,
          },
          {
            key: 'produccion_huevos_ave',
            label: 'Producción huevos x ave',
            type: 'number',
            meta: 'Ej: 350',
            cols: 1,
          },
        ],
      },
      {
        key: 'produccion',
        title: 'Balance de producción',
        fields: [
          { key: 'cantidad_aves', label: 'Cantidad de aves', type: 'number', meta: 'Int', required: true, cols: 1 },
          {
            key: 'aves_en_produccion',
            label: 'Aves en producción',
            type: 'computed',
            meta: 'Solo lectura (cantidad × (1 - % mortalidad/100))',
            formulaKey: 'aves_en_produccion',
            formulaFormat: 'number',
            cols: 1,
          },
          {
            key: 'cubetas_diarias',
            label: 'N° de cubetas diarias',
            type: 'computed',
            meta: 'Solo lectura (aves en producción ÷ 30)',
            formulaKey: 'aves_cubetas_diarias',
            formulaFormat: 'number',
            cols: 1,
          },
          {
            key: 'cubetas_mensuales',
            label: 'N° de cubetas mensuales',
            type: 'computed',
            meta: 'Solo lectura (cubetas diarias × 30)',
            formulaKey: 'aves_cubetas_mensuales',
            formulaFormat: 'number',
            cols: 1,
          },
          {
            key: 'pct_costos_estandar',
            label: '% de costos estándar',
            type: 'number',
            meta: 'Decimal (ej: 0.82)',
            cols: 1,
          },
        ],
      },
      {
        key: 'clasificacion_huevos',
        title: 'Clasificación de huevo y precios',
        layout: 'eggsTable',
        fields: [],
        tableRows: [
          { label: 'B', suffix: 'b' },
          { label: 'A', suffix: 'a' },
          { label: 'AA', suffix: 'aa' },
          { label: 'EXTRA', suffix: 'extra', textClass: 'text-red-600' },
          { label: 'CRIOLLOS', suffix: 'criollos' },
        ],
      },
    ],
  }
}

/** Plantilla: Peces (Tilapia, Cachama, Otros) */
function schemaPecesTilapia(): FormSchemaInput {
  return {
    sections: [
      {
        key: 'tipo_pez',
        title: 'Tipo de pez',
        fields: [
          {
            key: 'tipo_producto',
            label: 'Tipo de pez',
            type: 'select',
            options: [{ value: 'tilapia', label: 'Tilapia' }, { value: 'cachama', label: 'Cachama' }, { value: 'otra', label: 'Otra' }],
            required: true,
            cols: 1,
          },
        ],
      },
      {
        key: 'resumen_utilidad',
        title: 'Resumen de utilidad',
        fields: [
          {
            key: 'total_utilidad_tilapia',
            label: 'TOTAL UTILIDAD',
            type: 'computed',
            meta: 'Solo lectura (ventas - costos)',
            formulaKey: 'peces_tilapia_total_utilidad',
            formulaFormat: 'money',
            cols: 1,
          },
          {
            key: 'total_utilidad_mensual_tilapia',
            label: 'TOTAL UTILIDAD MENSUAL',
            type: 'computed',
            meta: 'Solo lectura ((total utilidad / días ciclo) × 30)',
            formulaKey: 'peces_tilapia_total_utilidad_mensual',
            formulaFormat: 'money',
            cols: 1,
          },
          {
            key: 'ventas_tilapia',
            label: 'VENTAS',
            type: 'computed',
            meta: 'Solo lectura (alevinos × peso libras × precio/libra)',
            formulaKey: 'peces_tilapia_ventas',
            formulaFormat: 'money',
            cols: 1,
          },
          {
            key: 'costos_tilapia',
            label: 'COSTOS',
            type: 'computed',
            meta: 'Solo lectura (ventas × % costos estándar)',
            formulaKey: 'peces_tilapia_costos',
            formulaFormat: 'money',
            cols: 1,
          },
        ],
      },
      {
        key: 'produccion',
        title: 'Balance de producción',
        fields: [
          {
            key: 'cantidad_alevinos',
            label: 'Cantidad de alevinos',
            type: 'number',
            meta: 'Int',
            required: true,
            cols: 1,
          },
          {
            key: 'tiempo_ciclo_dias',
            label: 'Tiempo ciclo de engorde (días)',
            type: 'number',
            meta: 'Int',
            cols: 1,
          },
          {
            key: 'pct_costos_estandar',
            label: '% costos estándar',
            type: 'number',
            meta: 'Decimal (ej: 0.7)',
            cols: 1,
          },
        ],
      },
      {
        key: 'valores_estandar_tilapia',
        title: 'Valores estándar',
        fields: [
          {
            key: 'peces_por_estanque',
            label: 'Peces por estanque',
            type: 'number',
            meta: 'Int (ej: 600)',
            cols: 1,
          },
          {
            key: 'unidad_por_m2',
            label: 'Unidad por m²',
            type: 'number',
            meta: 'Decimal (ej: 6)',
            cols: 1,
          },
          {
            key: 'peso_final_libras',
            label: 'Peso final en libras',
            type: 'number',
            meta: 'Decimal (ej: 1.00)',
            cols: 1,
          },
          {
            key: 'duracion_ciclo_dias',
            label: 'Duración del ciclo en días',
            type: 'number',
            meta: 'Int (ej: 210)',
            cols: 1,
          },
          {
            key: 'precio_venta_libra',
            label: 'Precio de venta por libra',
            type: 'money',
            meta: 'COP',
            cols: 1,
          },
        ],
      },
      {
        key: 'discriminacion_costos',
        title: 'Discriminación de costos',
        fields: [
          {
            key: 'valor_mano_obra_tilapia',
            label: 'Mano de obra – Valor',
            type: 'computed',
            formulaKey: 'peces_tilapia_valor_mano_obra',
            formulaFormat: 'money',
            meta: 'Costo total × %',
            cols: 1,
          },
          { key: 'pct_mano_obra_tilapia', label: 'Mano de obra – %', type: 'number', meta: 'Editable', cols: 1 },
          {
            key: 'valor_preparacion_estanque',
            label: 'Preparación estanque – Valor',
            type: 'computed',
            formulaKey: 'peces_tilapia_valor_preparacion_estanque',
            formulaFormat: 'money',
            meta: 'Costo total × %',
            cols: 1,
          },
          { key: 'pct_preparacion_estanque', label: 'Preparación estanque – %', type: 'number', meta: 'Editable', cols: 1 },
          {
            key: 'valor_compra_especies',
            label: 'Compra de especies – Valor',
            type: 'computed',
            formulaKey: 'peces_tilapia_valor_compra_especies',
            formulaFormat: 'money',
            meta: 'Costo total × %',
            cols: 1,
          },
          { key: 'pct_compra_especies', label: 'Compra de especies – %', type: 'number', meta: 'Editable', cols: 1 },
          {
            key: 'valor_tratamientos_tilapia',
            label: 'Tratamientos – Valor',
            type: 'computed',
            formulaKey: 'peces_tilapia_valor_tratamientos',
            formulaFormat: 'money',
            meta: 'Costo total × %',
            cols: 1,
          },
          { key: 'pct_tratamientos_tilapia', label: 'Tratamientos – %', type: 'number', meta: 'Editable', cols: 1 },
          {
            key: 'valor_sacrificio_tilapia',
            label: 'Sacrificio – Valor',
            type: 'computed',
            formulaKey: 'peces_tilapia_valor_sacrificio',
            formulaFormat: 'money',
            meta: 'Costo total × %',
            cols: 1,
          },
          { key: 'pct_sacrificio_tilapia', label: 'Sacrificio – %', type: 'number', meta: 'Editable', cols: 1 },
          {
            key: 'valor_alimentacion_tilapia',
            label: 'Alimentación – Valor',
            type: 'computed',
            formulaKey: 'peces_tilapia_valor_alimentacion',
            formulaFormat: 'money',
            meta: 'Costo total × %',
            cols: 1,
          },
          { key: 'pct_alimentacion_tilapia', label: 'Alimentación – %', type: 'number', meta: 'Editable', cols: 1 },
          {
            key: 'total_costos_tilapia',
            label: 'Total',
            type: 'computed',
            meta: 'Solo lectura (suma de todos los valores)',
            formulaKey: 'peces_tilapia_total_costos',
            formulaFormat: 'money',
            cols: 2,
          },
        ],
      },
    ],
  }
}

/** Keys y valores por defecto para tabla FINAGRO (cultivos permanentes) */
export const FINAGRO_DEFAULTS: Record<string, number | null> = {
  finagro_1_pct: 100,
  finagro_1_kg: null,
  finagro_2_pct: 100,
  finagro_2_kg: 400,
  finagro_3_pct: 70,
  finagro_3_kg: 875,
  finagro_4_pct: 60,
  finagro_4_kg: 1050,
  finagro_5_17_pct: 45,
  finagro_5_17_kg: 1200,
  finagro_18_20_pct: 55,
  finagro_18_20_kg: 1000,
}

/** Plantilla única: Cultivos permanentes (Cacao, Café, Bananito, Plátano, Aguacate, Bijao, Guayaba, Guanábana, Mora, Lulo) */
function schemaCultivoPermanente(): FormSchemaInput {
  return {
    sections: [
      {
        key: 'producto',
        title: 'Producto y superficie',
        fields: [
          {
            key: 'tipo_producto',
            label: 'Tipo de producto',
            type: 'select',
            options: CULTIVO_PERMANENTE_PRODUCTOS.map((p) => ({ value: p.value, label: p.label })),
            required: true,
            cols: 1,
          },
          {
            key: 'edad_cultivo',
            label: 'Edad del cultivo (años)',
            type: 'number',
            meta: 'Int',
            cols: 1,
          },
          {
            key: 'cantidad_hectareas',
            label: 'Cantidad de hectáreas',
            type: 'number',
            meta: 'Decimal',
            required: true,
            cols: 1,
          },
          {
            key: 'pct_costos',
            label: '% costos por hectárea',
            type: 'computed',
            meta: 'Solo lectura (según edad y tabla FINAGRO)',
            formulaKey: 'cultivo_permanente_pct_costos',
            formulaFormat: 'percent',
            cols: 1,
          },
        ],
      },
      {
        key: 'produccion',
        title: 'Producción',
        fields: [
          {
            key: 'cant_kg_hectarea',
            label: 'Cant. kg x hectárea',
            type: 'computed',
            meta: 'Solo lectura (según edad y tabla FINAGRO)',
            formulaKey: 'cultivo_permanente_kg_hectarea',
            formulaFormat: 'number',
            cols: 1,
          },
          {
            key: 'valor_unitario_kg',
            label: 'Valor unitario kg',
            type: 'money',
            cols: 1,
          },
          {
            key: 'valor_total',
            label: 'Valor total',
            type: 'computed',
            meta: 'Solo lectura (kg/ha × valor kg × hectáreas)',
            formulaKey: 'cultivo_permanente_valor_total',
            formulaFormat: 'money',
            cols: 1,
          },
          {
            key: 'duracion_meses',
            label: 'Duración (meses)',
            type: 'number',
            meta: 'Int',
            cols: 1,
          },
        ],
      },
      {
        key: 'resumen_utilidad',
        title: 'Resumen de utilidad',
        fields: [
          {
            key: 'total_utilidad_permanente',
            label: 'TOTAL UTILIDAD',
            type: 'computed',
            meta: 'Solo lectura (ventas - costos)',
            formulaKey: 'cultivo_permanente_total_utilidad',
            formulaFormat: 'money',
            cols: 1,
          },
          {
            key: 'total_utilidad_mensual_permanente',
            label: 'TOTAL UTILIDAD MENSUAL',
            type: 'computed',
            meta: 'Solo lectura (total utilidad ÷ duración meses)',
            formulaKey: 'cultivo_permanente_total_utilidad_mensual',
            formulaFormat: 'money',
            cols: 1,
          },
          {
            key: 'ventas_anual_permanente',
            label: 'VENTA ANUAL',
            type: 'computed',
            meta: 'Solo lectura (valor total)',
            formulaKey: 'cultivo_permanente_ventas_anual',
            formulaFormat: 'money',
            cols: 1,
          },
          {
            key: 'costos_anual_permanente',
            label: 'COSTO ANUAL',
            type: 'computed',
            meta: 'Solo lectura (ventas × % costos)',
            formulaKey: 'cultivo_permanente_costos_anual',
            formulaFormat: 'money',
            cols: 1,
          },
        ],
      },
      {
        key: 'finagro_santander',
        title: 'Referencia FINAGRO',
        layout: 'finagroTable',
        fields: [],
      },
      {
        key: 'informacion_referencia',
        title: 'Información de referencia',
        layout: 'referenciaInfo',
        fields: [],
      },
    ],
  }
}

/** Plantilla única: Cultivos ciclo corto (Maíz, Papa, Habichuela, Yuca, Tomate) */
function schemaCultivoCicloCorto(): FormSchemaInput {
  return {
    sections: [
      {
        key: 'producto',
        title: 'Producto y superficie',
        fields: [
          {
            key: 'tipo_producto',
            label: 'Tipo de producto',
            type: 'select',
            options: CULTIVO_CICLO_CORTO_PRODUCTOS.map((p) => ({ value: p.value, label: p.label })),
            required: true,
            cols: 1,
          },
          {
            key: 'cantidad_hectareas',
            label: 'Cantidad de hectáreas',
            type: 'number',
            meta: 'Decimal',
            required: true,
            cols: 1,
          },
        ],
      },
      {
        key: 'resumen_utilidad',
        title: 'Resumen de utilidad',
        fields: [
          {
            key: 'total_utilidad_ciclo_corto',
            label: 'TOTAL UTILIDAD',
            type: 'computed',
            meta: 'Solo lectura (ventas - costos)',
            formulaKey: 'cultivo_ciclo_corto_total_utilidad',
            formulaFormat: 'money',
            cols: 1,
          },
          {
            key: 'total_utilidad_mensual_ciclo_corto',
            label: 'TOTAL UTILIDAD MENSUAL',
            type: 'computed',
            meta: 'Solo lectura (total utilidad ÷ duración meses)',
            formulaKey: 'cultivo_ciclo_corto_total_utilidad_mensual',
            formulaFormat: 'money',
            cols: 1,
          },
          {
            key: 'ventas_ciclo_corto',
            label: 'VENTAS',
            type: 'computed',
            meta: 'Solo lectura (kg producidos × precio kg)',
            formulaKey: 'cultivo_ciclo_corto_ventas',
            formulaFormat: 'money',
            cols: 1,
          },
          {
            key: 'costos_ciclo_corto',
            label: 'COSTOS',
            type: 'computed',
            meta: 'Solo lectura (ventas × % costos)',
            formulaKey: 'cultivo_ciclo_corto_costos',
            formulaFormat: 'money',
            cols: 1,
          },
        ],
      },
      {
        key: 'produccion',
        title: 'Producción',
        fields: [
          {
            key: 'duracion_ciclo_meses',
            label: 'Duración del ciclo (meses)',
            type: 'number',
            meta: 'Int',
            cols: 1,
          },
          {
            key: 'cant_kg_producidos',
            label: 'Cant. kg producidos',
            type: 'computed',
            meta: 'Solo lectura (hectáreas × kg/hectárea)',
            formulaKey: 'cultivo_ciclo_corto_cant_kg_producidos',
            formulaFormat: 'number',
            cols: 1,
          },
          {
            key: 'precio_unitario_kg',
            label: 'Precio unitario kg',
            type: 'money',
            cols: 1,
          },
        ],
      },
      {
        key: 'estandar',
        title: 'Valores estándar Finagro (referencia)',
        fields: [
          { key: 'pct_costos_kg', label: '% de costos x kg estándar', type: 'number', meta: 'Decimal (ej: 80)', cols: 1 },
          { key: 'kg_x_ha', label: 'KG x hectárea', type: 'number', meta: 'Decimal', cols: 1 },
          { key: 'plantas_x_ha', label: 'Plantas x hectárea', type: 'number', meta: 'Int', cols: 1 },
          { key: 'cuantas_plantas', label: '¿Cuántas plantas?', type: 'number', meta: 'Int', cols: 1 },
          {
            key: 'plantas_x_ha_div_cuantas',
            label: 'Plantas x hectárea ÷ ¿Cuántas plantas?',
            type: 'computed',
            meta: 'Solo lectura (plantas x ha ÷ cuántas plantas)',
            formulaKey: 'cultivo_ciclo_corto_plantas_x_ha_div_cuantas',
            formulaFormat: 'number',
            cols: 1,
          },
        ],
      },
      {
        key: 'discriminacion_costos',
        title: 'Discriminación de costos',
        layout: 'cicloCortoCostBreakdownTable',
        fields: [],
      },
    ],
  }
}

/** Plantilla: Caña de Azúcar (Panela) */
function schemaCanaPanela(): FormSchemaInput {
  return {
    sections: [
      {
        key: 'producto',
        title: 'Producto y superficie',
        fields: [
          {
            key: 'cantidad_hectareas',
            label: 'Cantidad de hectáreas',
            type: 'number',
            meta: 'Decimal',
            required: true,
            cols: 1,
          },
          {
            key: 'pct_costos',
            label: '% costos',
            type: 'number',
            meta: 'Decimal (ej: 0.5)',
            cols: 1,
          },
          {
            key: 'cultivo_en_sociedad',
            label: 'Cultivo en sociedad',
            type: 'select',
            options: [
              { value: 'no', label: 'No' },
              { value: 'si', label: 'Sí' },
            ],
            cols: 1,
          },
          {
            key: 'pct_sociedad',
            label: '% sociedad',
            type: 'text',
            cols: 1,
          },
        ],
      },
      {
        key: 'produccion',
        title: 'Producción',
        fields: [
          {
            key: 'duracion_ciclo_meses',
            label: 'Duración del ciclo (meses)',
            type: 'number',
            meta: 'Int',
            cols: 1,
          },
          {
            key: 'cant_kg_hectarea',
            label: 'Cant. kg x hectárea',
            type: 'number',
            meta: 'Decimal',
            cols: 1,
          },
          {
            key: 'valor_unitario_kg',
            label: 'Valor unitario kg',
            type: 'money',
            cols: 1,
          },
        ],
      },
    ],
  }
}

const schemaBuilders: Record<string, () => FormSchemaInput> = {
  'ganado-ceba': schemaGanadoCeba,
  'ganado-doble-proposito': schemaGanadoDobleProposito,
  'cerdos-cria': schemaCerdosCria,
  'cerdos-ceba': schemaCerdosCeba,
  'pollos-engorde': schemaPollosEngorde,
  'aves-ponedoras': schemaAvesPonedoras,
  'peces-tilapia': schemaPecesTilapia,
  'cultivo-permanente': schemaCultivoPermanente,
  'cultivo-ciclo-corto': schemaCultivoCicloCorto,
  'cana-panela': schemaCanaPanela,
}

/** Fórmula Ganado Ceba: -(((precio_compra_animal / precio_kg_animal) - peso_kg_final) / tiempo_meses_ceba) */
function computeGanadoCebaCantidad(data: Record<string, unknown>): number | null {
  const precio = Number(data.precio_compra_animal ?? 0)
  const precioKg = Number(data.precio_kg_animal ?? 0)
  const pesoFinal = Number(data.peso_kg_final ?? 0)
  const meses = Number(data.tiempo_meses_ceba ?? 0)
  if (!precioKg || !meses) return null
  const valor = -(((precio / precioKg) - pesoFinal) / meses)
  return Number.isFinite(valor) ? valor : null
}

/** Fórmula Ganado Ceba: peso_kg_inicial = precio_compra_animal / precio_kg_animal */
function computeGanadoCebaPesoInicial(data: Record<string, unknown>): number | null {
  const precio = Number(data.precio_compra_animal ?? 0)
  const precioKg = Number(data.precio_kg_animal ?? 0)
  if (!precioKg) return null
  const valor = precio / precioKg
  return Number.isFinite(valor) ? valor : null
}

/** Fórmula Ganado Ceba: ventas = cantidad_ganado × peso_kg_final × precio_kg_animal */
function computeGanadoCebaVentas(data: Record<string, unknown>): number | null {
  const cantidad = Number(data.cantidad_ganado ?? 0)
  const pesoFinal = Number(data.peso_kg_final ?? 0)
  const precioKg = Number(data.precio_kg_animal ?? 0)
  const valor = cantidad * pesoFinal * precioKg
  return Number.isFinite(valor) ? valor : null
}

/**
 * Fórmula Ganado Ceba - Costos:
 * (cantidad_ganado × (peso_kg_final - peso_kg_inicial) × costo_por_kg) + (precio_compra_animal × cantidad_ganado)
 */
function computeGanadoCebaCostos(data: Record<string, unknown>): number | null {
  const cantidad = Number(data.cantidad_ganado ?? 0)
  const pesoFinal = Number(data.peso_kg_final ?? 0)
  const pesoInicial = computeGanadoCebaPesoInicial(data)
  const costoPorKg = Number(data.costo_por_kg ?? 0)
  const precioCompra = Number(data.precio_compra_animal ?? 0)
  if (pesoInicial == null) return null
  const parte1 = cantidad * (pesoFinal - pesoInicial) * costoPorKg
  const parte2 = precioCompra * cantidad
  const valor = parte1 + parte2
  return Number.isFinite(valor) ? valor : null
}

/** Fórmula Ganado Ceba: total_utilidad = ventas - costos */
function computeGanadoCebaTotalUtilidad(data: Record<string, unknown>): number | null {
  const ventas = computeGanadoCebaVentas(data)
  const costos = computeGanadoCebaCostos(data)
  if (ventas == null || costos == null) return null
  const valor = ventas - costos
  return Number.isFinite(valor) ? valor : null
}

/** Fórmula Ganado Ceba: utilidad_mensual = (total_utilidad / tiempo_meses_ceba) * (% según respuesta / 100) */
function computeGanadoCebaUtilidadMensual(data: Record<string, unknown>): number | null {
  const totalUtilidad = computeGanadoCebaTotalUtilidad(data)
  if (totalUtilidad == null) return null
  const meses = Number(data.tiempo_meses_ceba ?? 0)
  if (!meses) return null
  const resp = String(data.ganado_en_aumento ?? '').toLowerCase()
  const pct = resp === 'no' ? 100 : resp === 'si' ? 50 : null
  if (pct == null) return null
  const valor = (totalUtilidad / meses) * (pct / 100)
  return Number.isFinite(valor) ? valor : null
}

/** Fórmula Ganado Ceba: SI(ganado_en_aumento="NO";100%;50%) → No=100%, Sí=50% */
function computeGanadoCebaPctAumento(data: Record<string, unknown>): number | null {
  const resp = String(data.ganado_en_aumento ?? '').toLowerCase()
  if (resp === 'no') return 100
  if (resp === 'si') return 50
  return null
}

/** Fórmula Ganado Doble Propósito: valor_total_crias = numero_crias × valor_unitario_venta_cria */
function computeGanadoDobleValorTotalCrias(data: Record<string, unknown>): number | null {
  const numeroCrias = Number(data.numero_crias ?? 0)
  const valorUnitario = Number(data.valor_unitario_venta_cria ?? 0)
  const valor = numeroCrias * valorUnitario
  return Number.isFinite(valor) ? valor : null
}

/** Fórmula Ganado Doble Propósito: valor_total_produccion_leche = produccion_lt_ciclo × precio_lt_leche */
function computeGanadoDobleValorTotalProduccionLeche(data: Record<string, unknown>): number | null {
  const produccionLt = Number(data.produccion_lt_ciclo ?? 0)
  const precioLt = Number(data.precio_lt_leche ?? 0)
  const valor = produccionLt * precioLt
  return Number.isFinite(valor) ? valor : null
}

/** Fórmula Ganado Doble Propósito: utilidad_mensual leche = (valor_total - costo_total) / ciclo_meses */
function computeGanadoDobleUtilidadMensualLeche(data: Record<string, unknown>): number | null {
  const valorTotal = computeGanadoDobleValorTotalProduccionLeche(data)
  const costoTotal = computeGanadoDobleCostoTotalLeche(data)
  const meses = Number(data.ciclo_produccion_leche ?? 0)
  if (valorTotal == null || costoTotal == null || !meses) return null
  const utilidad = valorTotal - costoTotal
  const valor = utilidad / meses
  return Number.isFinite(valor) ? valor : null
}

/** Fórmula: utilidad_mensual_crias_leche = (valor_total_crias / ciclo_terneros) + utilidad_mensual_leche */
function computeGanadoDobleUtilidadMensualCriasLeche(data: Record<string, unknown>): number | null {
  const valorTotalCrias = computeGanadoDobleValorTotalCrias(data)
  const cicloTerneros = Number(data.ciclo_produccion_terneros_meses ?? 0)
  const utilidadMensualLeche = computeGanadoDobleUtilidadMensualLeche(data)
  if (valorTotalCrias == null || !cicloTerneros) return null
  const parteCrias = valorTotalCrias / cicloTerneros
  const parteLeche = utilidadMensualLeche ?? 0
  const valor = parteCrias + parteLeche
  return Number.isFinite(valor) ? valor : null
}

/** Fórmula: costo_total = valor_total_produccion_leche × (costo_produccion_estandar% / 100) */
function computeGanadoDobleCostoTotalLeche(data: Record<string, unknown>): number | null {
  const valorTotal = computeGanadoDobleValorTotalProduccionLeche(data)
  const pctEstandar = Number(data.pct_costo_produccion_estandar ?? 0)
  if (valorTotal == null || !pctEstandar) return null
  const valor = valorTotal * (pctEstandar / 100)
  return Number.isFinite(valor) ? valor : null
}

/** Base para discriminación de costos (usa misma fórmula que costo_total_leche) */
function getGanadoDobleBaseCostos(data: Record<string, unknown>): number | null {
  return computeGanadoDobleCostoTotalLeche(data)
}

/** Valor = base × (porcentaje / 100) */
function computeGanadoDobleValorAlimentacion(data: Record<string, unknown>): number | null {
  const base = getGanadoDobleBaseCostos(data)
  const pct = Number(data.pct_alimentacion ?? 0)
  if (base == null) return null
  const valor = base * (pct / 100)
  return Number.isFinite(valor) ? valor : null
}

function computeGanadoDobleValorManoObra(data: Record<string, unknown>): number | null {
  const base = getGanadoDobleBaseCostos(data)
  const pct = Number(data.pct_mano_obra ?? 0)
  if (base == null) return null
  const valor = base * (pct / 100)
  return Number.isFinite(valor) ? valor : null
}

function computeGanadoDobleValorMantenimientoPasturas(data: Record<string, unknown>): number | null {
  const base = getGanadoDobleBaseCostos(data)
  const pct = Number(data.pct_mantenimiento_pasturas ?? 0)
  if (base == null) return null
  const valor = base * (pct / 100)
  return Number.isFinite(valor) ? valor : null
}

function computeGanadoDobleValorMantenimientoInfraestructura(data: Record<string, unknown>): number | null {
  const base = getGanadoDobleBaseCostos(data)
  const pct = Number(data.pct_mantenimiento_infraestructura ?? 0)
  if (base == null) return null
  const valor = base * (pct / 100)
  return Number.isFinite(valor) ? valor : null
}

function computeGanadoDobleValorInsumosVeterinarios(data: Record<string, unknown>): number | null {
  const base = getGanadoDobleBaseCostos(data)
  const pct = Number(data.pct_insumos_veterinarios ?? 0)
  if (base == null) return null
  const valor = base * (pct / 100)
  return Number.isFinite(valor) ? valor : null
}

/** Cerdos Cría: costo_total = valor_venta × pct_costos_estandar (pct: 0.85 o 85) */
function computeCerdosCriaCostoTotal(data: Record<string, unknown>): number | null {
  const cerdosParaCria = computeCerdosCriaCerdosParaCria(data)
  const precioDestetado = Number(data.precio_cerdo_destetado ?? 0)
  if (cerdosParaCria == null) return null
  let pct = Number(data.pct_costos_estandar ?? 0)
  if (pct > 1) pct = pct / 100
  const valorVenta = cerdosParaCria * precioDestetado
  const valor = valorVenta * pct
  return Number.isFinite(valor) ? valor : null
}

/** Base para discriminación Cerdos Cría */
function getCerdosCriaBaseCostos(data: Record<string, unknown>): number | null {
  return computeCerdosCriaCostoTotal(data)
}

function computeCerdosCriaValorSostenimientoMadre(data: Record<string, unknown>): number | null {
  const base = getCerdosCriaBaseCostos(data)
  const pct = Number(data.pct_sostenimiento_madre ?? 0)
  if (base == null) return null
  const valor = base * (pct / 100)
  return Number.isFinite(valor) ? valor : null
}

function computeCerdosCriaValorAlimentacionLechon(data: Record<string, unknown>): number | null {
  const base = getCerdosCriaBaseCostos(data)
  const pct = Number(data.pct_alimentacion_lechon ?? 0)
  if (base == null) return null
  const valor = base * (pct / 100)
  return Number.isFinite(valor) ? valor : null
}

function computeCerdosCriaValorMedicamentoComplementos(data: Record<string, unknown>): number | null {
  const base = getCerdosCriaBaseCostos(data)
  const pct = Number(data.pct_medicamento_complementos ?? 0)
  if (base == null) return null
  const valor = base * (pct / 100)
  return Number.isFinite(valor) ? valor : null
}

function computeCerdosCriaValorManoObra(data: Record<string, unknown>): number | null {
  const base = getCerdosCriaBaseCostos(data)
  const pct = Number(data.pct_mano_obra_cerdos ?? 0)
  if (base == null) return null
  const valor = base * (pct / 100)
  return Number.isFinite(valor) ? valor : null
}

function computeCerdosCriaValorMantenimientoInfraestructura(data: Record<string, unknown>): number | null {
  const base = getCerdosCriaBaseCostos(data)
  const pct = Number(data.pct_mantenimiento_infraestructura ?? 0)
  if (base == null) return null
  const valor = base * (pct / 100)
  return Number.isFinite(valor) ? valor : null
}

/** Cerdos Cría: cerdos_para_cria = cerdas_cria × lechones_destetados */
function computeCerdosCriaCerdosParaCria(data: Record<string, unknown>): number | null {
  const cerdas = Number(data.cerdas_cria ?? 0)
  const lechones = Number(data.lechones_destetados ?? 0)
  const valor = cerdas * lechones
  return Number.isFinite(valor) ? valor : null
}

/** Cerdos Cría: ventas = cerdos_para_cria × precio_cerdo_destetado */
function computeCerdosCriaVentas(data: Record<string, unknown>): number | null {
  const cerdos = computeCerdosCriaCerdosParaCria(data)
  const precio = Number(data.precio_cerdo_destetado ?? 0)
  if (cerdos == null) return null
  const valor = cerdos * precio
  return Number.isFinite(valor) ? valor : null
}

/** Cerdos Cría: costos = ventas × % costo estándar */
function computeCerdosCriaCostosResumen(data: Record<string, unknown>): number | null {
  return computeCerdosCriaCostoTotal(data)
}

/** Cerdos Cría: total_utilidad = ventas - costos */
function computeCerdosCriaTotalUtilidad(data: Record<string, unknown>): number | null {
  const ventas = computeCerdosCriaVentas(data)
  const costos = computeCerdosCriaCostosResumen(data)
  if (ventas == null || costos == null) return null
  const valor = ventas - costos
  return Number.isFinite(valor) ? valor : null
}

/** Cerdos Cría: utilidad_mensual = (total_utilidad / duracion_ciclo_dias) × 30 */
function computeCerdosCriaTotalUtilidadMensual(data: Record<string, unknown>): number | null {
  const totalUtilidad = computeCerdosCriaTotalUtilidad(data)
  const dias = Number(data.duracion_ciclo_dias ?? 0)
  if (totalUtilidad == null || !dias) return null
  const valor = (totalUtilidad / dias) * 30
  return Number.isFinite(valor) ? valor : null
}

/** Cerdos Cría: total_costos = suma de todos los valores */
function computeCerdosCriaTotalCostos(data: Record<string, unknown>): number | null {
  const v1 = computeCerdosCriaValorSostenimientoMadre(data) ?? 0
  const v2 = computeCerdosCriaValorAlimentacionLechon(data) ?? 0
  const v3 = computeCerdosCriaValorMedicamentoComplementos(data) ?? 0
  const v4 = computeCerdosCriaValorManoObra(data) ?? 0
  const v5 = computeCerdosCriaValorMantenimientoInfraestructura(data) ?? 0
  const valor = v1 + v2 + v3 + v4 + v5
  return Number.isFinite(valor) ? valor : null
}

/** Cerdos Ceba: ventas = cerdos_para_ceba × peso_promedio_kg × precio_kg_pie */
function computeCerdosCebaVentas(data: Record<string, unknown>): number | null {
  const cerdos = Number(data.cerdos_para_ceba ?? 0)
  const peso = Number(data.peso_promedio_kg_ceba ?? 0)
  const precio = Number(data.precio_kg_pie ?? 0)
  const valor = cerdos * peso * precio
  return Number.isFinite(valor) ? valor : null
}

/** Cerdos Ceba: costo_total = ventas × pct_costos_estandar */
function computeCerdosCebaCostoTotal(data: Record<string, unknown>): number | null {
  const ventas = computeCerdosCebaVentas(data)
  let pct = Number(data.pct_costos_estandar ?? 0)
  if (ventas == null) return null
  if (pct > 1) pct = pct / 100
  const valor = ventas * pct
  return Number.isFinite(valor) ? valor : null
}

function getCerdosCebaBaseCostos(data: Record<string, unknown>): number | null {
  return computeCerdosCebaCostoTotal(data)
}

function computeCerdosCebaValorLechonDestetado(data: Record<string, unknown>): number | null {
  const base = getCerdosCebaBaseCostos(data)
  const pct = Number(data.pct_lechon_destetado ?? 0)
  if (base == null) return null
  const valor = base * (pct / 100)
  return Number.isFinite(valor) ? valor : null
}

function computeCerdosCebaValorAlimentacion(data: Record<string, unknown>): number | null {
  const base = getCerdosCebaBaseCostos(data)
  const pct = Number(data.pct_alimentacion_ceba ?? 0)
  if (base == null) return null
  const valor = base * (pct / 100)
  return Number.isFinite(valor) ? valor : null
}

function computeCerdosCebaValorMedicamentoComplementos(data: Record<string, unknown>): number | null {
  const base = getCerdosCebaBaseCostos(data)
  const pct = Number(data.pct_medicamento_complementos_ceba ?? 0)
  if (base == null) return null
  const valor = base * (pct / 100)
  return Number.isFinite(valor) ? valor : null
}

function computeCerdosCebaValorManoObra(data: Record<string, unknown>): number | null {
  const base = getCerdosCebaBaseCostos(data)
  const pct = Number(data.pct_mano_obra_ceba ?? 0)
  if (base == null) return null
  const valor = base * (pct / 100)
  return Number.isFinite(valor) ? valor : null
}

/** Cerdos Ceba: total_costos = suma discriminación */
function computeCerdosCebaTotalCostos(data: Record<string, unknown>): number | null {
  const v1 = computeCerdosCebaValorLechonDestetado(data) ?? 0
  const v2 = computeCerdosCebaValorAlimentacion(data) ?? 0
  const v3 = computeCerdosCebaValorMedicamentoComplementos(data) ?? 0
  const v4 = computeCerdosCebaValorManoObra(data) ?? 0
  const valor = v1 + v2 + v3 + v4
  return Number.isFinite(valor) ? valor : null
}

/** Cerdos Ceba: costos = ventas × % costo estándar */
function computeCerdosCebaCostosResumen(data: Record<string, unknown>): number | null {
  return computeCerdosCebaCostoTotal(data)
}

/** Cerdos Ceba: total_utilidad = ventas - costos */
function computeCerdosCebaTotalUtilidad(data: Record<string, unknown>): number | null {
  const ventas = computeCerdosCebaVentas(data)
  const costos = computeCerdosCebaCostosResumen(data)
  if (ventas == null || costos == null) return null
  const valor = ventas - costos
  return Number.isFinite(valor) ? valor : null
}

/** Cerdos Ceba: utilidad_mensual = total_utilidad / duracion_ciclo_meses */
function computeCerdosCebaTotalUtilidadMensual(data: Record<string, unknown>): number | null {
  const totalUtilidad = computeCerdosCebaTotalUtilidad(data)
  const meses = Number(data.duracion_ciclo_meses ?? 0)
  if (totalUtilidad == null || !meses) return null
  const valor = totalUtilidad / meses
  return Number.isFinite(valor) ? valor : null
}

/** Pollos Engorde: pollos_en_engorde = cantidad × (1 - tasa_mortalidad/100) */
function computePollosEngordePollosEnEngorde(data: Record<string, unknown>): number | null {
  const v = getPollosEngordeSupervivientes(data)
  return v != null ? Math.round(v) : null
}

/** Pollos Engorde: pollos_supervivientes = cantidad × (1 - tasa_mortalidad/100) */
function getPollosEngordeSupervivientes(data: Record<string, unknown>): number | null {
  const cantidad = Number(data.cantidad_pollos ?? 0)
  const tasaMort = Number(data.tasa_mortalidad_pct ?? 0)
  if (!cantidad) return null
  const supervivientes = cantidad * (1 - tasaMort / 100)
  return Number.isFinite(supervivientes) && supervivientes >= 0 ? supervivientes : null
}

/** Pollos Engorde: ventas = pollos_en_engorde × precio_venta_pie_kg × peso_kg_venta */
function computePollosEngordeVentas(data: Record<string, unknown>): number | null {
  const pollosEnEngorde = getPollosEngordeSupervivientes(data)
  const precioPieKg = Number(data.precio_venta_pie_kg ?? 0)
  const pesoKg = Number(data.peso_kg_venta ?? 0)
  if (pollosEnEngorde == null || !precioPieKg || !pesoKg) return null
  const valor = pollosEnEngorde * precioPieKg * pesoKg
  return Number.isFinite(valor) ? valor : null
}

/** Pollos Engorde: costos = supervivientes × peso_kg_venta × costo_kg_venta */
function computePollosEngordeCostos(data: Record<string, unknown>): number | null {
  const supervivientes = getPollosEngordeSupervivientes(data)
  const peso = Number(data.peso_kg_venta ?? 0)
  const costoKg = Number(data.costo_kg_venta ?? 0)
  if (supervivientes == null || !peso || !costoKg) return null
  const valor = supervivientes * peso * costoKg
  return Number.isFinite(valor) ? valor : null
}

/** Pollos Engorde: total_utilidad = ventas - costos */
function computePollosEngordeTotalUtilidad(data: Record<string, unknown>): number | null {
  const ventas = computePollosEngordeVentas(data)
  const costos = computePollosEngordeCostos(data)
  if (ventas == null || costos == null) return null
  const valor = ventas - costos
  return Number.isFinite(valor) ? valor : null
}

/** Pollos Engorde: utilidad_mensual = (total_utilidad / tiempo_ciclo_dias) × 30 */
function computePollosEngordeTotalUtilidadMensual(data: Record<string, unknown>): number | null {
  const totalUtilidad = computePollosEngordeTotalUtilidad(data)
  const dias = Number(data.tiempo_ciclo_dias ?? 0)
  if (totalUtilidad == null || !dias) return null
  const valor = (totalUtilidad / dias) * 30
  return Number.isFinite(valor) ? valor : null
}

/** Aves Ponedoras: cubetas_mensuales = cubetas_diarias × 30 */
function computeAvesCubetasMensuales(data: Record<string, unknown>): number | null {
  const diarias = computeAvesCubetasDiarias(data)
  if (diarias == null) return null
  const valor = diarias * 30
  return Number.isFinite(valor) ? valor : null
}

/** Aves Ponedoras: cubetas_diarias = aves_en_produccion ÷ 30 */
function computeAvesCubetasDiarias(data: Record<string, unknown>): number | null {
  const aves = computeAvesEnProduccion(data)
  if (aves == null) return null
  const valor = aves / 30
  return Number.isFinite(valor) ? valor : null
}

/** Aves Ponedoras: aves_en_produccion = cantidad_aves × (1 - pct_mortalidad_postura/100) */
function computeAvesEnProduccion(data: Record<string, unknown>): number | null {
  const cantidad = Number(data.cantidad_aves ?? 0)
  const pct = Number(data.pct_mortalidad_postura ?? 0)
  const valor = cantidad * (1 - pct / 100)
  return Number.isFinite(valor) ? Math.round(valor) : null
}

/** Aves Ponedoras: total por clasificación = precio × cantidad_diaria */
function computeAvesTotalClasificacionB(data: Record<string, unknown>): number | null {
  const precio = Number(data.precio_cubeta_b ?? 0)
  const cant = Number(data.cantidad_diaria_b ?? 0)
  const valor = precio * cant
  return Number.isFinite(valor) ? valor : null
}
function computeAvesTotalClasificacionA(data: Record<string, unknown>): number | null {
  const precio = Number(data.precio_cubeta_a ?? 0)
  const cant = Number(data.cantidad_diaria_a ?? 0)
  const valor = precio * cant
  return Number.isFinite(valor) ? valor : null
}
function computeAvesTotalClasificacionAa(data: Record<string, unknown>): number | null {
  const precio = Number(data.precio_cubeta_aa ?? 0)
  const cant = Number(data.cantidad_diaria_aa ?? 0)
  const valor = precio * cant
  return Number.isFinite(valor) ? valor : null
}
function computeAvesTotalClasificacionExtra(data: Record<string, unknown>): number | null {
  const precio = Number(data.precio_cubeta_extra ?? 0)
  const cant = Number(data.cantidad_diaria_extra ?? 0)
  const valor = precio * cant
  return Number.isFinite(valor) ? valor : null
}
function computeAvesTotalClasificacionCriollos(data: Record<string, unknown>): number | null {
  const precio = Number(data.precio_cubeta_criollos ?? 0)
  const cant = Number(data.cantidad_diaria_criollos ?? 0)
  const valor = precio * cant
  return Number.isFinite(valor) ? valor : null
}

/** Aves Ponedoras: total cantidad diaria = suma de cantidades */
function computeAvesTotalCantidadDiaria(data: Record<string, unknown>): number | null {
  const c1 = Number(data.cantidad_diaria_b ?? 0)
  const c2 = Number(data.cantidad_diaria_a ?? 0)
  const c3 = Number(data.cantidad_diaria_aa ?? 0)
  const c4 = Number(data.cantidad_diaria_extra ?? 0)
  const c5 = Number(data.cantidad_diaria_criollos ?? 0)
  const valor = c1 + c2 + c3 + c4 + c5
  return Number.isFinite(valor) ? valor : null
}

/** Aves Ponedoras: total valor diario = suma de totales por clasificación */
function computeAvesTotalValorDiario(data: Record<string, unknown>): number | null {
  const t1 = computeAvesTotalClasificacionB(data) ?? 0
  const t2 = computeAvesTotalClasificacionA(data) ?? 0
  const t3 = computeAvesTotalClasificacionAa(data) ?? 0
  const t4 = computeAvesTotalClasificacionExtra(data) ?? 0
  const t5 = computeAvesTotalClasificacionCriollos(data) ?? 0
  const valor = t1 + t2 + t3 + t4 + t5
  return Number.isFinite(valor) ? valor : null
}

/** Aves Ponedoras: ventas = total_valor_diario × 30 (mensual) */
function computeAvesPonedorasVentas(data: Record<string, unknown>): number | null {
  const totalDiario = computeAvesTotalValorDiario(data)
  if (totalDiario == null) return null
  const valor = totalDiario * 30
  return Number.isFinite(valor) ? valor : null
}

/** Aves Ponedoras: costos = ventas × (pct_costo_huevo/100) */
function computeAvesPonedorasCostos(data: Record<string, unknown>): number | null {
  const ventas = computeAvesPonedorasVentas(data)
  const pct = Number(data.pct_costo_huevo ?? 0)
  if (ventas == null || !pct) return null
  const valor = ventas * (pct / 100)
  return Number.isFinite(valor) ? valor : null
}

/** Aves Ponedoras: total_utilidad = ventas - costos */
function computeAvesPonedorasTotalUtilidad(data: Record<string, unknown>): number | null {
  const ventas = computeAvesPonedorasVentas(data)
  const costos = computeAvesPonedorasCostos(data)
  if (ventas == null || costos == null) return null
  const valor = ventas - costos
  return Number.isFinite(valor) ? valor : null
}

/** Aves Ponedoras: utilidad_mensual = total_utilidad (cubetas ya son mensuales) */
function computeAvesPonedorasTotalUtilidadMensual(data: Record<string, unknown>): number | null {
  return computeAvesPonedorasTotalUtilidad(data)
}

/** Lookup en finagro_ranges: encuentra el rango donde edad_min <= edad <= edad_max */
function findFinagroRange(data: Record<string, unknown>): { pct_costos: number; kg_hectarea: number | null } | null {
  const edad = Number(data.edad_cultivo ?? 0)
  if (!Number.isFinite(edad) || edad < 1) return null
  const ranges = (data.finagro_ranges as Array<{ edad_min: number; edad_max: number; pct_costos: number; kg_hectarea?: number | null }>) ?? []
  const range = ranges.find((r: { edad_min: number; edad_max: number }) => edad >= r.edad_min && edad <= r.edad_max)
  if (!range) return null
  return {
    pct_costos: Number(range.pct_costos ?? 0),
    kg_hectarea: range.kg_hectarea != null && range.kg_hectarea !== '' ? Number(range.kg_hectarea) : null,
  }
}

/**
 * Cultivo Permanente: cant_kg_hectarea = productividad según edad (tabla FINAGRO por producto).
 * Lookup en finagro_ranges por edad_cultivo.
 */
function computeCultivoPermanenteKgHectarea(data: Record<string, unknown>): number | null {
  const r = findFinagroRange(data)
  return r?.kg_hectarea ?? null
}

function getFinagroNum(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/**
 * Cultivo Permanente: pct_costos = % costo x HA según edad (tabla FINAGRO por producto).
 * Lookup en finagro_ranges por edad_cultivo.
 */
function computeCultivoPermanentePctCostos(data: Record<string, unknown>): number | null {
  const r = findFinagroRange(data)
  return r?.pct_costos ?? null
}

/** Cultivo Permanente: valor_total = cant_kg_hectarea × valor_unitario_kg × cantidad_hectareas */
function computeCultivoPermanenteValorTotal(data: Record<string, unknown>): number | null {
  const kgHa = computeCultivoPermanenteKgHectarea(data) ?? 0
  const valorKg = Number(data.valor_unitario_kg ?? 0)
  const hectareas = Number(data.cantidad_hectareas ?? 0)
  const valor = kgHa * valorKg * hectareas
  return Number.isFinite(valor) ? valor : null
}

/** Cultivo Permanente: ventas_anual = valor_total (misma fórmula) */
function computeCultivoPermanenteVentasAnual(data: Record<string, unknown>): number | null {
  return computeCultivoPermanenteValorTotal(data)
}

/** Cultivo Permanente: costos_anual = ventas_anual × (pct_costos/100) */
function computeCultivoPermanenteCostosAnual(data: Record<string, unknown>): number | null {
  const ventas = computeCultivoPermanenteVentasAnual(data)
  const pctLookup = computeCultivoPermanentePctCostos(data)
  let pct = pctLookup ?? Number(data.pct_costos ?? 0)
  if (pct > 1) pct = pct / 100
  if (ventas == null || !pct) return null
  const valor = ventas * pct
  return Number.isFinite(valor) ? valor : null
}

/** Cultivo Permanente: total_utilidad = ventas_anual - costos_anual */
function computeCultivoPermanenteTotalUtilidad(data: Record<string, unknown>): number | null {
  const ventas = computeCultivoPermanenteVentasAnual(data)
  const costos = computeCultivoPermanenteCostosAnual(data)
  if (ventas == null || costos == null) return null
  const valor = ventas - costos
  return Number.isFinite(valor) ? valor : null
}

/** Cultivo Permanente: utilidad_mensual = total_utilidad / duracion_meses */
function computeCultivoPermanenteTotalUtilidadMensual(data: Record<string, unknown>): number | null {
  const totalUtilidad = computeCultivoPermanenteTotalUtilidad(data)
  const meses = Number(data.duracion_meses ?? 0)
  if (totalUtilidad == null || !meses) return null
  const valor = totalUtilidad / meses
  return Number.isFinite(valor) ? valor : null
}

/** Cultivo Ciclo Corto: plantas_x_ha_div_cuantas = plantas_x_ha ÷ cuantas_plantas */
function computeCultivoCicloCortoPlantasXHaDivCuantas(data: Record<string, unknown>): number | null {
  const plantasXHa = Number(data.plantas_x_ha ?? 0)
  const cuantas = Number(data.cuantas_plantas ?? 0)
  if (!cuantas) return null
  const valor = plantasXHa / cuantas
  return Number.isFinite(valor) ? valor : null
}

/** Cultivo Ciclo Corto: cant_kg_producidos = cantidad_hectareas × kg_x_ha */
function computeCultivoCicloCortoCantKgProducidos(data: Record<string, unknown>): number | null {
  const hectareas = Number(data.cantidad_hectareas ?? 0)
  const kgHa = Number(data.kg_x_ha ?? 0)
  const valor = hectareas * kgHa
  return Number.isFinite(valor) ? valor : null
}

/** Cultivo Ciclo Corto: ventas = cant_kg_producidos × precio_unitario_kg */
function computeCultivoCicloCortoVentas(data: Record<string, unknown>): number | null {
  const kg = computeCultivoCicloCortoCantKgProducidos(data)
  const precio = Number(data.precio_unitario_kg ?? 0)
  const valor = kg * precio
  return Number.isFinite(valor) ? valor : null
}

/** Cultivo Ciclo Corto: costos = ventas × (pct_costos_kg / 100) */
function computeCultivoCicloCortoCostos(data: Record<string, unknown>): number | null {
  const ventas = computeCultivoCicloCortoVentas(data)
  let pct = Number(data.pct_costos_kg ?? 0)
  if (pct > 1) pct = pct / 100
  if (ventas == null || !pct) return null
  const valor = ventas * pct
  return Number.isFinite(valor) ? valor : null
}

/** Cultivo Ciclo Corto: total_utilidad = ventas - costos */
function computeCultivoCicloCortoTotalUtilidad(data: Record<string, unknown>): number | null {
  const ventas = computeCultivoCicloCortoVentas(data)
  const costos = computeCultivoCicloCortoCostos(data)
  if (ventas == null || costos == null) return null
  const valor = ventas - costos
  return Number.isFinite(valor) ? valor : null
}

/** Cultivo Ciclo Corto: utilidad_mensual = total_utilidad / duracion_ciclo_meses */
function computeCultivoCicloCortoTotalUtilidadMensual(data: Record<string, unknown>): number | null {
  const totalUtilidad = computeCultivoCicloCortoTotalUtilidad(data)
  const meses = Number(data.duracion_ciclo_meses ?? 0)
  if (totalUtilidad == null || !meses) return null
  const valor = totalUtilidad / meses
  return Number.isFinite(valor) ? valor : null
}

/** Peces Tilapia: ventas = cantidad_alevinos × peso_final_libras × precio_venta_libra */
function computePecesTilapiaVentas(data: Record<string, unknown>): number | null {
  const cantidad = Number(data.cantidad_alevinos ?? 0)
  const peso = Number(data.peso_final_libras ?? 0)
  const precio = Number(data.precio_venta_libra ?? 0)
  const valor = cantidad * peso * precio
  return Number.isFinite(valor) ? valor : null
}

/** Peces Tilapia: costos = ventas × pct_costos_estandar */
function computePecesTilapiaCostos(data: Record<string, unknown>): number | null {
  const ventas = computePecesTilapiaVentas(data)
  let pct = Number(data.pct_costos_estandar ?? 0)
  if (pct > 1) pct = pct / 100
  if (ventas == null || !pct) return null
  const valor = ventas * pct
  return Number.isFinite(valor) ? valor : null
}

/** Peces Tilapia: total_utilidad = ventas - costos */
function computePecesTilapiaTotalUtilidad(data: Record<string, unknown>): number | null {
  const ventas = computePecesTilapiaVentas(data)
  const costos = computePecesTilapiaCostos(data)
  if (ventas == null || costos == null) return null
  const valor = ventas - costos
  return Number.isFinite(valor) ? valor : null
}

/** Peces Tilapia: utilidad_mensual = (total_utilidad / tiempo_ciclo_dias) × 30 */
function computePecesTilapiaTotalUtilidadMensual(data: Record<string, unknown>): number | null {
  const totalUtilidad = computePecesTilapiaTotalUtilidad(data)
  const dias = Number(data.tiempo_ciclo_dias ?? 0)
  if (totalUtilidad == null || !dias) return null
  const valor = (totalUtilidad / dias) * 30
  return Number.isFinite(valor) ? valor : null
}

/** Base para discriminación Peces Tilapia */
function getPecesTilapiaBaseCostos(data: Record<string, unknown>): number | null {
  return computePecesTilapiaCostos(data)
}

function computePecesTilapiaValorManoObra(data: Record<string, unknown>): number | null {
  const base = getPecesTilapiaBaseCostos(data)
  const pct = Number(data.pct_mano_obra_tilapia ?? 0)
  if (base == null) return null
  const valor = base * (pct / 100)
  return Number.isFinite(valor) ? valor : null
}

function computePecesTilapiaValorPreparacionEstanque(data: Record<string, unknown>): number | null {
  const base = getPecesTilapiaBaseCostos(data)
  const pct = Number(data.pct_preparacion_estanque ?? 0)
  if (base == null) return null
  const valor = base * (pct / 100)
  return Number.isFinite(valor) ? valor : null
}

function computePecesTilapiaValorCompraEspecies(data: Record<string, unknown>): number | null {
  const base = getPecesTilapiaBaseCostos(data)
  const pct = Number(data.pct_compra_especies ?? 0)
  if (base == null) return null
  const valor = base * (pct / 100)
  return Number.isFinite(valor) ? valor : null
}

function computePecesTilapiaValorTratamientos(data: Record<string, unknown>): number | null {
  const base = getPecesTilapiaBaseCostos(data)
  const pct = Number(data.pct_tratamientos_tilapia ?? 0)
  if (base == null) return null
  const valor = base * (pct / 100)
  return Number.isFinite(valor) ? valor : null
}

function computePecesTilapiaValorSacrificio(data: Record<string, unknown>): number | null {
  const base = getPecesTilapiaBaseCostos(data)
  const pct = Number(data.pct_sacrificio_tilapia ?? 0)
  if (base == null) return null
  const valor = base * (pct / 100)
  return Number.isFinite(valor) ? valor : null
}

function computePecesTilapiaValorAlimentacion(data: Record<string, unknown>): number | null {
  const base = getPecesTilapiaBaseCostos(data)
  const pct = Number(data.pct_alimentacion_tilapia ?? 0)
  if (base == null) return null
  const valor = base * (pct / 100)
  return Number.isFinite(valor) ? valor : null
}

/** Peces Tilapia: total_costos = suma de todos los valores */
function computePecesTilapiaTotalCostos(data: Record<string, unknown>): number | null {
  const v1 = computePecesTilapiaValorManoObra(data) ?? 0
  const v2 = computePecesTilapiaValorPreparacionEstanque(data) ?? 0
  const v3 = computePecesTilapiaValorCompraEspecies(data) ?? 0
  const v4 = computePecesTilapiaValorTratamientos(data) ?? 0
  const v5 = computePecesTilapiaValorSacrificio(data) ?? 0
  const v6 = computePecesTilapiaValorAlimentacion(data) ?? 0
  const valor = v1 + v2 + v3 + v4 + v5 + v6
  return Number.isFinite(valor) ? valor : null
}

/** Fórmula Ganado Doble Propósito: total_costos = suma de todos los valores calculados */
function computeGanadoDobleTotalCostos(data: Record<string, unknown>): number | null {
  const v1 = computeGanadoDobleValorAlimentacion(data) ?? 0
  const v2 = computeGanadoDobleValorManoObra(data) ?? 0
  const v3 = computeGanadoDobleValorMantenimientoPasturas(data) ?? 0
  const v4 = computeGanadoDobleValorMantenimientoInfraestructura(data) ?? 0
  const v5 = computeGanadoDobleValorInsumosVeterinarios(data) ?? 0
  const valor = v1 + v2 + v3 + v4 + v5
  return Number.isFinite(valor) ? valor : null
}

/** Fórmula Ganado Doble Propósito: produccion_mensual_lt = valor_total / ciclo_produccion_leche (meses) */
function computeGanadoDobleProduccionMensualLt(data: Record<string, unknown>): number | null {
  const valorTotal = computeGanadoDobleValorTotalProduccionLeche(data)
  const meses = Number(data.ciclo_produccion_leche ?? 0)
  if (valorTotal == null || !meses) return null
  const valor = valorTotal / meses
  return Number.isFinite(valor) ? valor : null
}

const formulaComputers: Record<string, (data: Record<string, unknown>) => number | null> = {
  ganado_doble_valor_total_crias: computeGanadoDobleValorTotalCrias,
  ganado_doble_valor_total_produccion_leche: computeGanadoDobleValorTotalProduccionLeche,
  ganado_doble_costo_total_leche: computeGanadoDobleCostoTotalLeche,
  ganado_doble_produccion_mensual_lt: computeGanadoDobleProduccionMensualLt,
  ganado_doble_utilidad_mensual_leche: computeGanadoDobleUtilidadMensualLeche,
  ganado_doble_utilidad_mensual_crias_leche: computeGanadoDobleUtilidadMensualCriasLeche,
  ganado_doble_valor_alimentacion: computeGanadoDobleValorAlimentacion,
  ganado_doble_valor_mano_obra: computeGanadoDobleValorManoObra,
  ganado_doble_valor_mantenimiento_pasturas: computeGanadoDobleValorMantenimientoPasturas,
  ganado_doble_valor_mantenimiento_infraestructura: computeGanadoDobleValorMantenimientoInfraestructura,
  ganado_doble_valor_insumos_veterinarios: computeGanadoDobleValorInsumosVeterinarios,
  ganado_doble_total_costos: computeGanadoDobleTotalCostos,
  ganado_ceba_cantidad: computeGanadoCebaCantidad,
  ganado_ceba_peso_inicial: computeGanadoCebaPesoInicial,
  ganado_ceba_pct_aumento: computeGanadoCebaPctAumento,
  ganado_ceba_ventas: computeGanadoCebaVentas,
  ganado_ceba_costos: computeGanadoCebaCostos,
  ganado_ceba_total_utilidad: computeGanadoCebaTotalUtilidad,
  ganado_ceba_utilidad_mensual: computeGanadoCebaUtilidadMensual,
  cerdos_cria_costo_total: computeCerdosCriaCostoTotal,
  cerdos_cria_valor_sostenimiento_madre: computeCerdosCriaValorSostenimientoMadre,
  cerdos_cria_valor_alimentacion_lechon: computeCerdosCriaValorAlimentacionLechon,
  cerdos_cria_valor_medicamento_complementos: computeCerdosCriaValorMedicamentoComplementos,
  cerdos_cria_valor_mano_obra: computeCerdosCriaValorManoObra,
  cerdos_cria_valor_mantenimiento_infraestructura: computeCerdosCriaValorMantenimientoInfraestructura,
  cerdos_cria_total_costos: computeCerdosCriaTotalCostos,
  cerdos_cria_cerdos_para_cria: computeCerdosCriaCerdosParaCria,
  cerdos_cria_ventas: computeCerdosCriaVentas,
  cerdos_cria_costos_resumen: computeCerdosCriaCostosResumen,
  cerdos_cria_total_utilidad: computeCerdosCriaTotalUtilidad,
  cerdos_cria_total_utilidad_mensual: computeCerdosCriaTotalUtilidadMensual,
  cerdos_ceba_ventas: computeCerdosCebaVentas,
  cerdos_ceba_costo_total: computeCerdosCebaCostoTotal,
  cerdos_ceba_valor_lechon_destetado: computeCerdosCebaValorLechonDestetado,
  cerdos_ceba_valor_alimentacion: computeCerdosCebaValorAlimentacion,
  cerdos_ceba_valor_medicamento_complementos: computeCerdosCebaValorMedicamentoComplementos,
  cerdos_ceba_valor_mano_obra: computeCerdosCebaValorManoObra,
  cerdos_ceba_total_costos: computeCerdosCebaTotalCostos,
  cerdos_ceba_costos_resumen: computeCerdosCebaCostosResumen,
  cerdos_ceba_total_utilidad: computeCerdosCebaTotalUtilidad,
  cerdos_ceba_total_utilidad_mensual: computeCerdosCebaTotalUtilidadMensual,
  pollos_engorde_cantidad: computePollosEngordePollosEnEngorde,
  pollos_engorde_ventas: computePollosEngordeVentas,
  pollos_engorde_costos: computePollosEngordeCostos,
  pollos_engorde_total_utilidad: computePollosEngordeTotalUtilidad,
  pollos_engorde_total_utilidad_mensual: computePollosEngordeTotalUtilidadMensual,
  aves_en_produccion: computeAvesEnProduccion,
  aves_cubetas_diarias: computeAvesCubetasDiarias,
  aves_cubetas_mensuales: computeAvesCubetasMensuales,
  aves_total_clasificacion_b: computeAvesTotalClasificacionB,
  aves_total_clasificacion_a: computeAvesTotalClasificacionA,
  aves_total_clasificacion_aa: computeAvesTotalClasificacionAa,
  aves_total_clasificacion_extra: computeAvesTotalClasificacionExtra,
  aves_total_clasificacion_criollos: computeAvesTotalClasificacionCriollos,
  aves_total_cantidad_diaria: computeAvesTotalCantidadDiaria,
  aves_total_valor_diario: computeAvesTotalValorDiario,
  aves_ponedoras_ventas: computeAvesPonedorasVentas,
  aves_ponedoras_costos: computeAvesPonedorasCostos,
  aves_ponedoras_total_utilidad: computeAvesPonedorasTotalUtilidad,
  aves_ponedoras_total_utilidad_mensual: computeAvesPonedorasTotalUtilidadMensual,
  peces_tilapia_ventas: computePecesTilapiaVentas,
  peces_tilapia_costos: computePecesTilapiaCostos,
  peces_tilapia_total_utilidad: computePecesTilapiaTotalUtilidad,
  peces_tilapia_total_utilidad_mensual: computePecesTilapiaTotalUtilidadMensual,
  peces_tilapia_valor_mano_obra: computePecesTilapiaValorManoObra,
  peces_tilapia_valor_preparacion_estanque: computePecesTilapiaValorPreparacionEstanque,
  peces_tilapia_valor_compra_especies: computePecesTilapiaValorCompraEspecies,
  peces_tilapia_valor_tratamientos: computePecesTilapiaValorTratamientos,
  peces_tilapia_valor_sacrificio: computePecesTilapiaValorSacrificio,
  peces_tilapia_valor_alimentacion: computePecesTilapiaValorAlimentacion,
  peces_tilapia_total_costos: computePecesTilapiaTotalCostos,
  cultivo_permanente_kg_hectarea: computeCultivoPermanenteKgHectarea,
  cultivo_permanente_pct_costos: computeCultivoPermanentePctCostos,
  cultivo_permanente_valor_total: computeCultivoPermanenteValorTotal,
  cultivo_permanente_ventas_anual: computeCultivoPermanenteVentasAnual,
  cultivo_permanente_costos_anual: computeCultivoPermanenteCostosAnual,
  cultivo_permanente_total_utilidad: computeCultivoPermanenteTotalUtilidad,
  cultivo_permanente_total_utilidad_mensual: computeCultivoPermanenteTotalUtilidadMensual,
  cultivo_ciclo_corto_cant_kg_producidos: computeCultivoCicloCortoCantKgProducidos,
  cultivo_ciclo_corto_plantas_x_ha_div_cuantas: computeCultivoCicloCortoPlantasXHaDivCuantas,
  cultivo_ciclo_corto_ventas: computeCultivoCicloCortoVentas,
  cultivo_ciclo_corto_costos: computeCultivoCicloCortoCostos,
  cultivo_ciclo_corto_total_utilidad: computeCultivoCicloCortoTotalUtilidad,
  cultivo_ciclo_corto_total_utilidad_mensual: computeCultivoCicloCortoTotalUtilidadMensual,
}

/** Evalúa una fórmula calculada dado el formulaKey y los datos del formulario */
export function computeFormula(formulaKey: string, formData: Record<string, unknown>): number | null {
  const fn = formulaComputers[formulaKey]
  return fn ? fn(formData) : null
}

/** Opciones de categoría para plantillas con selector de producto */
export interface CategoryOption {
  value: string
  label: string
}

/** Obtiene el schema de formulario para una plantilla */
export function getTemplateSchema(
  templateKey: string,
  productOptions?: { cultivoPermanente?: CategoryOption[]; cultivoCicloCorto?: CategoryOption[]; pecesTipo?: CategoryOption[] },
): FormSchemaInput | null {
  const builder = schemaBuilders[templateKey]
  const schema = builder ? builder() : null
  if (!schema || !productOptions) return schema

  const opts =
    templateKey === 'cultivo-permanente'
      ? productOptions.cultivoPermanente
      : templateKey === 'cultivo-ciclo-corto'
        ? productOptions.cultivoCicloCorto
        : templateKey === 'peces-tilapia'
          ? productOptions.pecesTipo
          : undefined

  if (!opts?.length) return schema

  const merged = JSON.parse(JSON.stringify(schema)) as FormSchemaInput
  for (const section of merged.sections) {
    const field = section.fields?.find((f) => f.key === 'tipo_producto')
    if (field && field.type === 'select') {
      field.options = opts.map((o) => ({ value: o.value, label: o.label }))
    }
  }
  return merged
}

/** Indica si la plantilla tiene selector de producto (para mostrar en UI) */
export function templateHasProductSelect(templateKey: string): boolean {
  return ['cultivo-permanente', 'cultivo-ciclo-corto', 'peces-tilapia'].includes(templateKey)
}
