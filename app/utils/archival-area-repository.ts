import type { ArchivalFileTreeNode } from '~/types/archival-file'

const FOLDER_TYPES = new Set<ArchivalFileTreeNode['type']>([
  'area',
  'series',
  'subseries',
  'document_type',
  'folder',
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

export function archivalAreaNodeIcon(node: ArchivalFileTreeNode, open = false): string {
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
