/**
 * Tabla editable de Ingresos por Servicio (plantilla servicios).
 * Filas: Día bueno, Día regular, Día malo.
 * Columnas: Valor, Cantidad/semana, Total (calculado).
 */
export interface ServiciosIngresosRow {
  suffix: string
  label: string
}

export const SERVICIOS_INGRESOS_ROWS: ServiciosIngresosRow[] = [
  { suffix: 'bueno', label: 'Día bueno' },
  { suffix: 'regular', label: 'Día regular' },
  { suffix: 'malo', label: 'Día malo' },
]

export const SERVICIOS_INGRESOS_KEY = 'servicios_ingresos'

/** Claves de campos para getConfigFieldKeys */
export function getServiciosIngresosFieldKeys(): string[] {
  return SERVICIOS_INGRESOS_ROWS.flatMap((r) => [
    `dia_${r.suffix}_valor`,
    `dia_${r.suffix}_cantidad`,
  ])
}
