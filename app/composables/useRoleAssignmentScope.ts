import type { Role } from '~/types/role'
import {
  canManageRoleByDomains,
  manageableDomainsFromAuthUser,
} from '~/constants/application-domains'
import { getRoleDisplayLabel } from '~/constants/role-labels'

export function useRoleAssignmentScope() {
  const { user } = useAuth()

  const manageableDomains = computed(() =>
    manageableDomainsFromAuthUser(
      user.value?.roles,
      user.value?.admin_application_domains,
    ),
  )

  function canAssignRole(roleName: string): boolean {
    return canManageRoleByDomains(roleName, manageableDomains.value)
  }

  function filterAssignableRoles(roles: Role[]): Role[] {
    return roles.filter(role => canAssignRole(role.name))
  }

  function roleOptionLabel(roleName: string): string {
    const label = getRoleDisplayLabel(roleName)

    if (roleName === 'admin') {
      return `${label} (Sistema)`
    }

    return label
  }

  function mapRoleSelectOptions(roles: Role[]) {
    return filterAssignableRoles(roles).map(role => ({
      value: role.name,
      label: roleOptionLabel(role.name),
    }))
  }

  const isScopedAdmin = computed(() =>
    user.value?.roles?.includes('admin') === true
    && !user.value?.roles?.includes('super_admin'),
  )

  return {
    manageableDomains,
    canAssignRole,
    filterAssignableRoles,
    mapRoleSelectOptions,
    roleOptionLabel,
    isScopedAdmin,
  }
}
