/**
 * Tabla editable de Gastos por Viaje Redondo (plantilla transporte-carga).
 * Estructura según formato Excel: COMBUSTIBLE, PEAJES, % CONDUCTOR, etc.
 */
export interface TransporteCargaGastosRow {
  key: string
  label: string
}

export const TRANSPORTE_CARGA_GASTOS_ROWS: TransporteCargaGastosRow[] = [
  { key: 'combustible', label: 'COMBUSTIBLE' },
  { key: 'peajes', label: 'PEAJES' },
  { key: 'conductor', label: '% CONDUCTOR' },
  { key: 'lavado_parqueadero', label: 'LAVADO Y PARQUEDAERO' },
  { key: 'cargue_descargue', label: 'CARGUE Y DESCARGUE' },
  { key: 'otros', label: 'OTROS' },
]
