/**
 * Plantillas de actividad financiera basadas en OFICIAL PLANTILLAS AGRO AREA CREDITO 2026.
 * Consolidadas por sector: Ganadería, Pecuaria, Cultivos Permanentes, Cultivos Ciclo Corto.
 */
import type { FormSchemaInput, FormSectionSchema } from '~/types/credits'

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

export const SERVICIOS_PRODUCTOS = [
  { value: 'moto-taxi', label: 'Moto Taxi' },
  { value: 'estilista', label: 'Estilista' },
  { value: 'mecanico', label: 'Mecánico' },
  { value: 'jornales', label: 'Jornales' },
  { value: 'taxi', label: 'Taxi' },
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
  {
    value: 'servicios',
    label: 'Servicios',
    templates: [
      {
        value: 'servicios',
        label: 'Servicios (Moto taxi / Estilista / Mecánico / Jornales / Taxi)',
      },
    ],
  },
  {
    value: 'transporte',
    label: 'Transporte',
    templates: [
      { value: 'transporte-carga', label: 'Transporte de Carga' },
      { value: 'transporte-pasajeros', label: 'Transporte de Pasajeros' },
    ],
  },
  {
    value: 'comercio',
    label: 'Comercio',
    templates: [
      { value: 'plantilla-comercial', label: 'Plantilla Comercial (Productos)' },
    ],
  },
  {
    value: 'radicacion',
    label: 'Radicación',
    templates: [
      { value: 'genero', label: 'Género' },
      { value: 'tipo-documento', label: 'Tipo de documento' },
      { value: 'tipo-vivienda', label: 'Tipo de vivienda' },
      { value: 'actividad-economica', label: 'Tipo de actividad económica' },
      { value: 'estado-civil', label: 'Estado civil' },
      { value: 'bancos', label: 'Bancos' },
    ],
  },
]

const SECTOR_RADICACION_KEY = 'radicacion'

/** Plantillas agrupadas bajo «Análisis y Score» en /parametrizacion/radicacion. */
const RADICACION_ANALISIS_SCORE_TEMPLATE_VALUES = new Set<string>(['bancos'])

/** Plantillas de actividad agro/transporte/… (parametrización /plantillas), sin el bloque de catálogos de radicación. */
export function sectorsForParametrizacionPlantillas(): SectorConfig[] {
  return sectorsConfig.filter(s => s.value !== SECTOR_RADICACION_KEY)
}

/**
 * Parametrización de radicación: dos bloques en el panel — solicitante y Análisis y Score (p. ej. bancos).
 */
export function sectorsForParametrizacionRadicacion(): SectorConfig[] {
  const r = sectorsConfig.find(s => s.value === SECTOR_RADICACION_KEY)
  if (!r) {
    return []
  }
  const solicitanteTemplates = r.templates.filter(
    t => !RADICACION_ANALISIS_SCORE_TEMPLATE_VALUES.has(t.value),
  )
  const analisisTemplates = r.templates.filter(
    t => RADICACION_ANALISIS_SCORE_TEMPLATE_VALUES.has(t.value),
  )
  return [
    { value: SECTOR_RADICACION_KEY, label: 'Solicitante', templates: solicitanteTemplates },
    { value: 'radicacion-analisis-score', label: 'Análisis y Score', templates: analisisTemplates },
  ]
}

/**
 * Ganancia mensual máxima de referencia (kg/mes) para la cantidad calculada en ganado ceba.
 * Si el cálculo la supera, se muestra alerta (tiempo de ceba insuficiente).
 */
