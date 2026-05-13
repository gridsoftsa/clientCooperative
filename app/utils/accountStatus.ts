import type { UserAccountStatus } from '~/types/user'

const LABELS: Record<UserAccountStatus, string> = {
  pending: 'Pendiente',
  active: 'Activo',
  inactive: 'Inactivo',
  blocked: 'Bloqueado',
  suspended: 'Suspendido',
}

export function isUserAccountStatus(value: string): value is UserAccountStatus {
  return value === 'pending' || value === 'active' || value === 'inactive' || value === 'blocked' || value === 'suspended'
}

export function labelForAccountStatus(status: UserAccountStatus | string | undefined, isActiveFallback: boolean): string {
  if (status && isUserAccountStatus(status)) {
    return LABELS[status]
  }
  return isActiveFallback ? 'Activo' : 'Inactivo'
}

export function accountStatusBadgeVariant(
  status: UserAccountStatus | string | undefined,
  isActiveFallback: boolean,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  const s = status && isUserAccountStatus(status) ? status : (isActiveFallback ? 'active' : 'inactive')
  if (s === 'active' || s === 'pending') {
    return 'default'
  }
  if (s === 'blocked' || s === 'suspended') {
    return 'destructive'
  }
  return 'secondary'
}

export const ACCOUNT_STATUS_FORM_OPTIONS: { value: UserAccountStatus; label: string }[] = [
  { value: 'active', label: LABELS.active },
  { value: 'pending', label: LABELS.pending },
  { value: 'inactive', label: LABELS.inactive },
  { value: 'suspended', label: LABELS.suspended },
  { value: 'blocked', label: LABELS.blocked },
]
