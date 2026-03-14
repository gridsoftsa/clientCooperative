/** Campos del schema de formulario dinámico */
export interface FormFieldSchema {
  key: string
  label: string
  type: 'money' | 'select' | 'date' | 'number' | 'text' | 'textarea' | 'computed' | 'municipality'
  required?: boolean
  cols?: number
  meta?: string
  options?: Array<{ value: string | number; label: string }>
  /** Para type='computed': identificador de la fórmula a aplicar */
  formulaKey?: string
  /** Para type='computed': formato de salida ('number' | 'percent' | 'money') */
  formulaFormat?: 'number' | 'percent' | 'money'
  /** Mostrar el campo solo cuando otro campo tenga un valor específico */
  visibleWhen?: { fieldKey: string; value: string | number }
}

/** Fila de la tabla de clasificación de huevos */
export interface EggsTableRowSchema {
  label: string
  suffix: string
  textClass?: string
}

/** Sección del schema */
export interface FormSectionSchema {
  key?: string
  title: string
  fields: FormFieldSchema[]
  /** Layout alternativo: tabla de clasificación de huevos (aves ponedoras) */
  layout?: 'eggsTable' | 'finagroTable' | 'referenciaInfo' | 'referenciaInfoCeba' | 'cicloCortoCostBreakdownTable' | 'serviciosIngresosTable' | 'transporteCargaGastosTable' | 'transportePasajerosPasajesTable' | 'transportePasajerosGastosTable'
  tableRows?: EggsTableRowSchema[]
  /** Para serviciosIngresosTable: filas de la tabla (tipo día) */
  serviciosTableRows?: Array<{ suffix: string; label: string }>
  /** Para transporteCargaGastosTable: filas de gastos por viaje */
  gastosTableRows?: Array<{ key: string; label: string }>
  /** Para transportePasajerosPasajesTable: filas de pasajes */
  pasajesTableRows?: Array<{ key: string; label: string; type: 'money' | 'number' | 'computed'; formulaKey?: string }>
}

/** Schema completo para DynamicFormRenderer */
export interface FormSchemaInput {
  sections: FormSectionSchema[]
}