export const GANADO_CEBA_MAX_GANANCIA_MENSUAL_KG = 16

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
            meta: `Solo lectura; referencia máx. ${GANADO_CEBA_MAX_GANANCIA_MENSUAL_KG} kg/mes`,
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
            key: 'numero_crias_con_sensibilizacion',
            label: 'Número de crías con % sensibilización',
            type: 'computed',
            meta: 'Solo lectura. Si número de crías ≥ 10: número × % sensibilización; si < 10: número de crías',
            formulaKey: 'ganado_doble_numero_crias_con_sensibilizacion',
            formulaFormat: 'number',
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
            meta: 'Solo lectura (configuración de plantilla)',
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
            meta: 'Solo lectura (número de crías con % sensibilización × valor unitario venta cría)',
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
            type: 'computed',
            meta: 'Solo lectura (vacas de cría × producción en litros)',
            formulaKey: 'ganado_doble_produccion_lt_ciclo',
            formulaFormat: 'number',
            cols: 1,
          },
          {
            key: 'ciclo_produccion_leche',
            label: 'Ciclo de producción leche (meses)',
            type: 'number',
            meta: 'Solo lectura (configuración de plantilla)',
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
            meta: 'Solo lectura (producción mensual LT × costo producción estándar %)',
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
            meta: 'Solo lectura (producción mensual LT - costo total)',
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
            meta: 'Solo lectura (configuración de plantilla)',
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
            meta: 'Solo lectura (configuración de plantilla)',
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
            meta: 'Solo lectura (configuración de plantilla)',
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
            meta: 'Solo lectura (configuración de plantilla)',
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
            meta: 'Solo lectura (ventas × % costo estándar)',
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
            meta: 'Solo lectura (configuración de plantilla)',
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
            meta: 'Solo lectura (configuración de plantilla)',
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
            meta: 'Solo lectura (plantilla por producto)',
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
        key: 'resumen_utilidad',
        title: 'Resumen de utilidad',
        fields: [
          {
            key: 'total_utilidad_cana_panela',
            label: 'TOTAL UTILIDAD',
            type: 'computed',
            meta: 'Solo lectura (ventas - costos)',
            formulaKey: 'cana_panela_total_utilidad',
            formulaFormat: 'money',
            cols: 1,
          },
          {
            key: 'total_utilidad_mensual_cana_panela',
            label: 'TOTAL UTILIDAD MENSUAL',
            type: 'computed',
            meta: 'Solo lectura (total utilidad ÷ duración meses)',
            formulaKey: 'cana_panela_total_utilidad_mensual',
            formulaFormat: 'money',
            cols: 1,
          },
          {
            key: 'ventas_cana_panela',
            label: 'VENTAS',
            type: 'computed',
            meta: 'Solo lectura (hectáreas × kg/ha × valor kg)',
            formulaKey: 'cana_panela_ventas',
            formulaFormat: 'money',
            cols: 1,
          },
          {
            key: 'costos_cana_panela',
            label: 'COSTOS',
            type: 'computed',
            meta: 'Solo lectura (ventas × % costos)',
            formulaKey: 'cana_panela_costos',
            formulaFormat: 'money',
            cols: 1,
          },
        ],
      },
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
            key: 'cantidad_personas',
            label: 'Cantidad de personas',
            type: 'number',
            meta: 'Número de personas en la sociedad',
            cols: 1,
            visibleWhen: { fieldKey: 'cultivo_en_sociedad', value: 'si' },
          },
          {
            key: 'pct_sociedad',
            label: '% sociedad',
            type: 'computed',
            meta: '100% ÷ cantidad de personas',
            formulaKey: 'cana_panela_pct_sociedad',
            formulaFormat: 'percent',
            cols: 1,
            visibleWhen: { fieldKey: 'cultivo_en_sociedad', value: 'si' },
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
            meta: 'Solo lectura (plantilla)',
            cols: 1,
          },
          {
            key: 'cant_kg_hectarea',
            label: 'Cant. kg x hectárea',
            type: 'number',
            meta: 'Solo lectura (plantilla)',
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

/** Plantilla: Servicios (Moto taxi, Estilista, Mecánico, Jornales, Taxi) */
function schemaServicios(): FormSchemaInput {
  return {
    sections: [
      {
        key: 'tipo_producto',
        title: 'Tipo de servicio',
        fields: [
          {
            key: 'tipo_producto',
            label: 'Servicio',
            type: 'select',
            meta: 'Seleccione el tipo de servicio',
            required: true,
            cols: 1,
          },
        ],
      },
      {
        key: 'ingresos_servicio',
        title: 'Ingresos por Servicio',
        layout: 'serviciosIngresosTable',
        fields: [],
        serviciosTableRows: [
          { suffix: 'bueno', label: 'Día bueno' },
          { suffix: 'regular', label: 'Día regular' },
          { suffix: 'malo', label: 'Día malo' },
        ],
      },
      {
        key: 'totales',
        title: 'Totales',
        fields: [
          {
            key: 'total_semana',
            label: 'Total semana',
            type: 'computed',
            meta: 'Solo lectura (suma de la tabla)',
            formulaKey: 'servicios_total_semana',
            formulaFormat: 'money',
            cols: 1,
          },
          {
            key: 'semanas_mes',
            label: 'Semanas al mes',
            type: 'computed',
            meta: 'Solo lectura: 4.75 si total días=7, 4 si total días<7',
            formulaKey: 'servicios_semanas_mes',
            formulaFormat: 'number',
            cols: 1,
          },
          {
            key: 'total_mes',
            label: 'Total mes',
            type: 'computed',
            meta: 'Solo lectura (total semana × semanas mes)',
            formulaKey: 'servicios_total_mes',
            formulaFormat: 'money',
            cols: 1,
          },
        ],
      },
      {
        key: 'costos_negocio',
        title: 'Costos del Negocio',
        fields: [
          { key: 'empleados', label: 'Empleados', type: 'money', cols: 1 },
          { key: 'arriendo', label: 'Arriendo', type: 'money', cols: 1 },
          { key: 'servicios', label: 'Servicios', type: 'money', cols: 1 },
          { key: 'otros_costos', label: 'Otros', type: 'money', cols: 1 },
          { key: 'pct_contribucion', label: '% Contribución', type: 'number', meta: 'Solo lectura (plantilla)', cols: 1 },
          {
            key: 'total_costos',
            label: 'Total costos',
            type: 'computed',
            meta: 'Solo lectura (suma de costos)',
            formulaKey: 'servicios_total_costos',
            formulaFormat: 'money',
            cols: 1,
          },
          {
            key: 'valor_contribucion',
            label: 'Valor contribución',
            type: 'computed',
            meta: 'Solo lectura (total mes × % contribución)',
            formulaKey: 'servicios_valor_contribucion',
            formulaFormat: 'money',
            cols: 1,
          },
        ],
      },
      {
        key: 'resultado',
        title: 'Resultado',
        fields: [
          {
            key: 'ingresos_netos',
            label: 'Ingresos netos',
            type: 'computed',
            meta: 'Solo lectura (total mes - costos)',
            formulaKey: 'servicios_ingresos_netos',
            formulaFormat: 'money',
            cols: 1,
          },
        ],
      },
    ],
  }
}

/** Plantilla: Plantilla Comercial (Productos) */
function schemaPlantillaComercial(): FormSchemaInput {
  return {
    sections: [
      {
        key: 'productos',
        title: 'Productos',
        layout: 'productosTable' as FormSectionSchema['layout'],
        fields: [],
      },
      {
        key: 'semanas_dias',
        title: 'Semanas y Días',
        layout: 'semanasDiasTable' as FormSectionSchema['layout'],
        fields: [],
      },
      {
        key: 'ingresos_gastos',
        title: 'Ingresos y Gastos Operacionales',
        layout: 'ingresosGastosOperacionalesTable' as FormSectionSchema['layout'],
        fields: [],
      },
    ],
  }
}

/** Plantilla: Transporte de Carga */
function schemaTransporteCarga(): FormSchemaInput {
  return {
    sections: [
      {
        key: 'viajes',
        title: 'Viajes',
        fields: [
          {
            key: 'viajes_redondos',
            label: '¿Los viajes son redondos?',
            type: 'select',
            options: [
              { value: 'si', label: 'Sí' },
              { value: 'no', label: 'No' },
            ],
            cols: 1,
          },
          { key: 'cantidad_viajes_semana', label: 'Cantidad de viajes por semana', type: 'number', meta: 'Int', cols: 1 },
          { key: 'carga_ida', label: '¿Qué transporta? Ida', type: 'text', meta: 'Ej: Arena', cols: 1 },
          { key: 'carga_vuelta', label: '¿Qué transporta? Vuelta', type: 'text', meta: 'Ej: Cemento', cols: 1 },
        ],
      },
      {
        key: 'flete',
        title: 'Flete',
        fields: [
          { key: 'valor_flete_ida', label: 'Valor flete IDA', type: 'money', cols: 1 },
          { key: 'valor_flete_vuelta', label: 'Valor flete VUELTA', type: 'money', cols: 1 },
          { key: 'total_viaje', label: 'Total viaje', type: 'computed', meta: 'Calculado', formulaKey: 'transporte_carga_total_viaje', formulaFormat: 'money', cols: 1 },
          { key: 'ingreso_total_mes', label: 'Ingreso total en el mes', type: 'computed', meta: 'Calculado', formulaKey: 'transporte_carga_ingreso_total_mes', formulaFormat: 'money', cols: 1 },
        ],
      },
      {
        key: 'gastos',
        title: 'Gastos por Viaje',
        layout: 'transporteCargaGastosTable',
        gastosTableRows: [
          { key: 'combustible', label: 'COMBUSTIBLE' },
          { key: 'peajes', label: 'PEAJES' },
          { key: 'conductor', label: '% CONDUCTOR' },
          { key: 'lavado_parqueadero', label: 'LAVADO Y PARQUEDAERO' },
          { key: 'cargue_descargue', label: 'CARGUE Y DESCARGUE' },
          { key: 'otros', label: 'OTROS' },
        ],
        fields: [
          { key: 'total_gastos_mensuales', label: 'Total gastos mensuales', type: 'computed', meta: 'Calculado', formulaKey: 'transporte_carga_total_gastos_mensuales', formulaFormat: 'money', cols: 1 },
          { key: 'ingresos_netos_mes', label: 'Ingresos mensuales netos', type: 'computed', meta: 'Calculado', formulaKey: 'transporte_carga_ingresos_netos_mes', formulaFormat: 'money', cols: 1 },
        ],
      },
    ],
  }
}

/** Plantilla: Transporte de Pasajeros */
function schemaTransportePasajeros(): FormSchemaInput {
  return {
    sections: [
      {
        key: 'operacion',
        title: 'Operación',
        fields: [
          { key: 'viajes_semana', label: 'Viajes por semana', type: 'number', meta: 'Int', cols: 1 },
          { key: 'capacidad_buseta', label: 'Capacidad de la buseta (personas)', type: 'number', meta: 'Int', cols: 1 },
          { key: 'ruta_ida', label: 'Ruta IDA (municipio origen)', type: 'municipality', cols: 1 },
          { key: 'ruta_vuelta', label: 'Ruta VUELTA (municipio destino)', type: 'municipality', cols: 1 },
        ],
      },
      {
        key: 'pasajes',
        title: 'Pasajes',
        layout: 'transportePasajerosPasajesTable',
        pasajesTableRows: [
          { key: 'valor_pasaje_ida', label: 'VALOR PASAJE RUTA IDA', type: 'money' },
          { key: 'valor_pasaje_vuelta', label: 'VALOR PASAJE RUTA VUELTA', type: 'money' },
          { key: 'pct_ocupacion', label: '% OCUPACIÓN (AJUSTE)', type: 'number' },
          { key: 'total_viaje_ida', label: 'TOTAL VIAJE IDA', type: 'computed', formulaKey: 'transporte_pasajeros_total_viaje_ida' },
          { key: 'total_viaje_vuelta', label: 'TOTAL VIAJE VUELTA', type: 'computed', formulaKey: 'transporte_pasajeros_total_viaje_vuelta' },
          { key: 'ingreso_total_mes', label: 'INGRESO TOTAL EN EL MES', type: 'computed', formulaKey: 'transporte_pasajeros_ingreso_total_mes' },
        ],
        fields: [],
      },
      {
        key: 'descripcion',
        title: 'Descripción',
        fields: [
          { key: 'descripcion_adicional', label: 'Descripción adicional', type: 'textarea', meta: 'Información complementaria que el posible deudor desee agregar', cols: 2 },
        ],
      },
      {
        key: 'gastos',
        title: 'Gastos',
        layout: 'transportePasajerosGastosTable',
        fields: [
          { key: 'total_gastos_mensuales', label: 'Total gastos mensuales', type: 'computed', meta: 'Calculado', formulaKey: 'transporte_pasajeros_total_gastos_mensuales', formulaFormat: 'money', cols: 1 },
          { key: 'ingresos_netos_mes', label: 'Ingresos mensuales netos', type: 'computed', meta: 'Calculado', formulaKey: 'transporte_pasajeros_ingresos_netos_mes', formulaFormat: 'money', cols: 1 },
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
  'servicios': schemaServicios,
  'plantilla-comercial': schemaPlantillaComercial,
  'transporte-carga': schemaTransporteCarga,
  'transporte-pasajeros': schemaTransportePasajeros,
}

/** Fórmula Ganado Ceba: peso_kg_inicial = precio_compra_animal / precio_kg_animal */
function computeGanadoCebaPesoInicial(data: Record<string, unknown>): number | null {
  const precio = Number(data.precio_compra_animal ?? 0)
  const precioKg = Number(data.precio_kg_animal ?? 0)
  if (!precioKg) return null
  const valor = precio / precioKg
  return Number.isFinite(valor) ? valor : null
}

/** Fórmula Ganado Ceba: -(((precio_compra_animal / precio_kg_animal) - peso_kg_final) / tiempo_meses_ceba) */
function computeGanadoCebaCantidad(data: Record<string, unknown>): number | null {
  const pesoInicial = computeGanadoCebaPesoInicial(data)
  const pesoFinal = Number(data.peso_kg_final ?? 0)
  const meses = Number(data.tiempo_meses_ceba ?? 0)
  if (!meses || pesoInicial == null) return null
  const valor = -((pesoInicial - pesoFinal) / meses)
  return Number.isFinite(valor) ? valor : null
}

/** True si la ganancia mensual (kg/mes) supera {@link GANADO_CEBA_MAX_GANANCIA_MENSUAL_KG}. */
export function isGanadoCebaGananciaMensualSobreMaximo(data: Record<string, unknown>): boolean {
  const v = computeGanadoCebaCantidad(data)
  return v != null && v > GANADO_CEBA_MAX_GANANCIA_MENSUAL_KG
}

/** True si el número de crías supera el de vacas de cría (ganado doble propósito). */
export function isGanadoDobleCriasSuperaVacasCria(data: Record<string, unknown>): boolean {
  const rawCrias = data.numero_crias
  const rawVacas = data.vacas_cria
  if (rawCrias === undefined || rawCrias === null || rawCrias === ''
    || rawVacas === undefined || rawVacas === null || rawVacas === '') {
    return false
  }
  const nCrias = Number(rawCrias)
  const nVacas = Number(rawVacas)
  if (!Number.isFinite(nCrias) || !Number.isFinite(nVacas)) {
    return false
  }
  return nCrias > nVacas
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

/**
 * Fórmula Ganado Doble Propósito: número de crías con % sensibilización.
 * IFS(numero_crias >= 10 → numero_crias × porcentaje_sensibilizacion/100; numero_crias < 10 → numero_crias)
 * porcentaje_sensibilizacion es parametrizable en configuración (default 90%).
 */
function computeGanadoDobleNumeroCriasConSensibilizacion(data: Record<string, unknown>): number | null {
  const numeroCrias = Number(data.numero_crias ?? 0)
  const pctSensibilizacion = Number(data.porcentaje_sensibilizacion ?? 90)
  if (numeroCrias >= 10) {
    const valor = numeroCrias * (pctSensibilizacion / 100)
    return Number.isFinite(valor) ? valor : null
  }
  return numeroCrias
}

/** Fórmula Ganado Doble Propósito: valor_total_crias = numero_crias_con_sensibilizacion × valor_unitario_venta_cria */
function computeGanadoDobleValorTotalCrias(data: Record<string, unknown>): number | null {
  const numeroCriasEfectivo = computeGanadoDobleNumeroCriasConSensibilizacion(data)
  const valorUnitario = Number(data.valor_unitario_venta_cria ?? 0)
  if (numeroCriasEfectivo == null) return null
  const valor = numeroCriasEfectivo * valorUnitario
  return Number.isFinite(valor) ? valor : null
}

/** Fórmula Ganado Doble Propósito: produccion_lt_ciclo = vacas_cria × produccion_litros_vaca */
function computeGanadoDobleProduccionLtCiclo(data: Record<string, unknown>): number | null {
  const vacasCria = Number(data.vacas_cria ?? 0)
  const produccionLitros = Number(data.produccion_litros_vaca ?? 0)
  const valor = vacasCria * produccionLitros
  return Number.isFinite(valor) ? valor : null
}

/** Fórmula Ganado Doble Propósito: valor_total_produccion_leche = produccion_lt_ciclo × precio_lt_leche */
function computeGanadoDobleValorTotalProduccionLeche(data: Record<string, unknown>): number | null {
  const produccionLt = computeGanadoDobleProduccionLtCiclo(data) ?? 0
  const precioLt = Number(data.precio_lt_leche ?? 0)
  const valor = produccionLt * precioLt
  return Number.isFinite(valor) ? valor : null
}

/** Fórmula Ganado Doble Propósito: utilidad_mensual leche = produccion_mensual_lt - costo_total */
function computeGanadoDobleUtilidadMensualLeche(data: Record<string, unknown>): number | null {
  const produccionMensualLt = computeGanadoDobleProduccionMensualLt(data)
  const costoTotal = computeGanadoDobleCostoTotalLeche(data)
  if (produccionMensualLt == null || costoTotal == null) return null
  const valor = produccionMensualLt - costoTotal
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

/** Fórmula: costo_total = produccion_mensual_lt × (costo_produccion_estandar% / 100) */
function computeGanadoDobleCostoTotalLeche(data: Record<string, unknown>): number | null {
  const produccionMensualLt = computeGanadoDobleProduccionMensualLt(data)
  const pctEstandar = Number(data.pct_costo_produccion_estandar ?? 0)
  if (produccionMensualLt == null || !pctEstandar) return null
  const valor = produccionMensualLt * (pctEstandar / 100)
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

/** Pollos Engorde: costos = ventas × pct_costos_estandar (pct: 0.7 o 70) */
function computePollosEngordeCostos(data: Record<string, unknown>): number | null {
  const ventas = computePollosEngordeVentas(data)
  let pct = Number(data.pct_costos_estandar ?? 0)
  if (ventas == null) return null
  if (pct > 1) pct = pct / 100
  const valor = ventas * pct
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

/** Caña Panela: ventas = hectáreas × kg/hectárea × valor_unitario_kg */
function computeCanaPanelaVentas(data: Record<string, unknown>): number | null {
  const hectareas = Number(data.cantidad_hectareas ?? 0)
  const kgHa = Number(data.cant_kg_hectarea ?? 0)
  const precio = Number(data.valor_unitario_kg ?? 0)
  const valor = hectareas * kgHa * precio
  return Number.isFinite(valor) ? valor : null
}

/** Caña Panela: costos = ventas × (pct_costos / 100) */
function computeCanaPanelaCostos(data: Record<string, unknown>): number | null {
  const ventas = computeCanaPanelaVentas(data)
  let pct = Number(data.pct_costos ?? 0)
  if (pct > 0 && pct <= 1) pct = pct * 100
  if (ventas == null) return null
  const valor = ventas * (pct / 100)
  return Number.isFinite(valor) ? valor : null
}

/** Caña Panela: total_utilidad = ventas - costos */
function computeCanaPanelaTotalUtilidad(data: Record<string, unknown>): number | null {
  const ventas = computeCanaPanelaVentas(data)
  const costos = computeCanaPanelaCostos(data)
  if (ventas == null || costos == null) return null
  const valor = ventas - costos
  return Number.isFinite(valor) ? valor : null
}

/** Caña Panela: utilidad_mensual = (total_utilidad / duracion_ciclo_meses) × % sociedad (100% si no es en sociedad) */
function computeCanaPanelaTotalUtilidadMensual(data: Record<string, unknown>): number | null {
  const totalUtilidad = computeCanaPanelaTotalUtilidad(data)
  const meses = Number(data.duracion_ciclo_meses ?? 0)
  if (totalUtilidad == null || !meses) return null
  const baseMensual = totalUtilidad / meses
  const pctSociedad = computeCanaPanelaPctSociedad(data)
  const factor = pctSociedad != null ? pctSociedad / 100 : 1
  const valor = baseMensual * factor
  return Number.isFinite(valor) ? valor : null
}

/** Servicios: suma de cantidades por tipo de día (bueno + regular + malo) */
function computeServiciosSumaCantidadDias(data: Record<string, unknown>): number {
  let sum = 0
  for (const suffix of ['bueno', 'regular', 'malo']) {
    const cantidad = Number(data[`dia_${suffix}_cantidad`] ?? 0)
    if (Number.isFinite(cantidad)) {
      sum += cantidad
    }
  }
  return sum
}

/** Servicios: semanas_mes = IFS(suma_cantidad=7 → config, suma_cantidad<7 → config). Configurable en plantilla. */
function computeServiciosSemanasMes(data: Record<string, unknown>): number | null {
  const suma = computeServiciosSumaCantidadDias(data)
  const completa = Number(data.semanas_mes_completa_default ?? data.semanas_mes_default ?? 4.75)
  const parcial = Number(data.semanas_mes_parcial_default ?? 4)
  if (suma === 7) {
    return Number.isFinite(completa) ? completa : 4.75
  }
  if (suma < 7) {
    return Number.isFinite(parcial) ? parcial : 4
  }
  return Number.isFinite(completa) ? completa : 4.75
}

/** Servicios: total_semana = suma (dia_X_valor × dia_X_cantidad) para bueno, regular, malo */
function computeServiciosTotalSemana(data: Record<string, unknown>): number | null {
  let sum = 0
  for (const suffix of ['bueno', 'regular', 'malo']) {
    const valor = Number(data[`dia_${suffix}_valor`] ?? 0)
    const cantidad = Number(data[`dia_${suffix}_cantidad`] ?? 0)
    if (Number.isFinite(valor) && Number.isFinite(cantidad)) {
      sum += valor * cantidad
    }
  }
  return Number.isFinite(sum) ? sum : null
}

/** Servicios: total_mes = total_semana × semanas_mes */
function computeServiciosTotalMes(data: Record<string, unknown>): number | null {
  const totalSemana = computeServiciosTotalSemana(data)
  const semanasMes = computeServiciosSemanasMes(data)
  if (totalSemana == null || semanasMes == null) return null
  const valor = totalSemana * semanasMes
  return Number.isFinite(valor) ? valor : null
}

/** Servicios: valor_contribucion = total_mes × (% contribución / 100) */
function computeServiciosValorContribucion(data: Record<string, unknown>): number | null {
  const totalMes = computeServiciosTotalMes(data) ?? Number(data.total_mes ?? 0)
  if (totalMes == null || !Number.isFinite(totalMes)) return null
  let pct = Number(data.pct_contribucion ?? data.pct_contribucion_estandar ?? 0)
  if (Number.isFinite(pct) && pct > 1) {
    pct = pct / 100
  }
  const valor = totalMes * pct
  return Number.isFinite(valor) ? valor : null
}

/** Servicios: total_costos = empleados + arriendo + servicios + otros_costos + valor_contribucion */
function computeServiciosTotalCostos(data: Record<string, unknown>): number | null {
  const empleados = Number(data.empleados ?? 0)
  const arriendo = Number(data.arriendo ?? 0)
  const servicios = Number(data.servicios ?? 0)
  const otros = Number(data.otros_costos ?? 0)
  const valorContribucion = computeServiciosValorContribucion(data) ?? 0
  const valor = empleados + arriendo + servicios + otros + valorContribucion
  return Number.isFinite(valor) ? valor : null
}

/** Servicios: ingresos_netos = total_mes - total_costos */
function computeServiciosIngresosNetos(data: Record<string, unknown>): number | null {
  const totalMes = computeServiciosTotalMes(data) ?? Number(data.total_mes ?? 0)
  const totalCostos = computeServiciosTotalCostos(data) ?? 0
  const valor = totalMes - totalCostos
  return Number.isFinite(valor) ? valor : null
}

/** Transporte Carga: total_viaje = valor_flete_ida + valor_flete_vuelta */
function computeTransporteCargaTotalViaje(data: Record<string, unknown>): number | null {
  const ida = Number(data.valor_flete_ida ?? 0)
  const vuelta = Number(data.valor_flete_vuelta ?? 0)
  if (!Number.isFinite(ida) && !Number.isFinite(vuelta)) return null
  const valor = (Number.isFinite(ida) ? ida : 0) + (Number.isFinite(vuelta) ? vuelta : 0)
  return Number.isFinite(valor) ? valor : null
}

/** Transporte Carga: ingreso_total_mes = total_viaje × cantidad_viajes_semana × semanas_mes (configurable) */
function computeTransporteCargaIngresoTotalMes(data: Record<string, unknown>): number | null {
  const totalViaje = computeTransporteCargaTotalViaje(data) ?? 0
  const viajesSemana = Number(data.cantidad_viajes_semana ?? 0)
  const semanasMes = Number(data.semanas_mes_default ?? 4.33)
  if (!Number.isFinite(totalViaje) || !Number.isFinite(viajesSemana)) return null
  const valor = totalViaje * viajesSemana * (Number.isFinite(semanasMes) ? semanasMes : 4.33)
  return Number.isFinite(valor) ? valor : null
}

/** Transporte Carga: total_gastos_viaje = combustible + peajes + conductor + lavado_parqueadero + cargue_descargue + otros */
function computeTransporteCargaTotalGastosViaje(data: Record<string, unknown>): number | null {
  const keys = ['combustible', 'peajes', 'conductor', 'lavado_parqueadero', 'cargue_descargue', 'otros']
  let sum = 0
  for (const k of keys) {
    const v = Number(data[k] ?? 0)
    if (Number.isFinite(v)) sum += v
  }
  return Number.isFinite(sum) ? sum : null
}

/** Transporte Carga: total_otros_gastos_anuales = seguro_soat + tecnomecanica + llantas_anual + repuestos + (cambios_aceite × precio) + bajadas_rueda */
function computeTransporteCargaTotalOtrosGastosAnuales(data: Record<string, unknown>): number | null {
  let sum = 0
  for (const k of ['seguro_soat', 'tecnomecanica', 'llantas_anual', 'repuestos', 'bajadas_rueda_anual']) {
    const v = Number(data[k] ?? 0)
    if (Number.isFinite(v)) sum += v
  }
  const cambios = Number(data.cambios_aceite_cantidad ?? 0)
  const precio = Number(data.precio_cambio_aceite ?? 0)
  if (Number.isFinite(cambios) && Number.isFinite(precio)) {
    sum += cambios * precio
  }
  return Number.isFinite(sum) ? sum : null
}

/** Transporte Carga: total_gastos_mensuales = (total_gastos_viaje × viajes_semana × semanas_mes) + (otros_anuales/12). Semanas configurable. */
function computeTransporteCargaTotalGastosMensuales(data: Record<string, unknown>): number | null {
  const totalGastosViaje = computeTransporteCargaTotalGastosViaje(data) ?? 0
  const viajesSemana = Number(data.cantidad_viajes_semana ?? 0)
  const semanasMes = Number(data.semanas_mes_default ?? 4.33)
  const otrosGastosAnuales = computeTransporteCargaTotalOtrosGastosAnuales(data) ?? 0
  const sm = Number.isFinite(semanasMes) ? semanasMes : 4.33
  const valor = (totalGastosViaje * viajesSemana * sm) + (otrosGastosAnuales / 12)
  return Number.isFinite(valor) ? valor : null
}

/** Transporte Pasajeros: total_viaje_ida = (valor_pasaje_ida × capacidad_buseta) × (pct_ocupacion / 100) */
function computeTransportePasajerosTotalViajeIda(data: Record<string, unknown>): number | null {
  const valorPasaje = Number(data.valor_pasaje_ida ?? 0)
  const capacidad = Number(data.capacidad_buseta ?? 0)
  const pct = Number(data.pct_ocupacion ?? 0)
  if (!Number.isFinite(valorPasaje) || !Number.isFinite(capacidad) || !Number.isFinite(pct)) return null
  const valor = (valorPasaje * capacidad) * (pct / 100)
  return Number.isFinite(valor) ? valor : null
}

/** Transporte Pasajeros: total_viaje_vuelta = (valor_pasaje_vuelta × capacidad_buseta) × (pct_ocupacion / 100) */
function computeTransportePasajerosTotalViajeVuelta(data: Record<string, unknown>): number | null {
  const valorPasaje = Number(data.valor_pasaje_vuelta ?? 0)
  const capacidad = Number(data.capacidad_buseta ?? 0)
  const pct = Number(data.pct_ocupacion ?? 0)
  if (!Number.isFinite(valorPasaje) || !Number.isFinite(capacidad) || !Number.isFinite(pct)) return null
  const valor = (valorPasaje * capacidad) * (pct / 100)
  return Number.isFinite(valor) ? valor : null
}

/** Transporte Pasajeros: ingreso_total_mes = (total_viaje_vuelta + total_viaje_ida) × viajes_semana × semanas_mes. Configurable. */
function computeTransportePasajerosIngresoTotalMes(data: Record<string, unknown>): number | null {
  const totalIda = computeTransportePasajerosTotalViajeIda(data) ?? 0
  const totalVuelta = computeTransportePasajerosTotalViajeVuelta(data) ?? 0
  const viajesSemana = Number(data.viajes_semana ?? 0)
  const semanasMes = Number(data.semanas_mes_default ?? 4.33)
  if (!Number.isFinite(viajesSemana)) return null
  const sm = Number.isFinite(semanasMes) ? semanasMes : 4.33
  const valor = (totalVuelta + totalIda) * viajesSemana * sm
  return Number.isFinite(valor) ? valor : null
}

/** Transporte Pasajeros: total_gasto_viaje_por_mes = (total_ida_vuelta × viajes × semanas_mes) + %conductor. Semanas configurable. */
function computeTransportePasajerosTotalGastosMensuales(data: Record<string, unknown>): number | null {
  const totalIda = (Number(data.combustible_ida ?? 0) + Number(data.peajes_ida ?? 0) + Number(data.otros_ida ?? 0))
  const totalVuelta = (Number(data.combustible_vuelta ?? 0) + Number(data.peajes_vuelta ?? 0) + Number(data.otros_vuelta ?? 0))
  const totalIdaVuelta = (Number.isFinite(totalIda) ? totalIda : 0) + (Number.isFinite(totalVuelta) ? totalVuelta : 0)
  const conductor = Number(data.conductor_vuelta ?? 0)
  const viajesSemana = Number(data.viajes_semana ?? 0)
  const semanasMes = Number(data.semanas_mes_default ?? 4.33)
  const sm = Number.isFinite(semanasMes) ? semanasMes : 4.33
  const gastosViajeMensual = (totalIdaVuelta * viajesSemana * sm) + (Number.isFinite(conductor) ? conductor : 0)
  const anuales = (Number(data.seguro_soat ?? 0) + Number(data.tecnomecanica ?? 0) + Number(data.llantas_anual ?? 0)
    + Number(data.repuestos ?? 0) + Number(data.bajadas_rueda_anual ?? 0) + Number(data.seguro_todo_riesgos ?? 0))
  const cambiosAceite = Number(data.cambios_aceite_cantidad ?? 0) * Number(data.precio_cambio_aceite ?? 0)
  const anualesConAceite = anuales + (Number.isFinite(cambiosAceite) ? cambiosAceite : 0)
  const rodamiento = Number(data.rodamiento_mensual ?? 0)
  const valor = (anualesConAceite / 12) + (Number.isFinite(rodamiento) ? rodamiento : 0) + gastosViajeMensual
  return Number.isFinite(valor) ? valor : null
}

/** Transporte Pasajeros: ingresos_netos_mes = ingreso_total_mes - total_gastos_mensuales */
function computeTransportePasajerosIngresosNetosMes(data: Record<string, unknown>): number | null {
  const ingresoTotal = computeTransportePasajerosIngresoTotalMes(data) ?? 0
  const totalGastosMensuales = computeTransportePasajerosTotalGastosMensuales(data) ?? 0
  if (!Number.isFinite(ingresoTotal)) return null
  const valor = ingresoTotal - totalGastosMensuales
  return Number.isFinite(valor) ? valor : null
}

/** Plantilla comercial: total_gastos_negocio = arriendo + gastos_servicios + gastos_imprevistos + gastos_empleados */
function computePlantillaComercialTotalGastosNegocio(data: Record<string, unknown>): number | null {
  const a = Number(data.arriendo ?? 0) || 0
  const s = Number(data.gastos_servicios ?? 0) || 0
  const i = Number(data.gastos_imprevistos ?? 0) || 0
  const e = Number(data.gastos_empleados ?? 0) || 0
  const valor = a + s + i + e
  return Number.isFinite(valor) ? valor : null
}

/** Plantilla comercial: total_ingresos_netos_negocio = ingresos_operacionales - total_gastos_negocio */
function computePlantillaComercialTotalIngresosNetosNegocio(data: Record<string, unknown>): number | null {
  const ing = Number(data.ingresos_operacionales ?? 0) || 0
  const gast = computePlantillaComercialTotalGastosNegocio(data) ?? 0
  const valor = ing - gast
  return Number.isFinite(valor) ? valor : null
}

/** Transporte Carga: ingresos_netos_mes = ingreso_total_mes - total_gastos_mensuales */
function computeTransporteCargaIngresosNetosMes(data: Record<string, unknown>): number | null {
  const ingresoTotal = computeTransporteCargaIngresoTotalMes(data) ?? 0
  const totalGastosMensuales = computeTransporteCargaTotalGastosMensuales(data) ?? 0
  if (!Number.isFinite(ingresoTotal)) return null
  const valor = ingresoTotal - totalGastosMensuales
  return Number.isFinite(valor) ? valor : null
}

/** Caña Panela: pct_sociedad = 100% ÷ cantidad_personas (solo cuando cultivo_en_sociedad = 'si') */
function computeCanaPanelaPctSociedad(data: Record<string, unknown>): number | null {
  if (data.cultivo_en_sociedad !== 'si') return null
  const cantidad = Number(data.cantidad_personas ?? 0)
  if (!cantidad || cantidad <= 0) return null
  const valor = 100 / cantidad
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
  ganado_doble_numero_crias_con_sensibilizacion: computeGanadoDobleNumeroCriasConSensibilizacion,
  ganado_doble_valor_total_crias: computeGanadoDobleValorTotalCrias,
  ganado_doble_produccion_lt_ciclo: computeGanadoDobleProduccionLtCiclo,
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
  cana_panela_ventas: computeCanaPanelaVentas,
  cana_panela_costos: computeCanaPanelaCostos,
  cana_panela_total_utilidad: computeCanaPanelaTotalUtilidad,
  cana_panela_total_utilidad_mensual: computeCanaPanelaTotalUtilidadMensual,
  cana_panela_pct_sociedad: computeCanaPanelaPctSociedad,
  servicios_semanas_mes: computeServiciosSemanasMes,
  servicios_total_semana: computeServiciosTotalSemana,
  servicios_total_mes: computeServiciosTotalMes,
  servicios_total_costos: computeServiciosTotalCostos,
  servicios_valor_contribucion: computeServiciosValorContribucion,
  servicios_ingresos_netos: computeServiciosIngresosNetos,
  transporte_carga_total_viaje: computeTransporteCargaTotalViaje,
  transporte_carga_ingreso_total_mes: computeTransporteCargaIngresoTotalMes,
  transporte_carga_total_gastos_viaje: computeTransporteCargaTotalGastosViaje,
  transporte_carga_total_otros_gastos_anuales: computeTransporteCargaTotalOtrosGastosAnuales,
  transporte_carga_total_gastos_mensuales: computeTransporteCargaTotalGastosMensuales,
  transporte_carga_ingresos_netos_mes: computeTransporteCargaIngresosNetosMes,
  transporte_pasajeros_total_viaje_ida: computeTransportePasajerosTotalViajeIda,
  transporte_pasajeros_total_viaje_vuelta: computeTransportePasajerosTotalViajeVuelta,
  transporte_pasajeros_ingreso_total_mes: computeTransportePasajerosIngresoTotalMes,
  transporte_pasajeros_total_gastos_mensuales: computeTransportePasajerosTotalGastosMensuales,
  transporte_pasajeros_ingresos_netos_mes: computeTransportePasajerosIngresosNetosMes,
  plantilla_comercial_total_gastos_negocio: computePlantillaComercialTotalGastosNegocio,
  plantilla_comercial_total_ingresos_netos_negocio: computePlantillaComercialTotalIngresosNetosNegocio,
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
  productOptions?: { cultivoPermanente?: CategoryOption[]; cultivoCicloCorto?: CategoryOption[]; pecesTipo?: CategoryOption[]; serviciosTipo?: CategoryOption[] },
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
          : templateKey === 'servicios'
            ? productOptions.serviciosTipo
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
  return ['cultivo-permanente', 'cultivo-ciclo-corto', 'peces-tilapia', 'servicios'].includes(templateKey)
}

export interface ValidateTemplateResult {
  valid: boolean
  errors: string[]
}

/** Valida que una plantilla tenga los campos obligatorios completos según su schema. */
export function validateActivityTemplate(
  item: { sector?: string; template?: string; product?: string | null; data?: Record<string, unknown> },
): ValidateTemplateResult {
  const errors: string[] = []

  if (!item?.sector?.trim()) {
    errors.push('Selecciona el sector')
  }
  if (!item?.template?.trim()) {
    errors.push('Selecciona la plantilla')
  }

  if (!item?.sector || !item?.template) {
    return { valid: false, errors }
  }

  const schema = getTemplateSchema(item.template, {
    cultivoPermanente: [],
    cultivoCicloCorto: [],
    pecesTipo: [],
    serviciosTipo: [],
  })

  if (!schema?.sections) {
    return { valid: true, errors: [] }
  }

  const data = item.data ?? {}

  for (const section of schema.sections) {
    const fields = section.fields
    if (!fields?.length) continue

    for (const field of fields) {
      if (field.type === 'computed' || !field.required) continue

      const val = data[field.key]
      const isEmpty =
        val === undefined ||
        val === null ||
        val === '' ||
        (typeof val === 'number' && Number.isNaN(val))

      if (isEmpty) {
        errors.push(`${field.label} es obligatorio`)
      }
    }
  }

  if (item.template === 'ganado-ceba' && isGanadoCebaGananciaMensualSobreMaximo(data)) {
    errors.push(
      `La ganancia mensual calculada supera ${GANADO_CEBA_MAX_GANANCIA_MENSUAL_KG} kg/mes (tiempo de ceba muy corto). Ajuste el tiempo en meses de ceba o los datos hasta que la cantidad calculada esté en rango`,
    )
  }

  if (item.template === 'ganado-doble-proposito' && isGanadoDobleCriasSuperaVacasCria(data)) {
    errors.push('El número de crías no puede ser superior al número de vacas de cría')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Valida todas las plantillas de actividad con sector y plantilla elegidos (p. ej. antes de guardar borrador).
 * Omite entradas totalmente vacías; marca error si hay sector sin plantilla o viceversa.
 */
export function validateAllActivityTemplates(
  templates: Array<{ sector?: string; template?: string; product?: string | null; data?: Record<string, unknown> }>,
): ValidateTemplateResult {
  const errors: string[] = []
  for (let i = 0; i < templates.length; i++) {
    const item = templates[i]
    if (!item) {
      continue
    }
    const hasSector = Boolean(item?.sector?.trim())
    const hasTemplate = Boolean(item?.template?.trim())
    if (!hasSector && !hasTemplate) {
      continue
    }
    if (!hasSector || !hasTemplate) {
      errors.push(`Plantilla ${i + 1}: completa sector y plantilla o elimina la plantilla vacía`)
      continue
    }
    const r = validateActivityTemplate(item)
    if (!r.valid) {
      for (const e of r.errors) {
        errors.push(`Plantilla ${i + 1}: ${e}`)
      }
    }
  }
  return { valid: errors.length === 0, errors }
}

/** formulaKey de utilidad mensual por plantilla (para sincronizar con Ingreso cultivos/negocio) */
const UTILIDAD_MENSUAL_FORMULA_BY_TEMPLATE: Record<string, string> = {
  'ganado-ceba': 'ganado_ceba_utilidad_mensual',
  'ganado-doble-proposito': 'ganado_doble_utilidad_mensual_crias_leche',
  'cerdos-cria': 'cerdos_cria_total_utilidad_mensual',
  'cerdos-ceba': 'cerdos_ceba_total_utilidad_mensual',
  'pollos-engorde': 'pollos_engorde_total_utilidad_mensual',
  'aves-ponedoras': 'aves_ponedoras_total_utilidad_mensual',
  'peces-tilapia': 'peces_tilapia_total_utilidad_mensual',
  'cultivo-permanente': 'cultivo_permanente_total_utilidad_mensual',
  'cultivo-ciclo-corto': 'cultivo_ciclo_corto_total_utilidad_mensual',
  'cana-panela': 'cana_panela_total_utilidad_mensual',
  'servicios': 'servicios_ingresos_netos',
  'transporte-carga': 'transporte_carga_ingresos_netos_mes',
  'transporte-pasajeros': 'transporte_pasajeros_ingresos_netos_mes',
  'plantilla-comercial': 'plantilla_comercial_total_ingresos_netos_negocio',
}

/** Suma la utilidad mensual de todas las plantillas (para sincronizar con Ingreso cultivos/negocio) */
export function sumUtilidadMensualFromTemplates(
  templates: Array<{ template: string; data?: Record<string, unknown> }>,
): number {
  let total = 0
  for (const t of templates) {
    const formulaKey = UTILIDAD_MENSUAL_FORMULA_BY_TEMPLATE[t.template]
    if (!formulaKey || !t.data) continue
    const value = computeFormula(formulaKey, t.data)
    if (value != null && Number.isFinite(value)) {
      total += value
    }
  }
  return total
}
