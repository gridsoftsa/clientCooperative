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
      { value: 'peces-tilapia', label: 'Peces (Tilapia)' },
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
          { key: 'precio_compra_animal', label: 'Precio de compra x animal', type: 'money', cols: 1 },
          {
            key: 'peso_kg_inicial',
            label: 'Peso en kg inicial',
            type: 'computed',
            meta: 'Solo lectura (precio compra / precio kg)',
            formulaKey: 'ganado_ceba_peso_inicial',
            cols: 1,
          },
          { key: 'peso_kg_final', label: 'Peso en kg final para la venta', type: 'number', meta: 'Decimal', cols: 1 },
          { key: 'precio_kg_animal', label: 'Precio del kg x animal', type: 'money', cols: 1 },
          { key: 'costo_por_kg', label: 'Costo por kg', type: 'money', cols: 1 },
        ],
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
          { key: 'cerdos_para_cria', label: 'Cerdos para la cría', type: 'number', meta: 'Int', cols: 1 },
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
        ],
      },
      {
        key: 'costos',
        title: 'Discriminación de costos',
        fields: [
          { key: 'lechon_destetado', label: 'Lechón destetado', type: 'money', cols: 1 },
          { key: 'alimentacion', label: 'Alimentación', type: 'money', cols: 1 },
          { key: 'medicamento_complementos_ceba', label: 'Medicamento y complementos', type: 'money', cols: 1 },
          { key: 'mano_obra_ceba', label: 'Mano de obra', type: 'money', cols: 1 },
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
    ],
  }
}

/** Plantilla: Aves Ponedoras (Huevos) */
function schemaAvesPonedoras(): FormSchemaInput {
  return {
    sections: [
      {
        key: 'produccion',
        title: 'Balance de producción',
        fields: [
          { key: 'cantidad_aves', label: 'Cantidad de aves', type: 'number', meta: 'Int', required: true, cols: 1 },
          {
            key: 'aves_en_produccion',
            label: 'Aves en producción',
            type: 'number',
            meta: 'Int',
            cols: 1,
          },
          {
            key: 'cubetas_diarias',
            label: 'N° de cubetas diarias',
            type: 'number',
            meta: 'Decimal',
            cols: 1,
          },
          {
            key: 'cubetas_mensuales',
            label: 'N° de cubetas mensuales',
            type: 'number',
            meta: 'Decimal',
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
        key: 'clasificacion',
        title: 'Clasificación de huevo y precios',
        fields: [
          {
            key: 'precio_cubeta_b',
            label: 'Precio cubeta clasificación B',
            type: 'money',
            cols: 1,
          },
          {
            key: 'precio_cubeta_a',
            label: 'Precio cubeta clasificación A',
            type: 'money',
            cols: 1,
          },
          {
            key: 'precio_cubeta_aa',
            label: 'Precio cubeta clasificación AA',
            type: 'money',
            cols: 1,
          },
          {
            key: 'precio_cubeta_extra',
            label: 'Precio cubeta clasificación Extra',
            type: 'money',
            cols: 1,
          },
        ],
      },
    ],
  }
}

/** Plantilla: Peces Tilapia */
function schemaPecesTilapia(): FormSchemaInput {
  return {
    sections: [
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
        key: 'costos',
        title: 'Discriminación de costos',
        fields: [
          { key: 'mano_obra_peces', label: 'Mano de obra', type: 'money', cols: 1 },
          { key: 'preparacion_estanque', label: 'Preparación estanque', type: 'money', cols: 1 },
          { key: 'compra_especies', label: 'Compra de especies', type: 'money', cols: 1 },
          { key: 'tratamientos', label: 'Tratamientos', type: 'money', cols: 1 },
          { key: 'sacrificio', label: 'Sacrificio', type: 'money', cols: 1 },
          { key: 'alimentacion_peces', label: 'Alimentación', type: 'money', cols: 1 },
        ],
      },
    ],
  }
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
            type: 'number',
            meta: 'Decimal (ej: 0.45)',
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
          { key: 'valor_total', label: 'Valor total', type: 'money', cols: 1 },
          {
            key: 'duracion_meses',
            label: 'Duración (meses)',
            type: 'number',
            meta: 'Int',
            cols: 1,
          },
        ],
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
          {
            key: 'pct_costos_kg',
            label: '% de costos x kg estándar',
            type: 'number',
            meta: 'Decimal (ej: 0.8)',
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
            type: 'number',
            meta: 'Decimal',
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
          { key: 'kg_x_ha', label: 'KG x hectárea', type: 'number', meta: 'Decimal', cols: 1 },
          { key: 'plantas_x_ha', label: 'Plantas x hectárea', type: 'number', meta: 'Int', cols: 1 },
          { key: 'cuantas_plantas', label: '¿Cuántas plantas?', type: 'number', meta: 'Int', cols: 1 },
        ],
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
  const cerdosParaCria = Number(data.cerdos_para_cria ?? 0)
  const precioDestetado = Number(data.precio_cerdo_destetado ?? 0)
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

/** Cerdos Cría: ventas = cerdos_para_cria × precio_cerdo_destetado */
function computeCerdosCriaVentas(data: Record<string, unknown>): number | null {
  const cerdos = Number(data.cerdos_para_cria ?? 0)
  const precio = Number(data.precio_cerdo_destetado ?? 0)
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
  cerdos_cria_ventas: computeCerdosCriaVentas,
  cerdos_cria_costos_resumen: computeCerdosCriaCostosResumen,
  cerdos_cria_total_utilidad: computeCerdosCriaTotalUtilidad,
  cerdos_cria_total_utilidad_mensual: computeCerdosCriaTotalUtilidadMensual,
}

/** Evalúa una fórmula calculada dado el formulaKey y los datos del formulario */
export function computeFormula(formulaKey: string, formData: Record<string, unknown>): number | null {
  const fn = formulaComputers[formulaKey]
  return fn ? fn(formData) : null
}

/** Obtiene el schema de formulario para una plantilla */
export function getTemplateSchema(templateKey: string): FormSchemaInput | null {
  const builder = schemaBuilders[templateKey]
  return builder ? builder() : null
}

/** Indica si la plantilla tiene selector de producto (para mostrar en UI) */
export function templateHasProductSelect(templateKey: string): boolean {
  return ['cultivo-permanente', 'cultivo-ciclo-corto'].includes(templateKey)
}
