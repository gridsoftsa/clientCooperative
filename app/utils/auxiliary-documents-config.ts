/**
 * Normalizes flat template config for `auxiliary-documents` after API load.
 * Migrates legacy keys (`items_by_activity`, `obligatorio`) to English (`itemsByActivity`, `required`).
 */
export function migrateAuxiliaryDocumentsFlatConfig(d: Record<string, unknown>): void {
  type Row = { key?: unknown, label?: unknown, required?: unknown, obligatorio?: unknown }

  const migrateRows = (rows: unknown): Record<string, unknown>[] => {
    if (!Array.isArray(rows)) return []
    return rows.map((row) => {
      const r = row as Row
      const required
        = r.required !== undefined && r.required !== null
          ? Boolean(r.required)
          : Boolean(r.obligatorio)
      return {
        key: r.key,
        label: r.label,
        required,
      }
    })
  }

  const modern = d.itemsByActivity
  const legacy = d.items_by_activity

  const modernHasRows =
    modern != null
    && typeof modern === 'object'
    && Object.keys(modern as object).length > 0

  if (modernHasRows) {
    const cleaned: Record<string, Record<string, unknown>[]> = {}
    for (const [activity, rows] of Object.entries(modern as Record<string, unknown>)) {
      cleaned[activity] = migrateRows(rows)
    }
    d.itemsByActivity = cleaned
    if (legacy !== undefined) {
      delete d.items_by_activity
    }
    return
  }

  if (legacy != null && typeof legacy === 'object' && Object.keys(legacy).length > 0) {
    const out: Record<string, Record<string, unknown>[]> = {}
    for (const [activity, rows] of Object.entries(legacy as Record<string, unknown>)) {
      out[activity] = migrateRows(rows)
    }
    d.itemsByActivity = out
    delete d.items_by_activity
  }
}
