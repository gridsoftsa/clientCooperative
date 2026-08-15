import type { VentanillaFunctionalTypeProducerArea, VentanillaFunctionalTypeRow } from '~/types/ventanilla'

export function configuredProducerAreasForFunctionalType(
  functionalType: VentanillaFunctionalTypeRow | null | undefined,
): VentanillaFunctionalTypeProducerArea[] {
  return (functionalType?.producer_areas ?? []).filter(area => area.org_unit_id)
}

export function filterOrgUnitsByFunctionalTypeAreas<T extends { id: number }>(
  units: T[],
  areas: VentanillaFunctionalTypeProducerArea[],
): T[] {
  if (areas.length === 0) {
    return units
  }

  const allowedIds = new Set(areas.map(area => area.org_unit_id))

  return units.filter(unit => allowedIds.has(unit.id))
}

export function clearInvalidOrgUnitSelectionsForFunctionalType(
  filingType: 'incoming' | 'outgoing' | 'internal',
  producerOrgUnitId: number | null,
  recipientOrgUnitId: number | null,
  areas: VentanillaFunctionalTypeProducerArea[],
): { producerOrgUnitId: number | null; recipientOrgUnitId: number | null } {
  const allowedIds = areas.length > 0
    ? new Set(areas.map(area => area.org_unit_id))
    : null

  let producer = producerOrgUnitId
  let recipient = recipientOrgUnitId

  if (allowedIds !== null) {
    if (producer != null && !allowedIds.has(producer)) {
      producer = null
    }

    if (recipient != null && !allowedIds.has(recipient)) {
      recipient = null
    }
  }

  if (filingType === 'incoming') {
    producer = null
  }

  if (filingType === 'outgoing') {
    recipient = null
  }

  return {
    producerOrgUnitId: producer,
    recipientOrgUnitId: recipient,
  }
}
