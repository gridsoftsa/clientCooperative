<script setup lang="ts">
interface Props {
  /**
   * Permiso requerido para mostrar el contenido
   */
  permission?: string
  /**
   * Permisos requeridos (cualquiera de ellos)
   */
  anyPermission?: string[]
  /**
   * Permisos requeridos (todos ellos)
   */
  allPermissions?: string[]
  /**
   * Rol requerido para mostrar el contenido
   */
  role?: string
  /**
   * Roles requeridos (cualquiera de ellos)
   */
  anyRole?: string[]
  /**
   * Roles requeridos (todos ellos)
   */
  allRoles?: string[]
  /**
   * Si es true, solo los administradores pueden ver el contenido
   */
  adminOnly?: boolean
  /**
   * Contenido a mostrar si no se cumple la condición
   */
  fallback?: boolean
  /**
   * Si true, no aplica el bypass de `super_admin` al comprobar permisos
   * (el usuario solo pasa si el permiso figura en su lista, igual que asesor u otros roles).
   */
  strict?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  fallback: false,
  strict: false,
})

const {
  hasRole,
  hasAnyRole,
  hasAllRoles,
  hasPermission,
  hasPermissionStrict,
  hasAnyPermission,
  hasAnyPermissionStrict,
  hasAllPermissions,
  hasAllPermissionsStrict,
  isAdmin,
} = usePermissions()

const canAccess = computed(() => {
  // adminOnly: solo administradores pueden ver (admin o super_admin)
  if (props.adminOnly) {
    return isAdmin.value
  }

  const canPerm = (name: string) => (props.strict ? hasPermissionStrict(name) : hasPermission(name))
  const canAny = (list: string[]) => (props.strict ? hasAnyPermissionStrict(list) : hasAnyPermission(list))
  const canAll = (list: string[]) => (props.strict ? hasAllPermissionsStrict(list) : hasAllPermissions(list))

  if (props.permission && !canPerm(props.permission)) {
    return false
  }

  if (props.anyPermission && props.anyPermission.length > 0 && !canAny(props.anyPermission)) {
    return false
  }

  if (props.allPermissions && props.allPermissions.length > 0 && !canAll(props.allPermissions)) {
    return false
  }

  // Verificar rol individual
  if (props.role && !hasRole(props.role)) {
    return false
  }

  // Verificar anyRole
  if (props.anyRole && props.anyRole.length > 0 && !hasAnyRole(props.anyRole)) {
    return false
  }

  // Verificar allRoles
  if (props.allRoles && props.allRoles.length > 0 && !hasAllRoles(props.allRoles)) {
    return false
  }

  // Si no hay ninguna condición, permitir acceso
  if (!props.permission && !props.anyPermission && !props.allPermissions && 
      !props.role && !props.anyRole && !props.allRoles && !props.adminOnly) {
    return true
  }

  return true
})
</script>

<template>
  <template v-if="canAccess">
    <slot />
  </template>
  <template v-else-if="fallback">
    <slot name="fallback" />
  </template>
</template>
