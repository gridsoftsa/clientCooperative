import type { VentanillaFunctionalTypeProducerArea, VentanillaFunctionalTypeRow } from '~/types/ventanilla'

export function responsibleOrgUnitIdsForFunctionalType(
  functionalType: VentanillaFunctionalTypeRow | null | undefined,
): number[] {
  const ids: number[] = []

  for (const raw of functionalType?.public_org_unit_ids ?? []) {
    const id = Number(raw)
    if (Number.isFinite(id) && id > 0 && !ids.includes(id)) {
      ids.push(id)
    }
  }

  if (ids.length === 0 && functionalType?.public_org_unit_id != null) {
    const single = Number(functionalType.public_org_unit_id)
    if (Number.isFinite(single) && single > 0) {
      ids.push(single)
    }
  }

  for (const area of functionalType?.producer_areas ?? []) {
    const id = Number(area.org_unit_id)
    if (Number.isFinite(id) && id > 0 && !ids.includes(id)) {
      ids.push(id)
    }
  }

  return ids
}

export function configuredProducerAreasForFunctionalType(
  functionalType: VentanillaFunctionalTypeRow | null | undefined,
): VentanillaFunctionalTypeProducerArea[] {
  const byId = new Map<number, VentanillaFunctionalTypeProducerArea>()

  for (const area of functionalType?.producer_areas ?? []) {
    if (area.org_unit_id) {
      byId.set(Number(area.org_unit_id), area)
    }
  }

  for (const orgUnitId of responsibleOrgUnitIdsForFunctionalType(functionalType)) {
    if (!byId.has(orgUnitId)) {
      byId.set(orgUnitId, { org_unit_id: orgUnitId })
    }
  }

  return [...byId.values()]
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
