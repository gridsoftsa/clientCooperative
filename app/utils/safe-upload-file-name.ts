/**
 * Windows/Edge a veces exponen `File.name` como ruta temporal (`…\\Temp\\PKM5E39.tmp`), lo que rompe
 * validación por extensión y el filename del multipart. Se prefiere un nombre con extensión inferida del MIME.
 */
function basenameOnly(pathOrName: string): string {
  const n = pathOrName.replace(/\\/g, '/')
  const i = n.lastIndexOf('/')
  return i >= 0 ? n.slice(i + 1) : n
}

function inferExtensionFromMime(mime: string): string | null {
  const m = mime.trim().toLowerCase()
  if (!m) {
    return null
  }
  if (m === 'application/pdf') {
    return 'pdf'
  }
  if (m === 'application/zip' || m === 'application/x-zip-compressed') {
    return 'zip'
  }
  if (m === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
    return 'xlsx'
  }
  if (m === 'application/msword') {
    return 'doc'
  }
  if (m === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return 'docx'
  }
  if (m === 'image/jpeg') {
    return 'jpg'
  }
  if (m.startsWith('image/')) {
    const sub = m.split('/')[1]?.split(';')[0]?.trim().toLowerCase() ?? ''
    if (sub === 'jpeg') {
      return 'jpg'
    }
    if (sub === 'svg+xml' || sub.startsWith('svg')) {
      return 'svg'
    }
    if (/^[a-z0-9]+$/i.test(sub)) {
      return sub
    }
  }
  return null
}

function looksLikeWindowsTempUploadName(name: string): boolean {
  const base = basenameOnly(name)
  if (!base) {
    return true
  }
  if (/[\\/]/.test(name)) {
    return true
  }
  if (/\.tmp$/i.test(base)) {
    return true
  }
  return false
}

/**
 * Nombre de archivo a enviar en multipart (`FormData.append(..., name)`) y para validar extensión en cliente.
 */
export function safeClientUploadFileName(file: File, fallbackBase = 'documento'): string {
  const raw = (file.name ?? '').trim()
  if (!looksLikeWindowsTempUploadName(raw)) {
    return raw
  }
  const fromMime = inferExtensionFromMime(file.type || '')
  const ext = fromMime ?? 'pdf'
  const base = fallbackBase.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').slice(0, 80) || 'documento'
  return `${base}.${ext}`
}

/** Añade `file` al FormData con `filename` explícito (evita nombres `.tmp` en el boundary). */
export function appendFileToFormData(fd: FormData, file: File, fallbackBase = 'adjunto'): void {
  fd.append('file', file, safeClientUploadFileName(file, fallbackBase))
}
