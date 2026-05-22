export interface WorkGroupMemberSelection {
  staffIds: number[]
  positionIds: number[]
  unitIds: number[]
}

export function emptyWorkGroupMemberSelection(): WorkGroupMemberSelection {
  return { staffIds: [], positionIds: [], unitIds: [] }
}

export function buildWorkGroupMembersPayload(sel: WorkGroupMemberSelection): Array<{ kind: 'staff' | 'position' | 'unit'; id: number }> {
  const out: Array<{ kind: 'staff' | 'position' | 'unit'; id: number }> = []
  for (const id of sel.staffIds) {
    out.push({ kind: 'staff', id })
  }
  for (const id of sel.positionIds) {
    out.push({ kind: 'position', id })
  }
  for (const id of sel.unitIds) {
    out.push({ kind: 'unit', id })
  }
  return out
}

export function workGroupMembersFromApi(members: Array<{
  member_kind?: string | null
  org_staff_id?: number | null
  org_position_id?: number | null
  org_unit_id?: number | null
}>): WorkGroupMemberSelection {
  const sel = emptyWorkGroupMemberSelection()
  for (const m of members) {
    const kind = m.member_kind
    if (kind === 'staff' && m.org_staff_id != null) {
      sel.staffIds.push(Number(m.org_staff_id))
    } else if (kind === 'position' && m.org_position_id != null) {
      sel.positionIds.push(Number(m.org_position_id))
    } else if (kind === 'unit' && m.org_unit_id != null) {
      sel.unitIds.push(Number(m.org_unit_id))
    }
  }
  sel.staffIds = [...new Set(sel.staffIds)]
  sel.positionIds = [...new Set(sel.positionIds)]
  sel.unitIds = [...new Set(sel.unitIds)]
  return sel
}
