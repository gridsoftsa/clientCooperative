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
          { key: 'precio_lt_leche', label: 'Precio por LT leche', type: 'money', cols: 1 },
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
            key: 'produccion_mensual_lt',
            label: 'Producción mensual LT',
            type: 'computed',
            meta: 'Solo lectura (valor total / ciclo de producción en meses)',
            formulaKey: 'ganado_doble_produccion_mensual_lt',
            formulaFormat: 'money',
            cols: 1,
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
        ],
      },
      {
        key: 'costos',
        title: 'Discriminación de costos',
        fields: [
          { key: 'sostenimiento_madre', label: 'Sostenimiento de madre', type: 'money', cols: 1 },
          { key: 'alimentacion_lechon', label: 'Alimentación lechón', type: 'money', cols: 1 },
          { key: 'medicamento_complementos', label: 'Medicamento y complementos', type: 'money', cols: 1 },
          { key: 'mano_obra_cerdos', label: 'Mano de obra', type: 'money', cols: 1 },
          { key: 'mantenimiento_infraestructura', label: 'Mantenimiento infraestructura', type: 'money', cols: 1 },
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
  ganado_doble_produccion_mensual_lt: computeGanadoDobleProduccionMensualLt,
  ganado_ceba_cantidad: computeGanadoCebaCantidad,
  ganado_ceba_peso_inicial: computeGanadoCebaPesoInicial,
  ganado_ceba_pct_aumento: computeGanadoCebaPctAumento,
  ganado_ceba_ventas: computeGanadoCebaVentas,
  ganado_ceba_costos: computeGanadoCebaCostos,
  ganado_ceba_total_utilidad: computeGanadoCebaTotalUtilidad,
  ganado_ceba_utilidad_mensual: computeGanadoCebaUtilidadMensual,
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
