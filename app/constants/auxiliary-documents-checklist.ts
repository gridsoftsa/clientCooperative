/**
 * Auxiliary documents checklist template (`auxiliary-documents`).
 * Business labels stay Spanish; identifiers (`key`, JSON keys) are English.
 * Las claves de `itemsByActivity` deben coincidir con los `value` del catálogo
 * `actividad-economica` (parametrización); no hay lista fija en el cliente.
 */

export interface AuxiliaryChecklistItem {
  key: string
  /** Display text (Spanish in production). */
  label: string
  required: boolean
}

/** Opciones del catálogo `actividad-economica` (mismo `value` que las claves de `itemsByActivity` en parametrización). */
export interface EconomicActivityCatalogOption {
  value: string
  label: string
}

/**
 * Extrae `itemsByActivity` de la respuesta GET `/api/catalogs/template-flat-data/auxiliary-documents`
 * (tolerante a `{ data }`, `data.config_data`, etc.).
 */
export function extractItemsByActivityFromCatalogResponse(body: unknown): Record<string, AuxiliaryChecklistItem[]> {
  if (!body || typeof body !== 'object') {
    return {}
  }
  const root = body as Record<string, unknown>
  let payload: Record<string, unknown> | unknown = root.data !== undefined ? root.data : root
  /** Doble anidación accidental `{ data: { data: config } }`. */
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const pl = payload as Record<string, unknown>
    if (
      pl.itemsByActivity === undefined
      && pl.config_data === undefined
      && pl.data !== undefined
      && typeof pl.data === 'object'
      && pl.data !== null
    ) {
      payload = pl.data as Record<string, unknown>
    }
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {}
  }
  const p = payload as Record<string, unknown>
  let iba: unknown = p.itemsByActivity
  if ((iba === undefined || iba === null) && p.config_data !== undefined && typeof p.config_data === 'object') {
    iba = (p.config_data as Record<string, unknown>).itemsByActivity
  }
  if (!iba || typeof iba !== 'object') {
    return {}
  }
  if (Array.isArray(iba)) {
    return {}
  }
  return iba as Record<string, AuxiliaryChecklistItem[]>
}

/** Normaliza texto guardado en `financial_info.activity_type` (espacios raros, objeto Multiselect). */
export function normalizeStoredActivityType(raw: unknown): string {
  if (raw == null) {
    return ''
  }
  if (typeof raw === 'object' && raw !== null && 'value' in raw) {
    return normalizeStoredActivityType((raw as { value?: unknown }).value)
  }
  return String(raw).replace(/\u00a0/g, ' ').trim()
}

/**
 * Filas del checklist para el tipo de actividad elegido: alinea `activity_type` del formulario con las claves
 * de parametrización (mismos `value` que «Tipo de actividad económica»), con coincidencia flexible por etiqueta o mayúsculas.
 */
export function resolveAuxiliaryChecklistRows(
  itemsByActivity: Record<string, AuxiliaryChecklistItem[]>,
  activityType: string,
  catalogOptions?: ReadonlyArray<EconomicActivityCatalogOption>,
): AuxiliaryChecklistItem[] {
  if (Array.isArray(itemsByActivity)) {
    return []
  }

  const raw = normalizeStoredActivityType(activityType)
  if (!raw) {
    return []
  }

  let canonicalKey = raw
  if (catalogOptions?.length) {
    const byValue = catalogOptions.find(o => o.value === raw || o.value.trim().toLowerCase() === raw.toLowerCase())
    if (byValue) {
      canonicalKey = byValue.value
    } else {
      const byLabel = catalogOptions.find(
        o =>
          o.label.trim() === raw
          || o.label.trim().toLowerCase() === raw.toLowerCase(),
      )
      if (byLabel) {
        canonicalKey = byLabel.value
      }
    }
  }

  const iba = itemsByActivity
  if (Array.isArray(iba[canonicalKey])) {
    return iba[canonicalKey]!
  }
  if (Array.isArray(iba[raw])) {
    return iba[raw]!
  }

  const lowerCanon = canonicalKey.trim().toLowerCase()
  const keyCanon = Object.keys(iba).find(k => k.trim().toLowerCase() === lowerCanon)
  if (keyCanon !== undefined && Array.isArray(iba[keyCanon])) {
    return iba[keyCanon]!
  }

  const lowerRaw = raw.trim().toLowerCase()
  const keyRaw = Object.keys(iba).find(k => k.trim().toLowerCase() === lowerRaw)
  if (keyRaw !== undefined && Array.isArray(iba[keyRaw])) {
    return iba[keyRaw]!
  }

  return []
}

/** Stable key for checklist rows added from parametrización (English identifier for JSON). */
export function generateAuxiliaryChecklistItemKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `custom_${crypto.randomUUID()}`
  }
  return `custom_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

/** Allowed file extensions for auxiliary uploads (client validation). */
export const AUXILIARY_UPLOAD_ALLOWED_EXTENSIONS = ['pdf', 'zip', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'] as const

export function isAuxiliaryUploadFileAllowed(file: File): boolean {
  const name = file.name.toLowerCase()
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.') + 1) : ''
  if (!ext || !(AUXILIARY_UPLOAD_ALLOWED_EXTENSIONS as readonly string[]).includes(ext)) {
    return false
  }
  const mime = (file.type || '').toLowerCase()
  if (!mime) {
    return true
  }
  if (mime === 'application/pdf' || mime === 'application/zip' || mime === 'application/x-zip-compressed') {
    return true
  }
  if (mime.startsWith('image/')) {
    return true
  }
  return false
}

export function auxiliaryUploadRejectReason(file: File): string | null {
  if (isAuxiliaryUploadFileAllowed(file)) {
    return null
  }
  return 'Solo se permiten archivos PDF, ZIP o imagen (p. ej. JPG, PNG).'
}

/** Stored title prefix for credit_application_documents rows from this checklist. */
export function titleForAuxiliaryDocumentUpload(label: string): string {
  const t = `Auxiliar — ${label}`.trim()
  return t.length > 255 ? `${t.slice(0, 251)}…` : t
}
