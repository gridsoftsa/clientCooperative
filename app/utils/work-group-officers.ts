/** Filas enviadas a la API (`officers`); `office_role` en inglés. */
export type WorkGroupOfficerRow = {
  office_role: 'president' | 'secretary' | 'president_delegate' | 'secretary_delegate'
  org_staff_id: number
  sort_order: number
}
