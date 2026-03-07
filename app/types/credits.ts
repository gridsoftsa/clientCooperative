/** Campos del schema de formulario dinámico */
export interface FormFieldSchema {
  key: string
  label: string
  type: 'money' | 'select' | 'date' | 'number' | 'text' | 'computed'
  required?: boolean
  cols?: number
  meta?: string
  options?: Array<{ value: string | number; label: string }>
  /** Para type='computed': identificador de la fórmula a aplicar */
  formulaKey?: string
  /** Para type='computed': formato de salida ('number' | 'percent' | 'money') */
  formulaFormat?: 'number' | 'percent' | 'money'
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
  layout?: 'eggsTable' | 'finagroTable' | 'referenciaInfo' | 'referenciaInfoCeba' | 'cicloCortoCostBreakdownTable'
  tableRows?: EggsTableRowSchema[]
}

/** Schema completo para DynamicFormRenderer */
export interface FormSchemaInput {
  sections: FormSectionSchema[]
}
