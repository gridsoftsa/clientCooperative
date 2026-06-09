import type { VentanillaFilingTypeValue } from '~/types/ventanilla'

export function ventanillaResponsibleOrgUnitId(
  filingType: VentanillaFilingTypeValue,
  producerOrgUnitId: number | null,
  recipientOrgUnitId: number | null,
): number | null {
  if (filingType === 'incoming') {
    return recipientOrgUnitId
  }

  return producerOrgUnitId
}
