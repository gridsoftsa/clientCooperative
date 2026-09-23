<script setup lang="ts">
import type { NavGroup, NavLink, NavMenuItems, NavSectionTitle } from '~/types/nav'
import { navMenu, navMenuBottom } from '~/constants/menus'

function resolveNavItemComponent(item: NavLink | NavGroup | NavSectionTitle): any {
  if ('children' in item)
    return resolveComponent('LayoutSidebarNavGroup')

  return resolveComponent('LayoutSidebarNavLink')
}

const { displayName, resolvedLogoUrl } = useCompanyBranding()

const teams = computed(() => [
  {
    name: displayName.value,
    logo: resolvedLogoUrl.value ?? '/Logo-coop-1.ico',
    plan: 'Empresarial',
  },
])

const { sidebar } = useAppSettings()
const { searchQuery } = provideSidebarNavAccordion()
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
    const filteredItems: NavMenuItems = []
    for (const item of section.items) {
      if ('heading' in item && !('link' in item) && !('children' in item)) {
        filteredItems.push(item)
        continue
      }
      const navItem = item as NavLink | NavGroup

      if ('children' in navItem) {
        const filteredChildren = navItem.children.filter((child: NavLink) => canAccessItem(child))
        if (filteredChildren.length === 0 || !canAccessItem(navItem)) {
          continue
        }
        filteredItems.push({ ...navItem, children: filteredChildren })
        continue
      }

      if (canAccessItem(navItem as NavLink)) {
        filteredItems.push(navItem as NavLink)
      }
    }

    return { ...section, items: filteredItems }
  }).filter(section => section.items.length > 0)
})

function normalizeSearchText(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}

const visibleNavMenu = computed(() => {
  const query = normalizeSearchText(searchQuery.value.trim())

  if (!query) {
    return filteredNavMenu.value
  }

  return filteredNavMenu.value.map((section) => {
    const items: NavMenuItems = []

    for (const item of section.items) {
      if ('children' in item) {
        const groupMatches = normalizeSearchText(item.title).includes(query)
        const matchingChildren = item.children.filter(child => normalizeSearchText(child.title).includes(query))
        const children = matchingChildren.length > 0
          ? matchingChildren
          : (groupMatches ? item.children : [])

        if (children.length > 0) {
          items.push({ ...item, children })
        }

        continue
      }

      if ('link' in item && normalizeSearchText(item.title).includes(query)) {
        items.push(item)
      }
    }

    return { ...section, items }
  }).filter(section => section.items.length > 0)
})

const isSearching = computed(() => searchQuery.value.trim().length > 0)
</script>

<template>
  <Sidebar :collapsible="sidebar?.collapsible" :side="sidebar?.side" :variant="sidebar?.variant">
    <SidebarHeader>
      <LayoutSidebarNavHeader :teams="teams" />
      <LayoutSidebarScreenSearch />
    </SidebarHeader>
    <SidebarContent>
      <p
        v-if="isSearching && visibleNavMenu.length === 0"
        class="text-muted-foreground px-4 py-6 text-center text-sm"
      >
        No hay pantallas que coincidan.
      </p>
      <SidebarGroup v-for="nav in visibleNavMenu" :key="nav.heading">
        <SidebarGroupLabel v-if="nav.heading">
          {{ nav.heading }}
        </SidebarGroupLabel>
        <component :is="resolveNavItemComponent(item)" v-for="item in nav.items" :key="'title' in item ? item.title : nav.heading" :item="item" />
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
