export const ORG_POSITION_REPORTS_TO_REQUIRED_MESSAGE
  = 'Si elige un área en «Reporta a», debe seleccionar el cargo o el funcionario al que reporta. El área sola no se guarda.'

export function orgPositionReportsToIncomplete(
  reportToOrgUnitId: number | null,
  reportsToPositionId: number | null,
): boolean {
  return reportToOrgUnitId != null && reportsToPositionId == null
}
