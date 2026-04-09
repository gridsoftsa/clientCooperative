/**
 * UI del análisis y SCORE alineada a la plantilla Excel
 * `docs/PLANTILLA ANALISIS Y SCOREn Modificado.xlsx`.
 *
 * Excluidas del formulario: DATOS, CORRIENTE, EMERGENCIA, HOJA LIQU.
 */

export type AnalisisScorePerfilValue = 'independiente' | 'empleado' | 'pensionado'

export const ANALISIS_SCORE_PERFIL_OPTIONS: ReadonlyArray<{
  value: AnalisisScorePerfilValue
  label: string
}> = [
  { value: 'independiente', label: 'Independiente' },
  { value: 'empleado', label: 'Empleado' },
  { value: 'pensionado', label: 'Pensionado' },
]

/**
 * Matrices de referencia (hojas INDEPENDIENTE y EMPLEADO y PENSIONADO).
 * Se editan en Configuración; alimentan la lógica de las vistas imprimibles en radicación.
 */
export const SCORE_TEMPLATE_MATRIX_TABS: ReadonlyArray<{
  value: string
  label: string
  sheetName: string
  hint: string
}> = [
  {
    value: 'independiente',
    label: 'INDEPENDIENTE',
    sheetName: 'INDEPENDIENTE',
    hint: 'Variables cualitativas y cuantitativas — perfil independiente.',
  },
  {
    value: 'empleado-pensionado',
    label: 'EMPLEADO y PENSIONADO',
    sheetName: 'EMPLEADO y PENSIONADO',
    hint: 'Variables de score para empleado y pensionado.',
  },
]

/** Pestañas del formulario de Análisis y SCORE en radicación (vistas tipo impresión). */
export const ANALISIS_SCORE_IMPRIMIR_TABS: ReadonlyArray<{
  value: string
  label: string
  sheetName: string
  hint: string
}> = [
  {
    value: 'imprimir-independiente',
    label: 'IMPRIMIR INDEPENDIENTE',
    sheetName: 'IMPRIMIR INDEPENDIENTE',
    hint: 'Vista de impresión / resumen independiente.',
  },
  {
    value: 'imprimir-empleado-pensionado',
    label: 'IMPRIMIR EMPLEADO - PENSIONADO',
    sheetName: 'IMPRIMIR EMPLEADO -PENSIONADO',
    hint: 'Vista de impresión / resumen empleado y pensionado.',
  },
]
