/**
 * Normalizes maps stored in `financial_info` (e.g. `auxiliaryDocuments`, `fngDocuments`).
 * JSON / APIs sometimes yield string IDs (`"12"`), which must match `credit_application_documents.id`.
 */
export function parseFinancialChecklistDocumentIdMap(raw: unknown): Record<string, number | null> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {}
  }
  const out: Record<string, number | null> = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (v === null || v === '') {
      out[k] = null
      continue
    }
    if (typeof v === 'number' && Number.isFinite(v)) {
      const n = Math.trunc(v)
      out[k] = n >= 1 ? n : null
      continue
    }
    if (typeof v === 'string') {
      const t = v.trim()
      if (t === '' || t === 'null') {
        out[k] = null
        continue
      }
      if (/^\d+$/.test(t)) {
        const n = parseInt(t, 10)
        out[k] = n >= 1 ? n : null
      }
    }
  }
  return out
}

export function creditApplicationDocumentIdEquals(docId: unknown, expected: number): boolean {
  const a = Number(docId)
  return Number.isFinite(a) && a >= 1 && a === expected
}
