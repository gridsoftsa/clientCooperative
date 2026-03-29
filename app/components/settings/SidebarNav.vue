<script setup lang="ts">
import { cn } from '@/lib/utils'

interface Item {
  title: string
  href: string
  /** Si se define, el enlace solo se muestra con este permiso (además de acceder a /settings con `settings_ver`). */
  permission?: string
}

const route = useRoute()
const { hasPermission } = usePermissions()

const allNavItems: Item[] = [
  {
    title: 'Profile',
    href: '/settings/profile',
  },
  {
    title: 'Account',
    href: '/settings/account',
  },
  {
    title: 'Appearance',
    href: '/settings/appearance',
  },
  {
    title: 'Notifications',
    href: '/settings/notifications',
  },
  {
    title: 'Display',
    href: '/settings/display',
  },
  {
    title: 'Configurar plantillas',
    href: '/settings/template-config',
    permission: 'plantillas_ver',
  },
]

const sidebarNavItems = computed(() =>
  allNavItems.filter(item => !item.permission || hasPermission(item.permission)),
)
</script>

<template>
  <nav class="flex lg:flex-col space-x-2 lg:space-x-0 lg:space-y-1">
    <Button
      v-for="item in sidebarNavItems"
      :key="item.title"
      variant="ghost"
      :class="cn(
        'w-full text-left justify-start items-start',
        route.path === item.href && 'bg-muted hover:bg-muted',
      )"
      as-child
    >
      <NuxtLink
        :to="item.href"
      >
        {{ item.title }}
      </NuxtLink>
    </Button>
  </nav>
</template>
