import type { ArchivalFileAccessPermission } from '~/types/archival-file'
import { ARCHIVAL_FILE_ACCESS_PERMISSION_LABELS } from '~/types/archival-file'

/** Permisos expuestos en la UI de grants documentales por tipo. */
export const ARCHIVAL_FILE_ACCESS_GRANT_PERMISSION_OPTIONS: Array<{
  value: ArchivalFileAccessPermission
  label: string
}> = (
  ['view', 'download', 'edit', 'attach', 'close', 'transfer'] as const
).map(value => ({
  value,
  label: ARCHIVAL_FILE_ACCESS_PERMISSION_LABELS[value],
}))

export const ARCHIVAL_FILE_ACCESS_GRANT_STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  inactive: 'Inactivo',
}
