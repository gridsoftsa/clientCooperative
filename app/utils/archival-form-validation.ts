import type { ArchivalMetadataFieldRow } from '~/composables/useArchivalMetadataApi'

export const ARCHIVAL_INPUT_WARNING_CLASS =
  'border-amber-500 focus-visible:border-amber-500 focus-visible:ring-amber-500/40'

export const ARCHIVAL_SELECT_TRIGGER_WARNING_CLASS =
  'border-amber-500 ring-2 ring-amber-500/30'

export function archivalInputWarningClass(missing: boolean): string {
  return missing ? ARCHIVAL_INPUT_WARNING_CLASS : ''
}

export function archivalSelectTriggerWarningClass(missing: boolean): string {
  return missing ? ARCHIVAL_SELECT_TRIGGER_WARNING_CLASS : ''
}

export function archivalMultiselectWarningClass(missing: boolean, base = 'archival-single-multiselect'): string {
  return missing ? `${base} multiselect-warning` : base
}

export function focusArchivalFieldById(id: string): void {
  const root = document.getElementById(id)
  if (!root) {
    return
  }

  if (
    root instanceof HTMLInputElement
    || root instanceof HTMLTextAreaElement
    || root instanceof HTMLSelectElement
  ) {
    root.focus()
    root.scrollIntoView({ behavior: 'smooth', block: 'center' })
    return
  }

  const focusable = root.querySelector(
    'input,button,[tabindex]:not([tabindex="-1"])',
  ) as HTMLElement | null
  focusable?.focus()
  root.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

export function findFirstMissingRequiredMetadataField(
  fields: ArchivalMetadataFieldRow[],
  values: Record<string, unknown>,
): ArchivalMetadataFieldRow | null {
  for (const field of fields) {
    if (!field.is_required) {
      continue
    }

    const value = values[field.code]
    if (value === null || value === undefined || value === '') {
      return field
    }
  }

  return null
}

export function archivalMetadataFieldDomId(field: ArchivalMetadataFieldRow, index = 0): string {
  return `archival_file_meta_${field.code}_${index}`
}
