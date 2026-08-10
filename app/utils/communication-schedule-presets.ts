export type CommunicationPublishPreset =
  | 'now'
  | 'in_15m'
  | 'in_1h'
  | 'in_3h'
  | 'tomorrow_8am'
  | 'custom'

export const COMMUNICATION_PUBLISH_PRESET_LABELS: Record<CommunicationPublishPreset, string> = {
  now: 'Publicar ahora',
  in_15m: 'En 15 minutos',
  in_1h: 'En 1 hora',
  in_3h: 'En 3 horas',
  tomorrow_8am: 'Mañana 8:00 a. m.',
  custom: 'Fecha y hora personalizada',
}

const BOGOTA_TZ = 'America/Bogota'

function bogotaDateParts(date: Date): { year: string, month: string, day: string, hour: string, minute: string } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BOGOTA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date)

  const get = (type: string) => parts.find(part => part.type === type)?.value ?? '00'

  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
  }
}

export function formatBogotaDatetimeLocal(date: Date): string {
  const { year, month, day, hour, minute } = bogotaDateParts(date)

  return `${year}-${month}-${day}T${hour}:${minute}`
}

export function bogotaDatetimeLocalFromOffset(minutesFromNow: number): string {
  return formatBogotaDatetimeLocal(new Date(Date.now() + minutesFromNow * 60_000))
}

export function bogotaTomorrowAt(hour: number, minute = 0): string {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: BOGOTA_TZ }).format(new Date())
  const anchor = new Date(`${today}T12:00:00-05:00`)
  anchor.setDate(anchor.getDate() + 1)
  const tomorrow = new Intl.DateTimeFormat('en-CA', { timeZone: BOGOTA_TZ }).format(anchor)

  return `${tomorrow}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

export function resolveCommunicationPublishPreset(preset: CommunicationPublishPreset): string {
  switch (preset) {
    case 'now':
      return ''
    case 'in_15m':
      return bogotaDatetimeLocalFromOffset(15)
    case 'in_1h':
      return bogotaDatetimeLocalFromOffset(60)
    case 'in_3h':
      return bogotaDatetimeLocalFromOffset(180)
    case 'tomorrow_8am':
      return bogotaTomorrowAt(8, 0)
    case 'custom':
    default:
      return ''
  }
}

export function formatBogotaSchedulePreview(value: string | null | undefined): string {
  if (!value) {
    return 'Publicación inmediata al guardar'
  }

  const iso = value.includes('T') && (value.endsWith('Z') || /[+-]\d{2}/.test(value))
    ? value
    : `${value}:00-05:00`

  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString('es-CO', {
    timeZone: BOGOTA_TZ,
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}
