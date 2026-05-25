/**
 * Checklist de documentos del ente aprobador — director de crédito (`credit-director-approver-documents`).
 */

export interface ApproverEntityChecklistItem {
  key: string
  label: string
  required: boolean
}

/**
 * Extrae `items` de la respuesta GET `/catalogs/template-flat-data/credit-director-approver-documents`.
 */
export function extractApproverEntityItemsFromCatalogResponse(body: unknown): ApproverEntityChecklistItem[] {
  if (!body || typeof body !== 'object') {
    return []
  }
  const root = body as Record<string, unknown>
  let payload: unknown = root.data !== undefined ? root.data : root
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const pl = payload as Record<string, unknown>
    if (pl.items === undefined && pl.config_data !== undefined && typeof pl.config_data === 'object') {
      payload = pl.config_data
    } else if (pl.items === undefined && pl.data !== undefined && typeof pl.data === 'object') {
      payload = pl.data
    }
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return []
  }
  const raw = (payload as Record<string, unknown>).items
  if (!Array.isArray(raw)) {
    return []
  }
  const out: ApproverEntityChecklistItem[] = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') {
      continue
    }
    const r = row as { key?: unknown; label?: unknown; required?: unknown; obligatorio?: unknown }
    const key = String(r.key ?? '').trim()
    if (!key) {
      continue
    }
    const required = Object.prototype.hasOwnProperty.call(r, 'required')
      ? Boolean(r.required)
      : Boolean(r.obligatorio)
    out.push({
      key,
      label: String(r.label ?? key),
      required,
    })
  }
  return out
}

export function titleForApproverEntityDocumentUpload(label: string): string {
  const t = label.trim()
  const full = t ? `Ente aprobador — ${t}` : 'Ente aprobador — documento'
  return full.length > 255 ? `${full.slice(0, 251)}…` : full
}
