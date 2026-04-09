<script setup lang="ts">
import type { NavGroup, NavLink, NavSectionTitle } from '~/types/nav'
import { navMenu, navMenuBottom } from '~/constants/menus'

function resolveNavItemComponent(item: NavLink | NavGroup | NavSectionTitle): any {
  if ('children' in item)
    return resolveComponent('LayoutSidebarNavGroup')

  return resolveComponent('LayoutSidebarNavLink')
}

const teams: {
  name: string
  logo: string
  plan: string
}[] = [
  {
    name: 'Coopservivelez',
    logo: '/Logo-coop-1.ico',
    plan: 'cooperative',
  },
]

const { sidebar } = useAppSettings()
const { user: authUser } = useAuth()
const { hasRole, hasAnyRole, hasPermission, hasAnyPermission, isAdmin } = usePermissions()

// Use authenticated user or fallback
const user = computed(() => ({
  name: authUser.value?.name || 'Usuario',
  email: authUser.value?.email || '',
  avatar: ''
}))

// Filtrar elementos del menú basados en permisos
function canAccessItem(item: NavLink | NavGroup): boolean {
  // Durante SSR o si no hay usuario autenticado, solo mostrar elementos públicos
  if (import.meta.server || !authUser.value) {
    return !item.permission && !item.role && !item.adminOnly
  }

  // adminOnly: solo administradores pueden ver
  if (item.adminOnly) {
    return isAdmin.value
  }

  // Verificar permisos/roles (todos los usuarios, incluido admin, deben tener el permiso)
  // Si no tiene permisos definidos, permitir acceso
  if (!item.permission && !item.anyPermission && !item.role && !item.anyRole) {
    return true
  }

  // Verificar permisos individuales
  if (item.permission) {
    const hasAccess = hasPermission(item.permission)
    if (!hasAccess) {
      return false
    }
  }

  // Verificar anyPermission
  if (item.anyPermission && item.anyPermission.length > 0) {
    if (!hasAnyPermission(item.anyPermission)) {
      return false
    }
  }

  // Verificar rol individual
  if (item.role) {
    if (!hasRole(item.role)) {
      return false
    }
  }

  // Verificar anyRole
  if (item.anyRole && item.anyRole.length > 0) {
    if (!hasAnyRole(item.anyRole)) {
      return false
    }
  }

  return true
}

// Filtrar menú basado en permisos
const filteredNavMenu = computed(() => {
  // Durante SSR o sin usuario, solo mostrar items públicos
  if (import.meta.server || !authUser.value) {
    return navMenu.map(section => ({
      ...section,
      items: section.items.filter(item => !('permission' in item && item.permission) && !('role' in item && item.role) && !('adminOnly' in item && item.adminOnly))
    })).filter(section => section.items.length > 0)
  }

  return navMenu.map((section) => {
    const filteredItems = section.items.flatMap((item) => {
      if ('heading' in item && !('link' in item) && !('children' in item)) {
        return [item]
      }
      const navItem = item as NavLink | NavGroup

      if ('children' in navItem) {
        const filteredChildren = navItem.children.filter((child: NavLink) => canAccessItem(child))
        if (filteredChildren.length === 0 || !canAccessItem(navItem)) {
          return []
        }
        return [{ ...navItem, children: filteredChildren }]
      }

      return canAccessItem(navItem as NavLink) ? [navItem as NavLink] : []
    })

    return { ...section, items: filteredItems }
  }).filter(section => section.items.length > 0)
})
</script>

<template>
  <Sidebar :collapsible="sidebar?.collapsible" :side="sidebar?.side" :variant="sidebar?.variant">
    <SidebarHeader>
      <LayoutSidebarNavHeader :teams="teams" />
      <Search />
    </SidebarHeader>
    <SidebarContent>
      <SidebarGroup v-for="(nav, indexGroup) in filteredNavMenu" :key="indexGroup">
        <SidebarGroupLabel v-if="nav.heading">
          {{ nav.heading }}
        </SidebarGroupLabel>
        <component :is="resolveNavItemComponent(item)" v-for="(item, index) in nav.items" :key="index" :item="item" />
      </SidebarGroup>
      <SidebarGroup class="mt-auto">
        <component :is="resolveNavItemComponent(item)" v-for="(item, index) in navMenuBottom" :key="index" :item="item" size="sm" />
      </SidebarGroup>
    </SidebarContent>
    <SidebarFooter>
      <LayoutSidebarNavFooter />
    </SidebarFooter>
    <SidebarRail />
  </Sidebar>
</template>

<style scoped>

</style>
