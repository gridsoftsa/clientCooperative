import type { ArchivalDocumentRetentionSummary, ArchivalFileTreeNode } from '~/types/archival-file'

const FOLDER_TYPES = new Set<ArchivalFileTreeNode['type']>([
  'area',
  'series',
  'subseries',
  'document_type',
  'folder',
  'filing',
  'applicant',
])

const DOCUMENT_TYPES = new Set<ArchivalFileTreeNode['type']>([
  'document',
  'document_reference',
])

export function isArchivalAreaFolderNode(node: ArchivalFileTreeNode): boolean {
  return FOLDER_TYPES.has(node.type)
}

export function isArchivalAreaDocumentNode(node: ArchivalFileTreeNode): boolean {
  return DOCUMENT_TYPES.has(node.type)
}

export function archivalAreaDocumentRecordId(node: ArchivalFileTreeNode): number | null {
  if (typeof node.archival_file_document_id === 'number' && node.archival_file_document_id > 0) {
    return node.archival_file_document_id
  }

  const match = /^doc-(\d+)$/.exec(node.id)

  if (!match) {
    return null
  }

  return Number(match[1])
}

export function canViewArchivalAreaDocument(node: ArchivalFileTreeNode): boolean {
  return node.can_view_content !== false
}

export function canOpenArchivalAreaDocument(node: ArchivalFileTreeNode): boolean {
  return node.archival_file_id != null && archivalAreaDocumentRecordId(node) != null
}

export function archivalAreaNodeIcon(node: ArchivalFileTreeNode, open = false): string {
  if (node.type === 'applicant') {
    return 'i-lucide-user-round'
  }

  if (node.type === 'filing') {
    return 'i-lucide-inbox'
  }

  if (isArchivalAreaFolderNode(node)) {
    return open ? 'i-lucide-folder-open' : 'i-lucide-folder'
  }

  if (node.type === 'document_reference') {
    return 'i-lucide-link-2'
  }

  if (node.type === 'file' || node.type === 'child_file') {
    return 'i-lucide-briefcase'
  }

  return 'i-lucide-file-text'
}

export function archivalAreaNodeTypeLabel(node: ArchivalFileTreeNode): string {
  switch (node.type) {
    case 'area':
      return 'Área'
    case 'series':
      return 'Serie'
    case 'subseries':
      return 'Subserie'
    case 'document_type':
      return 'Tipo documental'
    case 'filing':
      return node.id.startsWith('credit-') ? 'Crédito' : 'Radicado'
    case 'applicant':
      return 'Solicitante'
    case 'folder':
      return 'Carpeta'
    case 'document':
      return 'Documento'
    case 'document_reference':
      return 'Referencia'
    case 'file':
    case 'child_file':
      return 'Expediente'
    default:
      return 'Elemento'
  }
}

export function findArchivalTreePath(
  root: ArchivalFileTreeNode | null,
  targetId: string,
): ArchivalFileTreeNode[] | null {
  if (!root) {
    return null
  }

  if (root.id === targetId) {
    return [root]
  }

  for (const child of root.children ?? []) {
    const childPath = findArchivalTreePath(child, targetId)
    if (childPath) {
      return [root, ...childPath]
    }
  }

  return null
}

export function findArchivalTreeNode(
  root: ArchivalFileTreeNode | null,
  targetId: string,
): ArchivalFileTreeNode | null {
  const path = findArchivalTreePath(root, targetId)

  return path?.at(-1) ?? null
}

export function findArchivalTreeNodeByArchivalFileId(
  root: ArchivalFileTreeNode | null,
  archivalFileId: number,
): ArchivalFileTreeNode | null {
  if (!root) {
    return null
  }

  if (root.archival_file_id === archivalFileId && isArchivalAreaFolderNode(root)) {
    return root
  }

  for (const child of root.children ?? []) {
    const found = findArchivalTreeNodeByArchivalFileId(child, archivalFileId)
    if (found) {
      return found
    }
  }

  return null
}

export type ArchivalAreaFolderExpansion = 'default' | 'all' | 'collapsed'

