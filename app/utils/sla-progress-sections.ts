export type SlaSectionTone = 'green' | 'yellow' | 'orange' | 'red'

export interface SlaProgressSection {
  tone: SlaSectionTone
  label: string
  fromDay: number
  toDay: number
  days: number
}

const SECTION_TONES: Array<{ tone: SlaSectionTone, label: string }> = [
  { tone: 'green', label: 'Verde' },
  { tone: 'yellow', label: 'Amarillo' },
  { tone: 'orange', label: 'Naranja' },
  { tone: 'red', label: 'Rojo' },
]

/**
 * Parte los días hábiles del SLA en cuatro tramos lo más iguales posible.
 * 12 días → 1–3, 4–6, 7–9 y 10–12.
 */
export function buildSlaProgressSections(totalDays: number): SlaProgressSection[] {
  const total = Math.floor(totalDays)

  if (total < 1) {
    return []
  }

  let cursor = 1

  return SECTION_TONES.map((tone, index) => {
    const toDay = Math.floor(((index + 1) * total) / 4)
    const fromDay = Math.min(cursor, toDay)
    const days = Math.max(0, toDay - fromDay + 1)
    cursor = toDay + 1

    return {
      tone: tone.tone,
      label: tone.label,
      fromDay,
      toDay,
      days,
    }
  }).filter(section => section.days > 0)
}

export function slaSectionIndex(sections: SlaProgressSection[], elapsedDays: number): number {
  if (sections.length === 0) {
    return 0
  }

  if (elapsedDays <= 0) {
    return 0
  }

  const index = sections.findIndex(section => elapsedDays <= section.toDay)

  return index === -1 ? sections.length - 1 : index
}
