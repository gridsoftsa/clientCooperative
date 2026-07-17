import type { ArchivalFileStatus } from '~/types/archival-file'

export const ARCHIVAL_FILE_EDITABLE_STATUSES: ArchivalFileStatus[] = [
  'draft',
  'active',
  'in_review',
  'returned',
]

export type ArchivalFileStatusTransitionTarget = Extract<
  ArchivalFileStatus,
  'active' | 'in_review' | 'returned' | 'inactive'
>

export interface ArchivalFileStatusActionOption {
  target: ArchivalFileStatusTransitionTarget
  label: string
  description: string
  variant: 'default' | 'outline' | 'destructive'
  requiresReason: boolean
  permission: 'expedientes_editar' | 'expedientes_cerrar'
}

export function isArchivalFileEditable(status: ArchivalFileStatus | undefined): boolean {
  if (!status) {
    return false
  }

  return ARCHIVAL_FILE_EDITABLE_STATUSES.includes(status)
}

export function isArchivalFileOperational(
  status: ArchivalFileStatus | undefined,
  isFrozen: boolean,
): boolean {
  return isArchivalFileEditable(status) && !isFrozen
}

export function archivalFileStatusBadgeVariant(
  status: ArchivalFileStatus,
): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (status) {
    case 'returned':
      return 'destructive'
    case 'in_review':
      return 'secondary'
    case 'inactive':
      return 'outline'
    case 'closed':
    case 'final_disposition':
      return 'destructive'
    default:
      return 'outline'
  }
}

export function archivalFileStatusActions(
  status: ArchivalFileStatus,
): ArchivalFileStatusActionOption[] {
  switch (status) {
    case 'active':
      return [
        {
          target: 'in_review',
          label: 'Enviar a revisión',
          description: 'El expediente quedará en revisión hasta que un responsable lo apruebe o devuelva.',
          variant: 'outline',
          requiresReason: false,
          permission: 'expedientes_editar',
        },
        {
          target: 'inactive',
          label: 'Marcar inactivo',
          description: 'Suspende temporalmente la gestión del expediente sin cerrarlo.',
          variant: 'outline',
          requiresReason: false,
          permission: 'expedientes_cerrar',
        },
      ]
    case 'in_review':
      return [
        {
          target: 'active',
          label: 'Aprobar revisión',
          description: 'Confirma la revisión y deja el expediente activo.',
          variant: 'default',
          requiresReason: false,
          permission: 'expedientes_cerrar',
        },
        {
          target: 'returned',
          label: 'Devolver para ajuste',
          description: 'Indique el motivo para que el responsable corrija el expediente.',
          variant: 'destructive',
          requiresReason: true,
          permission: 'expedientes_cerrar',
        },
      ]
    case 'returned':
      return [
        {
          target: 'in_review',
          label: 'Reenviar a revisión',
          description: 'Envía nuevamente el expediente a revisión tras los ajustes.',
          variant: 'outline',
          requiresReason: false,
          permission: 'expedientes_editar',
        },
        {
          target: 'active',
          label: 'Marcar activo',
          description: 'Da por completados los ajustes y deja el expediente activo.',
          variant: 'default',
          requiresReason: false,
          permission: 'expedientes_editar',
        },
      ]
    case 'inactive':
      return [
        {
          target: 'active',
          label: 'Reactivar expediente',
          description: 'Vuelve a habilitar la gestión del expediente.',
          variant: 'default',
          requiresReason: false,
          permission: 'expedientes_cerrar',
        },
      ]
    default:
      return []
  }
}

export function archivalFileStatusBanner(
  status: ArchivalFileStatus,
): { title: string, description: string } | null {
  switch (status) {
    case 'draft':
      return {
        title: 'Expediente en construcción',
        description: 'Adjunte el primer documento para activar el expediente.',
      }
    case 'in_review':
      return {
        title: 'En revisión',
        description: 'Un responsable debe aprobar o devolver el expediente antes del cierre.',
      }
    case 'returned':
      return {
        title: 'Devuelto para ajuste',
        description: 'Corrija lo indicado y reenvíe a revisión o márquelo activo.',
      }
    case 'inactive':
      return {
        title: 'Expediente inactivo',
        description: 'La gestión está suspendida. Reactívelo para continuar.',
      }
    default:
      return null
  }
}
