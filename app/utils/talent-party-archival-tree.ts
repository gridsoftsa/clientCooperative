import type { ArchivalFileTreeNode } from '~/types/archival-file'
import type { TalentPartyDetail, TalentPartyDocument, TalentPartyManualFolder } from '~/types/talent-party'

function talentManualFolderNode(
  folder: TalentPartyManualFolder,
  documentTypeId: number,
  documentTypeName: string,
): ArchivalFileTreeNode {
  return {
    id: `manual-${folder.archival_file_id}-type-${documentTypeId}`,
    type: 'folder',
    source: 'manual',
    name: folder.title,
    archival_file_id: folder.archival_file_id,
    file_number: folder.file_number ?? undefined,
    doc_document_type_id: documentTypeId,
    children: folder.documents.map(document => documentNode(document, documentTypeId, documentTypeName)),
  }
}

function documentNode(
  document: TalentPartyDocument,
  documentTypeId: number,
  documentTypeName: string,
): ArchivalFileTreeNode {
  return {
    id: `doc-${document.id}`,
    type: 'document',
    name: document.title,
    children: [],
    archival_file_id: document.archival_file_id,
    archival_file_document_id: document.id,
    doc_document_type_id: documentTypeId,
    doc_document_type_name: documentTypeName,
    uploaded_at: document.uploaded_at ?? undefined,
    folio_start: document.folio_start,
    folio_end: document.folio_end,
    can_view_content: true,
    can_download_content: true,
    download_url: `/api/archival-files/${document.archival_file_id}/documents/${document.id}/download`,
  }
}

export function talentPartyArchivalTree(party: TalentPartyDetail): ArchivalFileTreeNode {
  const seriesById = new Map<number, ArchivalFileTreeNode>()
  const seriesOrder: number[] = []

  for (const folder of party.folders) {
    let series = seriesById.get(folder.doc_series_id)
    if (!series) {
      series = {
        id: `series-${folder.doc_series_id}`,
        type: 'series',
        name: folder.series_name,
        archival_file_id: party.archival_file_id ?? undefined,
        children: [],
      }
      seriesById.set(folder.doc_series_id, series)
      seriesOrder.push(folder.doc_series_id)
    }

    series.children.push({
      id: `subseries-${folder.doc_subseries_id}`,
      type: 'subseries',
      name: folder.name,
      archival_file_id: party.archival_file_id ?? undefined,
      children: folder.document_types.map(documentType => ({
        id: `doctype-${documentType.id}`,
        type: 'document_type',
        name: `${documentType.code} — ${documentType.name}`,
        doc_document_type_id: documentType.id,
        doc_document_type_name: documentType.name,
        archival_file_node_id: documentType.archival_file_node_id ?? undefined,
        archival_file_id: party.archival_file_id ?? undefined,
        children: [
          ...(documentType.manual_folders ?? []).map(manualFolder => talentManualFolderNode(
            manualFolder,
            documentType.id,
            documentType.name,
          )),
          ...documentType.documents.map(document => documentNode(
            document,
            documentType.id,
            documentType.name,
          )),
        ],
      })),
    })
  }

  const identifier = party.identifier?.trim()
  const name = identifier ? `${party.display_name} — ${identifier}` : party.display_name

  return {
    id: `talent-file-${party.id}`,
    type: 'folder',
    source: 'talent_party',
    talent_party_id: party.id,
    name,
    archival_file_id: party.archival_file_id ?? undefined,
    org_unit_id: party.org_unit_id,
    children: seriesOrder.flatMap((seriesId) => {
      const series = seriesById.get(seriesId)
      return series ? [series] : []
    }),
  }
}
