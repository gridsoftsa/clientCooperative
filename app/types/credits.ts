/** Campos del schema de formulario dinámico */
export interface FormFieldSchema {
  key: string
  label: string
  type: 'money' | 'select' | 'date' | 'number' | 'text'
  required?: boolean
  cols?: number
  meta?: string
  options?: Array<{ value: string | number; label: string }>
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
