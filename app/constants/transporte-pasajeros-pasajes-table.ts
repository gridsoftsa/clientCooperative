/**
 * Tabla editable de Pasajes (plantilla transporte-pasajeros).
 */

export interface TransportePasajerosPasajesRow {
  key: string
  label: string
  type: 'money' | 'number' | 'computed'
  formulaKey?: string
}

export const TRANSPORTE_PASAJEROS_PASAJES_ROWS: TransportePasajerosPasajesRow[] = [
  { key: 'valor_pasaje_ida', label: 'VALOR PASAJE RUTA IDA', type: 'money' },
  { key: 'valor_pasaje_vuelta', label: 'VALOR PASAJE RUTA VUELTA', type: 'money' },
  { key: 'pct_ocupacion', label: '% OCUPACIÓN (AJUSTE)', type: 'number' },
  { key: 'total_viaje_ida', label: 'TOTAL VIAJE IDA', type: 'computed', formulaKey: 'transporte_pasajeros_total_viaje_ida' },
  { key: 'total_viaje_vuelta', label: 'TOTAL VIAJE VUELTA', type: 'computed', formulaKey: 'transporte_pasajeros_total_viaje_vuelta' },
  { key: 'ingreso_total_mes', label: 'INGRESO TOTAL EN EL MES', type: 'computed', formulaKey: 'transporte_pasajeros_ingreso_total_mes' },
]