export function archivalAreaNodeContainsId(node: ArchivalFileTreeNode, targetId: string): boolean {
  return findArchivalTreePath(node, targetId) !== null
}

export function partitionArchivalAreaChildren(children: ArchivalFileTreeNode[]): {
  folders: ArchivalFileTreeNode[]
  documents: ArchivalFileTreeNode[]
  files: ArchivalFileTreeNode[]
} {
  const folders: ArchivalFileTreeNode[] = []
  const documents: ArchivalFileTreeNode[] = []
  const files: ArchivalFileTreeNode[] = []

  for (const child of children) {
    if (isArchivalAreaFolderNode(child)) {
      folders.push(child)
      continue
    }

    if (isArchivalAreaDocumentNode(child)) {
      documents.push(child)
      continue
    }

    if (child.type === 'file' || child.type === 'child_file') {
      files.push(child)
    }
  }

  return { folders, documents, files }
}

export function countArchivalAreaDescendants(node: ArchivalFileTreeNode): number {
  let total = 0

  for (const child of node.children ?? []) {
    total += 1
    if (isArchivalAreaFolderNode(child)) {
      total += countArchivalAreaDescendants(child)
    }
  }

  return total
}

export function archivalAreaNodeHasDocuments(node: ArchivalFileTreeNode): boolean {
  if (isArchivalAreaDocumentNode(node)) {
    return true
  }

  return (node.children ?? []).some(child => archivalAreaNodeHasDocuments(child))
}

export function archivalAreaNodeHasOverdueTransfer(node: ArchivalFileTreeNode): boolean {
  if (isArchivalAreaDocumentNode(node)) {
    return node.retention?.transfer_status === 'due'
  }

  return (node.children ?? []).some(child => archivalAreaNodeHasOverdueTransfer(child))
}

export function filterArchivalAreaTreeToFoldersWithDocuments(
  node: ArchivalFileTreeNode,
): ArchivalFileTreeNode {
  const nextChildren = (node.children ?? [])
    .flatMap((child) => {
      if (isArchivalAreaDocumentNode(child) || child.type === 'file' || child.type === 'child_file') {
        return [child]
      }

      if (!isArchivalAreaFolderNode(child) || !archivalAreaNodeHasDocuments(child)) {
        return []
      }

      return [filterArchivalAreaTreeToFoldersWithDocuments(child)]
    })

  return {
    ...node,
    children: nextChildren,
  }
}

