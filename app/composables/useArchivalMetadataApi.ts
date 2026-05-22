export interface ArchivalMetadataFieldRow {
  id?: number
  code: string
  name: string
  data_type: string
  is_required: boolean
  sort_order: number
  is_active: boolean
  is_reusable: boolean
  is_variable: boolean
  is_ocr_extractable: boolean
  is_autocompletable: boolean
  is_searchable: boolean
  is_reportable: boolean
  options?: Array<{ value: string, label: string }> | null
  validation_rules?: Record<string, unknown> | null
}

export interface ArchivalMetadataSchemaRow {
  id: number
  schema_key: string
  version_number: number
  name: string
  description?: string | null
  status: string
  application_level: string
  doc_series_id?: number | null
  doc_subseries_id?: number | null
  doc_document_type_id?: number | null
  functional_type_key?: string | null
  file_type_key?: string | null
  activated_at?: string | null
  fields_count?: number | null
  fields?: ArchivalMetadataFieldRow[]
  doc_series?: { id: number, code: string, name: string } | null
  doc_subseries?: { id: number, code: string, name: string } | null
  doc_document_type?: { id: number, code: string, name: string } | null
}

export function useArchivalMetadataApi() {
  const { $api } = useNuxtApp()

  async function fetchSchemas(query?: Record<string, string | number | undefined>) {
    const res = await $api<{ data: ArchivalMetadataSchemaRow[] }>('/archival/metadata-schemas', { query })
    return res.data ?? []
  }

  async function fetchSchema(id: number) {
    const res = await $api<{ data: ArchivalMetadataSchemaRow }>(`/archival/metadata-schemas/${id}`)
    return res.data
  }

  async function resolveSchema(docDocumentTypeId: number) {
    const res = await $api<{ data: ArchivalMetadataSchemaRow | null }>(
      '/archival/metadata-schemas/resolve',
      { query: { doc_document_type_id: docDocumentTypeId } },
    )
    return res.data
  }

  async function fetchCatalogKeys() {
    const res = await $api<{
      data: {
        functional_types: Array<{ value: string, label: string }>
        file_types: Array<{ value: string, label: string }>
      }
    }>('/archival/metadata-schemas/catalog-keys')
    return res.data
  }

  async function createSchema(body: Record<string, unknown>) {
    return await $api<{ data: ArchivalMetadataSchemaRow, message?: string }>(
      '/archival/metadata-schemas',
      { method: 'POST', body },
    )
  }

  async function updateSchema(id: number, body: Record<string, unknown>) {
    return await $api<{ data: ArchivalMetadataSchemaRow, message?: string }>(
      `/archival/metadata-schemas/${id}`,
      { method: 'PUT', body },
    )
  }

  async function activateSchema(id: number) {
    return await $api<{ data: ArchivalMetadataSchemaRow, message?: string }>(
      `/archival/metadata-schemas/${id}/activate`,
      { method: 'POST' },
    )
  }

  async function duplicateSchema(id: number) {
    return await $api<{ data: ArchivalMetadataSchemaRow, message?: string }>(
      `/archival/metadata-schemas/${id}/duplicate`,
      { method: 'POST' },
    )
  }

  async function addField(schemaId: number, body: Record<string, unknown>) {
    return await $api<{ data: ArchivalMetadataFieldRow, message?: string }>(
      `/archival/metadata-schemas/${schemaId}/fields`,
      { method: 'POST', body },
    )
  }

  async function updateField(schemaId: number, fieldId: number, body: Record<string, unknown>) {
    return await $api<{ data: ArchivalMetadataFieldRow, message?: string }>(
      `/archival/metadata-schemas/${schemaId}/fields/${fieldId}`,
      { method: 'PUT', body },
    )
  }

  async function deleteField(schemaId: number, fieldId: number) {
    return await $api<{ message?: string }>(
      `/archival/metadata-schemas/${schemaId}/fields/${fieldId}`,
      { method: 'DELETE' },
    )
  }

  return {
    fetchSchemas,
    fetchSchema,
    resolveSchema,
    fetchCatalogKeys,
    createSchema,
    updateSchema,
    activateSchema,
    duplicateSchema,
    addField,
    updateField,
    deleteField,
  }
}
