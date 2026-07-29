import type { ArchivalMetadataFieldRow } from '~/composables/useArchivalMetadataApi'
import { findFirstMissingRequiredMetadataField } from '~/utils/archival-form-validation'
import type { CatalogTreeSeries } from '~/types/archival-trd'
import type { ArchivalFileTreeNode } from '~/types/archival-file'

export interface ArchivalFileFolderOption {
  id: number
  label: string
}

export interface ArchivalFileDocTypeOption {
  id: number
  label: string
  seriesCode: string
  subseriesCode: string
  typeCode: string
}

export function flattenCatalogDocumentTypes(seriesList: CatalogTreeSeries[]): ArchivalFileDocTypeOption[] {
  const options: ArchivalFileDocTypeOption[] = []

  for (const series of seriesList) {
    for (const sub of series.subseries ?? []) {
      for (const type of sub.document_types ?? []) {
        options.push({
          id: type.id,
          label: `${type.code} — ${type.name} (${sub.code} / ${series.code})`,
          seriesCode: series.code,
          subseriesCode: sub.code,
          typeCode: type.code,
        })
      }
    }
  }

  return options.sort((a, b) => a.label.localeCompare(b.label, 'es'))
}

export function flattenFileFolderNodes(node: ArchivalFileTreeNode | null): ArchivalFileFolderOption[] {
  if (!node) {
    return []
  }

  const folders: ArchivalFileFolderOption[] = []

  function walk(current: ArchivalFileTreeNode, prefix = ''): void {
    if (current.type === 'folder' && current.archival_file_node_id) {
      folders.push({
        id: current.archival_file_node_id,
        label: prefix ? `${prefix} / ${current.name}` : current.name,
      })
    }

    const nextPrefix = current.type === 'folder'
      ? (prefix ? `${prefix} / ${current.name}` : current.name)
      : prefix

    for (const child of current.children ?? []) {
      walk(child, nextPrefix)
    }
  }

  for (const child of node.children ?? []) {
    walk(child)
  }

  return folders
}

export function metadataFieldSourceLabel(source: string | undefined, confidence?: number): string | null {
  if (!source) {
    return null
  }

  const label = matchSource(source)
  if (source === 'ocr' && confidence != null && confidence > 0) {
    return `${label} (${Math.round(confidence * 100)}%)`
  }

  return label
}

export function hasPendingOcrValidation(fieldSources: Record<string, string> | undefined): boolean {
  if (!fieldSources) {
    return false
  }

  return Object.values(fieldSources).some(source => source === 'ocr')
}

export function pendingOcrValidationCount(fieldSources: Record<string, string> | undefined): number {
  if (!fieldSources) {
    return 0
  }

  return Object.values(fieldSources).filter(source => source === 'ocr').length
}

export function ocrEngineIsUnavailable(engine: string | null | undefined): boolean {
  if (!engine) {
    return false
  }

  return engine === 'disabled'
    || engine === 'unsupported'
    || engine === 'tesseract_unavailable'
    || engine === 'unavailable'
}

export function ocrEngineDisplayLabel(engine: string | null | undefined): string | null {
  if (!engine) {
    return null
  }

  switch (engine) {
    case 'pdf_text':
      return 'Texto PDF'
    case 'tesseract':
      return 'Tesseract'
    case 'disabled':
      return 'OCR deshabilitado'
    case 'tesseract_unavailable':
      return 'Tesseract no disponible'
    case 'unsupported':
      return 'Formato no compatible'
    case 'unavailable':
      return 'Archivo no disponible'
    case 'no_ocr_fields':
      return 'Sin campos OCR en el esquema'
    default:
      return engine
  }
}

export function stripOcrSuggestions(
  values: Record<string, unknown>,
  fieldSources: Record<string, string>,
  fieldConfidence: Record<string, number> = {},
): {
  values: Record<string, unknown>
  fieldSources: Record<string, string>
  fieldConfidence: Record<string, number>
} {
  const nextValues = { ...values }
  const nextSources = { ...fieldSources }
  const nextConfidence = { ...fieldConfidence }

  for (const [code, source] of Object.entries(nextSources)) {
    if (source !== 'ocr') {
      continue
    }

    delete nextValues[code]
    delete nextSources[code]
    delete nextConfidence[code]
  }

  return {
    values: nextValues,
    fieldSources: nextSources,
    fieldConfidence: nextConfidence,
  }
}

export function isOcrSupportedUploadFile(file: File): boolean {
  const mime = file.type.toLowerCase()
  if (mime === 'application/pdf' || mime.startsWith('image/')) {
    return true
  }

  const name = file.name.toLowerCase()

  return name.endsWith('.pdf')
    || name.endsWith('.jpg')
    || name.endsWith('.jpeg')
    || name.endsWith('.png')
    || name.endsWith('.webp')
    || name.endsWith('.tif')
    || name.endsWith('.tiff')
}

function matchSource(source: string): string {
  switch (source) {
    case 'reused':
      return 'Reutilizado'
    case 'manual':
      return 'Manual'
    case 'ocr':
      return 'Sugerido OCR'
    default:
      return source
  }
}

export function validateArchivalMetadataFields(
  fields: ArchivalMetadataFieldRow[],
  values: Record<string, unknown>,
): string | null {
  const missing = findFirstMissingRequiredMetadataField(fields, values)
  if (missing === null) {
    return null
  }

  return `Complete el metadato obligatorio: ${missing.name}`
}
