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

/** Sección del schema */
export interface FormSectionSchema {
  key?: string
  title: string
  fields: FormFieldSchema[]
}

/** Schema completo para DynamicFormRenderer */
export interface FormSchemaInput {
  sections: FormSectionSchema[]
}