export function filterArchivalAreaChildren(
  children: ArchivalFileTreeNode[],
  query: string,
): ArchivalFileTreeNode[] {
  const normalized = query.trim().toLowerCase()
  if (!normalized) {
    return children
  }

  return children.filter((child) => {
    const haystack = [
      child.name,
      child.file_number,
      child.status_label,
      child.doc_document_type_name,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    return haystack.includes(normalized)
  })
}

function archivalAreaNodeUploadedIsoDate(node: ArchivalFileTreeNode): string | null {
  const raw = node.uploaded_at?.trim()
  if (!raw) {
    return null
  }

  return raw.slice(0, 10)
}

function archivalAreaNodeMatchesUploadedDateRange(
  node: ArchivalFileTreeNode,
  from: string,
  to: string,
): boolean {
  const uploaded = archivalAreaNodeUploadedIsoDate(node)
  if (!uploaded) {
    return false
  }

  if (from && uploaded < from) {
    return false
  }

  if (to && uploaded > to) {
    return false
  }

  return true
}

function archivalAreaFolderHasDocumentInUploadedDateRange(
  node: ArchivalFileTreeNode,
  from: string,
  to: string,
): boolean {
  if (isArchivalAreaDocumentNode(node)) {
    return archivalAreaNodeMatchesUploadedDateRange(node, from, to)
  }

  return (node.children ?? []).some(child =>
    archivalAreaFolderHasDocumentInUploadedDateRange(child, from, to),
  )
}

export function filterArchivalAreaChildrenByUploadedDate(
  children: ArchivalFileTreeNode[],
  from: string,
  to: string,
): ArchivalFileTreeNode[] {
  const start = from.trim()
  const end = to.trim()

  if (!start && !end) {
    return children
  }

  if (start && end && start > end) {
    return children
  }

  return children.filter((child) => {
    if (isArchivalAreaDocumentNode(child)) {
      return archivalAreaNodeMatchesUploadedDateRange(child, start, end)
    }

    if (child.type === 'filing' || (child.type === 'folder' && child.archival_file_id != null)) {
      return archivalAreaFolderHasDocumentInUploadedDateRange(child, start, end)
    }

    return true
  })
}

export type ArchivalAreaClassificationSearchHit = {
  id: string
  name: string
  type: 'series' | 'subseries' | 'document_type'
  typeLabel: string
  pathLabel: string
}

export function filterArchivalAreaTrdNavTree(
  node: ArchivalFileTreeNode,
  query: string,
): ArchivalFileTreeNode | null {
  const normalized = query.trim().toLowerCase()
  if (!normalized) {
    return node
  }

  const folderChildren = (node.children ?? []).filter(child => isArchivalAreaFolderNode(child))
  const selfMatch = node.name.toLowerCase().includes(normalized)

  if (selfMatch) {
    return {
      ...node,
      children: folderChildren,
    }
  }

  const kept = folderChildren
    .map(child => filterArchivalAreaTrdNavTree(child, query))
    .filter((child): child is ArchivalFileTreeNode => child != null)

  if (kept.length === 0) {
    return null
  }

  return {
    ...node,
    children: kept,
  }
}

export function searchArchivalAreaClassification(
  root: ArchivalFileTreeNode | null,
  query: string,
  limit = 25,
): ArchivalAreaClassificationSearchHit[] {
  const normalized = query.trim().toLowerCase()
  if (!root || !normalized) {
    return []
  }

  const hits: ArchivalAreaClassificationSearchHit[] = []

  function walk(node: ArchivalFileTreeNode, ancestors: string[]): void {
    if (node.type === 'series' || node.type === 'subseries' || node.type === 'document_type') {
      const haystack = node.name.toLowerCase()
      if (haystack.includes(normalized)) {
        hits.push({
          id: node.id,
          name: node.name,
          type: node.type,
          typeLabel: archivalAreaNodeTypeLabel(node),
          pathLabel: ancestors.join(' · '),
        })
      }
    }

    const nextAncestors = isArchivalAreaFolderNode(node) && node.type !== 'area'
      ? [...ancestors, node.name]
      : ancestors

    for (const child of node.children ?? []) {
      if (hits.length >= limit) {
        return
      }
      walk(child, nextAncestors)
    }
  }

  walk(root, [])

  return hits.slice(0, limit)
}

export function formatArchivalRetentionPreview(
  retention?: ArchivalDocumentRetentionSummary | null,
): string | null {
  if (!retention) {
    return null
  }

  const parts = [
    `${retention.years_management} año(s) en archivo de gestión`,
    `${retention.years_central} año(s) en archivo central`,
  ]

  if (retention.years_historical != null && retention.years_historical > 0) {
    parts.push(`${retention.years_historical} año(s) en archivo histórico`)
  }

  if (retention.final_disposition_label) {
    parts.push(`disposición: ${retention.final_disposition_label}`)
  }

  if (retention.inherited_from_label) {
    parts.push(`según ${retention.inherited_from_label.toLowerCase()} de la TRD`)
  }

  return parts.join(' · ')
}

export function isArchivalAreaManualFolder(node: ArchivalFileTreeNode | null | undefined): boolean {
  return node?.type === 'folder' && node.source === 'manual' && node.archival_file_id != null
}

export function archivalAreaNodeIsPublishedToLibrary(node: ArchivalFileTreeNode): boolean {
  if (node.is_institutional_published) {
    return true
  }

  return (node.children ?? []).some(child => archivalAreaNodeIsPublishedToLibrary(child))
}

export function archivalAreaNodeIsFeaturedInLibrary(node: ArchivalFileTreeNode): boolean {
  if (node.is_featured && node.is_institutional_published) {
    return true
  }

  return (node.children ?? []).some(child => archivalAreaNodeIsFeaturedInLibrary(child))
}
