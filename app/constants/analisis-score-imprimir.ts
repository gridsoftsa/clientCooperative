/**
 * Estructura de las hojas «IMPRIMIR INDEPENDIENTE» e «IMPRIMIR EMPLEADO -PENSIONADO»
 * (formato reporte AIR-SARC-FO-02 / FO-03).
 */

export type ImprimirVariableRow = {
  variable: string
  caracteristica: string
  puntaje: string
}

export type ImprimirMeta = {
  titulo: string
  codigoFormulario: string
  version: string
  entidadLinea: string
}

export const IMPRIMIR_INDEPENDIENTE_META: ImprimirMeta = {
  titulo: 'PERFIL DE RIESGO DEUDOR SARC',
  codigoFormulario: 'AIR-SARC-FO-02',
  version: '02',
  entidadLinea: 'ADMINISTRACIÓN INTEGRAL DE RIESGOS',
}

export const IMPRIMIR_EMPLEADO_META: ImprimirMeta = {
  titulo: 'PERFIL DE RIESGO DEUDOR SARC',
  codigoFormulario: 'AIR-SARC-FO-03',
  version: '02',
  entidadLinea: 'ADMINISTRACIÓN INTEGRAL DE RIESGOS',
}

/** Filas principales del bloque VARIABLES / CARACTERÍSTICA / PUNTAJE (plantilla impresión independiente). */
export const IMPRIMIR_INDEPENDIENTE_VARIABLES: ImprimirVariableRow[] = [
  { variable: 'CUALITATIVAS', caracteristica: '', puntaje: '' },
  { variable: 'VARIABLES', caracteristica: 'CARACTERÍSTICA', puntaje: 'PUNTAJE' },
  { variable: 'Antigüedad como asociado en meses', caracteristica: '', puntaje: '' },
  { variable: 'Actividad que desarrolla', caracteristica: '', puntaje: '' },
  { variable: 'Antigüedad en la actividad', caracteristica: '', puntaje: '' },
  { variable: 'Edad', caracteristica: '', puntaje: '' },
  { variable: 'Estado civil', caracteristica: '', puntaje: '' },
  { variable: 'CUANTITATIVAS', caracteristica: '', puntaje: '' },
  { variable: 'Calificación en centrales de riesgo (SCORE)', caracteristica: '', puntaje: '' },
  { variable: 'Hábito de pago en centrales de riesgo', caracteristica: '', puntaje: '' },
  { variable: 'Nivel de endeudamiento (total pasivo / bien raíz) = %', caracteristica: '', puntaje: '' },
  { variable: 'Reestructuraciones (vigentes)', caracteristica: '', puntaje: '' },
  { variable: 'Comportamiento en Coopservivelez', caracteristica: '', puntaje: '' },
  { variable: 'Garantía', caracteristica: '', puntaje: '' },
  { variable: 'Solvencia del deudor (total pasivos / total activos)', caracteristica: '', puntaje: '' },
]

/** Filas principales — impresión empleado / pensionado. */
export const IMPRIMIR_EMPLEADO_VARIABLES: ImprimirVariableRow[] = [
  { variable: 'CUALITATIVAS', caracteristica: '', puntaje: '' },
  { variable: 'VARIABLES', caracteristica: 'CARACTERÍSTICA', puntaje: 'PUNTAJE' },
  { variable: 'Antigüedad como asociado en meses', caracteristica: '', puntaje: '' },
  { variable: 'Edad', caracteristica: '', puntaje: '' },
  { variable: 'Estado civil', caracteristica: '', puntaje: '' },
  { variable: 'Tipo de contrato', caracteristica: '', puntaje: '' },
  { variable: 'Antigüedad laboral en meses', caracteristica: '', puntaje: '' },
  { variable: 'CUANTITATIVAS', caracteristica: '', puntaje: '' },
  { variable: 'Calificación en centrales de riesgo (SCORE)', caracteristica: '', puntaje: '' },
  { variable: 'Hábito de pago en centrales de riesgo', caracteristica: '', puntaje: '' },
  { variable: 'Nivel de endeudamiento (total pasivo / bien raíz) = %', caracteristica: '', puntaje: '' },
  { variable: 'Reestructuraciones (vigentes)', caracteristica: '', puntaje: '' },
  { variable: 'Comportamiento en Coopservivelez', caracteristica: '', puntaje: '' },
  { variable: 'Garantía', caracteristica: '', puntaje: '' },
  { variable: 'Solvencia del deudor (total pasivos / total activos)', caracteristica: '', puntaje: '' },
]

/** Tabla MÍNIMO / MÁXIMO / RANGO (común a ambas hojas de imprimir). */
export const IMPRIMIR_NIVEL_RIESGO_TABLA: ReadonlyArray<readonly [string, string, string]> = [
  ['MÍNIMO', 'MÁXIMO', 'RANGO'],
  ['0', '400', 'ALTO'],
  ['401', '700', 'MEDIO'],
  ['701', '1000', 'BAJO'],
]

/**
 * Leyenda de valores posibles (columna auxiliar del Excel) — referencia para el analista.
 * Orden aproximado al de la plantilla.
 */
export const IMPRIMIR_LEYENDA_INDEPENDIENTE: string[] = [
  '0 a 24',
  '25 a 60',
  '61 a 120',
  '>120',
  'Independientes (servicios)',
  'Comercio formal',
  'Comercio informal',
  'Transportadores',
  'Agropecuario',
  '6 a 24',
  '18 a 25 años',
  '26 a 50 años',
  '51 a 84 años',
  'Soltero',
  'Casado',
  'Unión libre',
  'Viudo',
  'Separado',
  '0 - 450',
  '451 - 600',
  '601 en adelante',
  'Bueno',
  'Regular',
  'Malo',
  'No tiene experiencia',
  '0% a 40%',
  '41% a 60%',
  '>60%',
  'Hptca rural 40% a 65%',
  'Hptca urbana 40% a 75%',
  'Hptca copada > 65% o 75%',
  'Sin reestructuraciones',
  '1 reestructuración',
  '2 o más reestructuraciones',
  'Hipotecario',
  'Deudor y codeudor con bien raíz',
  'Codeudor con bien raíz',
  'Codeudor con bien raíz y FNG',
  'FNG',
  'Firma personal',
  'CDAT',
  'APORTES',
  '0% a 35%',
  '36% a 70%',
  '> 70%',
]

export const IMPRIMIR_LEYENDA_EMPLEADO: string[] = [
  '0 a 24',
  '25 a 60',
  '61 a 120',
  '121 a 540',
  '18 a 25',
  '26 a 50',
  '51 a 84',
  'Soltero',
  'Casado',
  'Unión libre',
  'Viudo',
  'Separado',
  'Indefinido o pensión',
  'Fijo',
  'Prestación de servicios',
  'Informal',
  '0 - 450',
  '451 - 600',
  '601 en adelante',
  'Bueno',
  'Regular',
  'Malo',
  'No tiene experiencia',
  '0% a 40%',
  '41% a 60%',
  '>60%',
  'Hptca rural 40% a 65%',
  'Hptca urbana 40% a 75%',
  'Hptca copada > 65% o 75%',
  'Sin reestructuraciones',
  '1 reestructuración',
  '2 o más reestructuraciones',
  'Libranza (Coopservivelez)',
  'Hipotecario',
  'Deudor y codeudor con bien raíz',
  'Codeudor con bien raíz',
  'Codeudor con bien raíz y FNG',
  'FNG',
  'Firma personal',
  'CDAT',
  'APORTES',
  '0% a 35%',
  '36% a 70%',
  '> 70%',
]
