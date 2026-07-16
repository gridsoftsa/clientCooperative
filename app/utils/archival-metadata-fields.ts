import type { ArchivalMetadataFieldRow } from '~/composables/useArchivalMetadataApi'

export interface ArchivalMetadataActiveField {
  code: string
  name: string
  data_type: string
  is_required: boolean
  is_reusable?: boolean
  is_variable?: boolean
  is_autocompletable?: boolean
  options?: Array<{ value: string, label: string }>
  sort_order?: number
}

export function mapArchivalFileMetadataFields(
  fields: ArchivalMetadataActiveField[] | undefined | null,
): ArchivalMetadataFieldRow[] {
  if (!fields?.length) {
    return []
  }

  return fields
    .map((field, index) => ({
      code: field.code,
      name: field.name,
      data_type: field.data_type,
      is_required: field.is_required,
      sort_order: field.sort_order ?? index,
      is_active: true,
      is_reusable: field.is_reusable ?? false,
      is_variable: field.is_variable ?? false,
      is_ocr_extractable: false,
      is_autocompletable: field.is_autocompletable ?? false,
      is_searchable: false,
      is_reportable: false,
      options: field.options ?? null,
    }))
    .sort((a, b) => a.sort_order - b.sort_order)
}
