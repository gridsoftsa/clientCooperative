import type { ArchivalFileType, ArchivalFileTypeProducerArea, ArchivalFileTypeProducerAreaDraft } from '~/types/archival-file'

export function mapProducerAreaDrafts(
  areas: ArchivalFileTypeProducerArea[] | undefined,
): ArchivalFileTypeProducerAreaDraft[] {
  return (areas ?? []).map((area, index) => ({
    id: area.id,
    org_unit_id: area.org_unit_id,
    trd_table_id: area.trd_table_id ?? null,
    doc_series_id: area.doc_series_id ?? null,
    doc_subseries_id: area.doc_subseries_id ?? null,
    doc_document_type_id: area.doc_document_type_id ?? null,
    sort_order: area.sort_order ?? index,
    org_unit: area.org_unit ?? null,
    doc_series: area.doc_series ?? null,
    doc_subseries: area.doc_subseries ?? null,
    doc_document_type: area.doc_document_type ?? null,
  }))
}

export function producerAreasSavePayload(rows: ArchivalFileTypeProducerAreaDraft[]): Array<Record<string, unknown>> {
  return rows
    .filter(row => row.org_unit_id != null && row.doc_series_id != null && row.doc_subseries_id != null)
    .map((row, index) => ({
      org_unit_id: row.org_unit_id,
      trd_table_id: row.trd_table_id,
      doc_series_id: row.doc_series_id,
      doc_subseries_id: row.doc_subseries_id,
      doc_document_type_id: row.doc_document_type_id,
      sort_order: index,
    }))
}

export function archivalFileTypeBasePayload(type: ArchivalFileType): Record<string, unknown> {
  return {
    type_key: type.type_key,
    name: type.name,
    description: type.description ?? null,
    model: type.model,
    archival_metadata_schema_id: type.archival_metadata_schema_id ?? null,
    allows_master_documents: type.allows_master_documents,
    is_active: type.is_active,
    sort_order: type.sort_order,
  }
}
