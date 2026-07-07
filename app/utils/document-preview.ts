export type DocumentPreviewKind = 'pdf' | 'image' | 'zip' | 'unsupported'

export function resolveDocumentPreviewKind(fileName: string, mime = ''): DocumentPreviewKind {
  const normalizedMime = mime.toLowerCase()
  const ext = fileName.includes('.')
    ? fileName.slice(fileName.lastIndexOf('.') + 1).toLowerCase()
    : ''

  if (ext === 'pdf' || normalizedMime === 'application/pdf') {
    return 'pdf'
  }
  if (
    ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'].includes(ext)
    || normalizedMime.startsWith('image/')
  ) {
    return 'image'
  }
  if (ext === 'zip' || normalizedMime.includes('zip')) {
    return 'zip'
  }
  return 'unsupported'
}
